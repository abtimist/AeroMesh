"""No-key, forecast-driven 2-D passive-tracer transport (NOT HYSPLIT).

Integrates dx=u dt+sqrt(2Kdt)dW with midpoint advection on a measured-in-time
GFS forecast grid. A fixed seed makes numerical diffusion reproducible. There
are no fallback winds, emissions estimates, vertical physics or PM2.5 claims.
"""
import asyncio
from datetime import datetime, timedelta, timezone
import hashlib
import json
import math

import contourpy
import httpx
import numpy as np

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.forecast import DispersionRun
from app.services.hysplit import update_run

UTC = timezone.utc
SOURCE = "AeroMesh 2-D transport / NOAA GFS via Open-Meteo"
MODEL = "gfs-tracer-v1"
LIMITATION = ("Near-surface passive tracer scenario using 10 m forecast winds and an assumed "
              "constant horizontal diffusivity. No vertical transport, plume rise, deposition, "
              "chemistry or emission estimate. Not HYSPLIT, PM2.5, or an operational warning.")
PARTICLES = 2048
STEP = 300


def timestamp(value):
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return parsed.replace(tzinfo=parsed.tzinfo or UTC).astimezone(UTC)


async def fetch_winds(lat, lon, start, duration):
    # This is an event-centred regular grid, never a fictitious global grid made
    # from disconnected regional samples. Refuse polar/dateline domains.
    if abs(lat) > 65 or abs(lon) > 175:
        raise ValueError("This regional solver supports latitudes within 65 degrees and longitudes within 175 degrees.")
    lats = np.linspace(lat - 4, lat + 4, 5).tolist()
    lons = np.linspace(lon - 4, lon + 4, 5).tolist()
    points = [(y, x) for y in lats for x in lons]
    params = {"latitude": ",".join(str(y) for y, _ in points),
              "longitude": ",".join(str(x) for _, x in points),
              "hourly": "wind_speed_10m,wind_direction_10m", "wind_speed_unit": "ms",
              "timezone": "UTC", "models": "gfs_seamless", "forecast_days": 4,
              "past_days": 1}
    if settings.OPEN_METEO_API_KEY:
        params["apikey"] = settings.OPEN_METEO_API_KEY
    async with httpx.AsyncClient(timeout=45) as client:
        response = await client.get(settings.OPEN_METEO_BASE_URL + "/forecast", params=params)
        response.raise_for_status()
        docs = response.json()
    if not isinstance(docs, list) or len(docs) != 25:
        raise ValueError("Forecast provider returned an incomplete grid")
    times = docs[0].get("hourly", {}).get("time", [])
    if len(times) < 2:
        raise ValueError("Forecast provider returned no time series")
    seconds = np.array([timestamp(t).timestamp() for t in times])
    if np.any(np.diff(seconds) != 3600):
        raise ValueError("Forecast hours are missing or unordered")
    if start.timestamp() < seconds[0] or (start + timedelta(hours=duration)).timestamp() > seconds[-1]:
        raise ValueError("Requested scenario is outside the available live forecast")
    winds, locations = [], []
    for doc in docs:
        hours = doc.get("hourly", {})
        units = doc.get("hourly_units", {})
        if hours.get("time") != times or units.get("wind_speed_10m") != "m/s" or units.get("wind_direction_10m") != "°":
            raise ValueError("Forecast timestamps or wind units do not match")
        speed = np.array(hours.get("wind_speed_10m", []), dtype=float)
        direction = np.array(hours.get("wind_direction_10m", []), dtype=float)
        if len(speed) != len(times) or len(direction) != len(times):
            raise ValueError("Incomplete forecast wind series")
        needed = (seconds >= start.timestamp() - 3600) & (seconds <= (start + timedelta(hours=duration + 1)).timestamp())
        if not np.all(np.isfinite(speed[needed])) or np.any(speed[needed] < 0) or not np.all(np.isfinite(direction[needed])) or np.any((direction[needed] < 0) | (direction[needed] > 360)):
            raise ValueError("Missing or invalid forecast wind; scenario not generated")
        angle = np.radians(direction)
        winds.append(np.stack((-speed * np.sin(angle), -speed * np.cos(angle)), axis=-1))
        locations.append({"latitude": doc.get("latitude"), "longitude": doc.get("longitude")})
    values = np.stack(winds).reshape(5, 5, len(times), 2).transpose(2, 0, 1, 3)
    # Retain only the actual hours consumed, avoiding unrelated missing values.
    take = (seconds >= start.timestamp() - 3600) & (seconds <= (start + timedelta(hours=duration + 1)).timestamp())
    data = {"latitudes": lats, "longitudes": lons, "times": seconds[take].tolist(),
            "uv": values[take].tolist(), "provider_locations": locations,
            "fetched_at": datetime.now(UTC).isoformat(), "model_run_at": None,
            "source": "NOAA GFS seamless via Open-Meteo", "wind_height_m": 10,
            "units": "m/s", "sampling_degrees": 2, "provider_url": settings.OPEN_METEO_BASE_URL + "/forecast"}
    data["sha256"] = hashlib.sha256(json.dumps(data, sort_keys=True, allow_nan=False).encode()).hexdigest()
    return data


def sample_wind(met, positions, when):
    """Bilinear spatial + linear temporal interpolation of U/V, not angles."""
    lats, lons, times, uv = met
    y, x = positions[:, 1], positions[:, 0]
    if np.any((x < lons[0]) | (x > lons[-1]) | (y < lats[0]) | (y > lats[-1])):
        raise ValueError("Tracer left the fetched meteorological domain; shorten the run")
    if not times[0] <= when <= times[-1]:
        raise ValueError("Tracer left the forecast time coverage")
    ix = np.clip(np.searchsorted(lons, x, side="right") - 1, 0, len(lons) - 2)
    iy = np.clip(np.searchsorted(lats, y, side="right") - 1, 0, len(lats) - 2)
    it = min(max(int(np.searchsorted(times, when, side="right")) - 1, 0), len(times) - 2)
    fx = ((x - lons[ix]) / (lons[ix + 1] - lons[ix]))[:, None]
    fy = ((y - lats[iy]) / (lats[iy + 1] - lats[iy]))[:, None]
    ft = (when - times[it]) / (times[it + 1] - times[it])
    grid = uv[it] * (1 - ft) + uv[it + 1] * ft
    return (grid[iy, ix] * (1 - fx) + grid[iy, ix + 1] * fx) * (1 - fy) + (grid[iy + 1, ix] * (1 - fx) + grid[iy + 1, ix + 1] * fx) * fy


def move(positions, metres):
    result = positions.copy()
    result[:, 1] += np.degrees(metres[:, 1] / 6371000)
    result[:, 0] += np.degrees(metres[:, 0] / (6371000 * np.cos(np.radians(positions[:, 1]))))
    return result


def simulate(lat, lon, request, meteorology):
    start = timestamp(request["start_at"])
    duration = request["duration_hours"]
    release = request["release_duration_minutes"] * 60
    diffusion = request["diffusivity_m2_s"]
    rng = np.random.default_rng(request["seed"])
    positions = np.tile([lon, lat], (PARTICLES, 1)).astype(float)
    met = tuple(np.array(meteorology[key]) for key in ("latitudes", "longitudes", "times", "uv"))
    frames = []
    # Unit mass is introduced uniformly through the declared release duration.
    for elapsed in range(0, duration * 3600, STEP):
        active = min(PARTICLES, int(PARTICLES * (elapsed + STEP) / release))
        old_active = min(PARTICLES, int(PARTICLES * elapsed / release))
        # Mid-step introduction gives each new parcel its correct average age.
        dt = np.full((active, 1), STEP, dtype=float)
        dt[old_active:] = STEP / 2
        p = positions[:active]
        wind = sample_wind(met, p, start.timestamp() + elapsed)
        midpoint = move(p, wind * dt / 2)
        wind = sample_wind(met, midpoint, start.timestamp() + elapsed + STEP / 2)
        noise = rng.normal(size=(active, 2)) * np.sqrt(2 * diffusion * dt)
        positions[:active] = move(p, wind * dt + noise)
        # Validate even the last step; do not display extrapolated endpoints.
        sample_wind(met, positions[:active], start.timestamp() + elapsed + STEP)
        if (elapsed + STEP) % 3600 == 0:
            frames.append((elapsed + STEP, positions[:active].copy()))
    # Fixed 5-km cells for comparable densities across times. Histogram is a
    # numerical particle estimate; contours are derived from it, never ellipses.
    scale_x = 111195 * math.cos(math.radians(lat))
    scale_y = 111195
    local = [np.column_stack(((p[:, 0] - lon) * scale_x, (p[:, 1] - lat) * scale_y)) for _, p in frames]
    all_points = np.concatenate(local)
    lower = np.floor(all_points.min(axis=0) / 5000) * 5000 - 15000
    upper = np.ceil(all_points.max(axis=0) / 5000) * 5000 + 15000
    xs, ys = np.arange(lower[0], upper[0] + 5001, 5000), np.arange(lower[1], upper[1] + 5001, 5000)
    if len(xs) * len(ys) > 150000:
        raise ValueError("Scenario footprint exceeds local computation limit")
    densities = []
    for points in local:
        hist = np.histogram2d(points[:, 1], points[:, 0], bins=(ys, xs))[0] / PARTICLES / 25
        # Separable triangular smoothing, unit-mass preserving on padded grid.
        for axis in (0, 1):
            hist = (np.roll(hist, 1, axis) + 2 * hist + np.roll(hist, -1, axis)) / 4
        densities.append(hist)
    peak = max(float(grid.max()) for grid in densities)
    features, summaries = [], []
    xx = lon + (xs[:-1] + 2500) / scale_x
    yy = lat + (ys[:-1] + 2500) / scale_y
    for (elapsed, particles), grid in zip(frames, densities):
        valid_at = start + timedelta(seconds=elapsed)
        summaries.append({"valid_at": valid_at.isoformat(), "released_fraction": len(particles) / PARTICLES,
                          "grid_mass": float(grid.sum() * 25), "centroid": particles.mean(axis=0).tolist()})
        generator = contourpy.contour_generator(x=xx, y=yy, z=grid, fill_type="OuterOffset")
        for fraction in (.05, .2, .5, .8):
            polygons, offsets = generator.filled(peak * fraction, peak * 1.000001)
            for polygon, rings in zip(polygons, offsets):
                coordinates = [polygon[a:b].tolist() for a, b in zip(rings[:-1], rings[1:])]
                features.append({"type": "Feature", "geometry": {"type": "Polygon", "coordinates": coordinates},
                    "properties": {"source": SOURCE, "model": MODEL, "quantity": "relative_dispersion",
                        "density_units": "unit release / km²", "density_threshold": peak * fraction,
                        "relative_level": fraction, "temporal_kind": "instantaneous endpoint",
                        "valid_from": (valid_at - timedelta(hours=1)).isoformat(), "valid_to": valid_at.isoformat()}})
    return {"type": "FeatureCollection", "features": features, "source": SOURCE,
            "model": MODEL, "limitation": LIMITATION, "meteorology": meteorology,
            "frames": summaries, "particle_count": PARTICLES, "integration_step_seconds": STEP,
            "grid_cell_km": 5, "normalization_peak_per_km2": peak}


class TransportWorker:
    def __init__(self):
        self.lock = asyncio.Lock()

    async def run(self, run_id, lat, lon, inputs):
        async with self.lock:
            try:
                met = await fetch_winds(lat, lon, timestamp(inputs["start_at"]), inputs["duration_hours"])
                result = await asyncio.to_thread(simulate, lat, lon, inputs, met)
                for feature in result["features"]:
                    feature["properties"]["run_id"] = run_id
                await asyncio.to_thread(update_run, run_id, status="COMPLETED", result=result, error=None)
            except ValueError as exc:
                await asyncio.to_thread(update_run, run_id, status="FAILED", error=str(exc)[:500])
            except httpx.HTTPError:
                await asyncio.to_thread(update_run, run_id, status="FAILED", error="Live GFS provider unavailable or rate limited. No substitute winds or plume were generated.")
            except Exception:
                await asyncio.to_thread(update_run, run_id, status="FAILED", error="Transport calculation failed; no output substituted.")

    @staticmethod
    def recover():
        with SessionLocal() as db:
            for row in db.query(DispersionRun).filter(DispersionRun.status == "LOCAL_RUNNING"):
                row.status = "FAILED"
                row.error = "Server restarted during local calculation. Submit a new scenario."
            db.commit()


transport_worker = TransportWorker()
