# Bundled HYSPLIT historical demonstration

These are **derived contours of genuine NOAA-published HYSPLIT output**, not hand-drawn plume shapes. They support the hackathon without requiring a READY API key or a model installation at runtime.

- Original file: [`rsmc.cdump2`](https://github.com/noaa-oar-arl/hysplitplot/blob/5f91ceb498ebfcf2bc5409db06cf4e349d3623b0/tests/data/rsmc.cdump2)
- Source repository revision: `5f91ceb498ebfcf2bc5409db06cf4e349d3623b0`
- Reader: NOAA [`hysplitdata`](https://github.com/noaa-oar-arl/hysplitdata) revision `7a76e96a4911e91077b052251e1b5665b5306fc4`
- Original model release: 2019-07-16 11:00 UTC, approximately 34.05° S / 150.98° E, release heights 10 m and 500 m.
- Selected pollutant: **I131**, layer top 500 m. This is a historical model/test scenario, not evidence of an actual release, not smoke, and not PM2.5.
- 24 original three-hour intervals, ending 2019-07-19 11:00 UTC. No timestamps or coordinates were shifted to match live events.
- Values are divided by one fixed peak across the entire scenario. Six logarithmic concentration bands start at 1e-6 of that peak. Contours are computed with contourpy; original grid spacing is approximately 0.1°. This normalization must not be interpreted as a mass-concentration estimate.

[metadata.json](./metadata.json) records the original file's SHA-256, provenance, meteorology, release metadata, processing method, and every time interval. The compressed GeoJSON files are loaded directly by the API; no network access is necessary to read them. The optional base map uses OpenStreetMap and may be unavailable offline.

To reproduce, download the original file from its pinned URL, check out the pinned NOAA reader, install [build-only dependencies](../../requirements-demo.txt), and run from `backend`:

```sh
python scripts/build_hysplit_demo.py --source runtime/hysplit-rsmc.cdump --reader runtime/hysplitdata
```

The NOAA reader source and original download are build inputs and are not vendored into the application. Attribution: NOAA Air Resources Laboratory. The source repository identifies the work as a scientific product, supplied as-is rather than an official NOAA communication. No endorsement or operational forecast accuracy is claimed.
