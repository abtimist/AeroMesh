"""Rebuild the bundled replay from NOAA's original binary concentration output.

Build-only dependencies: numpy, pytz, contourpy and a checkout of NOAA hysplitdata.
No dependency on these tools exists in the running application.
"""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import sys

SOURCE_COMMIT = "5f91ceb498ebfcf2bc5409db06cf4e349d3623b0"
READER_COMMIT = "7a76e96a4911e91077b052251e1b5665b5306fc4"
SOURCE_URL = f"https://raw.githubusercontent.com/noaa-oar-arl/hysplitplot/{SOURCE_COMMIT}/tests/data/rsmc.cdump2"

def build(source, reader, output):
    sys.path.insert(0, str(reader.resolve()))
    import contourpy
    import numpy as np
    from hysplitdata.conc.model import ConcentrationDump

    dump = ConcentrationDump().get_reader().read(str(source))
    # Preserve the upstream species; never relabel this as wildfire PM2.5.
    grids = [g for g in dump.grids if g.pollutant == "I131" and g.vert_level == 500]
    if not grids:
        raise ValueError("Expected NOAA sample's I131 500-m layer")
    peak = max(float(g.conc.max()) for g in grids)
    levels = [1e-6, 1e-5, 1e-4, 1e-3, 1e-2, 1e-1, 1.000001]
    frames = []
    for grid in grids:
        concentration = np.asarray(grid.conc, dtype=float) / peak
        generator = contourpy.contour_generator(x=dump.longitudes, y=dump.latitudes, z=concentration, fill_type="OuterOffset")
        features = []
        for lower, upper in zip(levels, levels[1:]):
            polygons, offsets = generator.filled(lower, upper)
            for points, boundaries in zip(polygons, offsets):
                rings = [points[a:b].round(5).tolist() for a, b in zip(boundaries, boundaries[1:])]
                if not rings or len(rings[0]) < 4:
                    continue
                features.append({"type": "Feature", "geometry": {"type": "Polygon", "coordinates": rings},
                    "properties": {"relative_min": lower, "relative_max": min(1, upper),
                        "valid_from": grid.starting_datetime.isoformat(), "valid_to": grid.ending_datetime.isoformat(),
                        "kind": "demonstration", "pollutant_code": "I131", "units": "fraction of scenario peak"}})
        frames.append({"valid_from": grid.starting_datetime.isoformat(), "valid_to": grid.ending_datetime.isoformat(),
            "type": "FeatureCollection", "features": features})
    source_lon, source_lat = dump.release_locs[0]
    metadata = {
        "id": "noaa-rsmc-2019", "title": "HYSPLIT simulation — demonstration mode",
        "mode": "precomputed_historical", "model": "NOAA HYSPLIT", "source_url": SOURCE_URL,
        "source_commit": SOURCE_COMMIT, "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "reader_commit": READER_COMMIT, "meteorology": dump.meteo_model,
        "meteorology_start": dump.meteo_starting_datetime.isoformat(),
        "source_location": {"lat": source_lat, "lon": source_lon},
        "release_at": dump.release_datetimes[0].isoformat(), "release_heights_m": dump.release_heights,
        "pollutant_code": "I131", "layer_top_m": 500, "frame_count": len(frames),
        "time_intervals": [{"from": f["valid_from"], "to": f["valid_to"]} for f in frames],
        "units": "fraction of scenario peak", "normalization_peak_original_units": peak,
        "display_min_fraction": levels[0], "grid_spacing_degrees": list(dump.grid_deltas),
        "processing": "NOAA concentration reader; linear contours of gridded output with contourpy; one fixed peak across all times; coordinates rounded to 5 decimals.",
        "limitations": "Historical model sample from NOAA's public test data. I131 tracer, not smoke or PM2.5. This is not a current event prediction or a new model execution. Emission mass units are not inferred from the binary file.",
        "attribution": "NOAA Air Resources Laboratory, hysplitplot public scientific sample. No NOAA endorsement."
    }
    output.mkdir(parents=True, exist_ok=True)
    (output / "metadata.json").write_text(json.dumps(metadata, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    for i, frame in enumerate(frames):
        raw = json.dumps(frame, separators=(",", ":"), allow_nan=False).encode()
        (output / f"frame-{i:02d}.geojson.gz").write_bytes(gzip.compress(raw, mtime=0))
    print(f"Built {len(frames)} genuine model frames, {sum(len(f['features']) for f in frames)} contour bands")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--reader", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[1] / "data" / "hysplit_demo")
    args = parser.parse_args()
    build(args.source, args.reader, args.output)
