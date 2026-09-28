"""On-demand, persisted forecasts. External requests never block map observations."""
import asyncio
from datetime import datetime, timedelta, timezone
import math
import httpx
from app.core.config import settings
from app.core.regions import REGIONS
from app.db.session import SessionLocal
from app.models.forecast import ForecastSnapshot

UTC = timezone.utc

def utc(value):
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return parsed.replace(tzinfo=parsed.tzinfo or UTC).astimezone(UTC)

def grid_points(node):
    if node == "all":
        points = []
        for n in ["india", "brazil", "china", "south-africa"]:
            west, south, east, north = REGIONS[n]["bbox"]
            points.extend([(round(north - y * (north - south) / 4, 4), round(west + x * (east - west) / 4, 4)) for y in range(5) for x in range(5)])
        return points
    west, south, east, north = REGIONS[node]["bbox"]
    # A coarse regional sampling grid, explicitly exposed as such in metadata.
    return [(round(north - y * (north - south) / 4, 4), round(west + x * (east - west) / 4, 4)) for y in range(5) for x in range(5)]

def finite(value):
    return value if isinstance(value, (int, float)) and math.isfinite(value) else None

def normalize_response(doc, points, variables):
    docs = doc if isinstance(doc, list) else [doc]
    if len(docs) != len(points):
        raise ValueError("Provider returned an incomplete location grid")
    result = []
    for (lat, lon), item in zip(points, docs):
        hourly = item.get("hourly", {})
        times = hourly.get("time", [])
        if not times or any(len(hourly.get(v, [])) != len(times) for v in variables):
            raise ValueError("Provider returned an incomplete hourly series")
        result.append({"lat": lat, "lon": lon,
                       "model_lat": item.get("latitude"), "model_lon": item.get("longitude"),
                       "hours": {utc(t).isoformat(): {v: finite(hourly[v][i]) for v in variables} for i, t in enumerate(times)}})
    return result

def load_snapshot(key):
    with SessionLocal() as db:
        row = db.get(ForecastSnapshot, key)
        return row.payload if row else None

def save_snapshot(key, payload):
    with SessionLocal() as db:
        db.merge(ForecastSnapshot(key=key, fetched_at=datetime.now(UTC), payload=payload))
        db.commit()

class ForecastService:
    def __init__(self):
        self.client = None
        self.tasks = {}
        self.memory = {}
        self.semaphore = asyncio.Semaphore(2)

    async def start(self):
        self.client = httpx.AsyncClient(timeout=httpx.Timeout(15, connect=5), limits=httpx.Limits(max_connections=8))

    async def close(self):
        for task in self.tasks.values():
            task.cancel()
        await asyncio.gather(*self.tasks.values(), return_exceptions=True)
        self.tasks.clear()
        if self.client:
            await self.client.aclose()
            self.client = None

    async def get(self, node):
        if node not in self.memory:
            saved = await asyncio.to_thread(load_snapshot, node)
            if saved:
                self.memory[node] = saved
        saved = self.memory.get(node)
        now = datetime.now(UTC)
        expiry = timedelta(minutes=30 if saved and saved.get("status") == "available" else 2)
        old = not saved or now - utc(saved["fetched_at"]) > expiry
        if old and node not in self.tasks:
            self.tasks[node] = asyncio.create_task(self.refresh(node))
        if not saved:
            return {"status": "loading", "node": node, "frames": [], "message": "Fetching forecast data"}
        return {**saved, "refreshing": node in self.tasks, "stale": old}

    async def fetch_series(self, url, params, points, variables):
        try:
            if not self.client:
                raise RuntimeError("Forecast client is not started")
            if settings.OPEN_METEO_API_KEY:
                params = {**params, "apikey": settings.OPEN_METEO_API_KEY}
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            return normalize_response(response.json(), points, variables), None
        except (httpx.HTTPError, ValueError, RuntimeError, KeyError):
            # Do not expose request URLs containing paid API keys.
            return [], "Provider unavailable or returned incomplete forecast data"

    async def refresh(self, node):
        try:
            async with self.semaphore:
                points = grid_points(node)
                params = {"latitude": ",".join(str(p[0]) for p in points),
                          "longitude": ",".join(str(p[1]) for p in points),
                          "timezone": "UTC", "forecast_days": 3}
                wxvars = ["wind_speed_10m", "wind_direction_10m", "boundary_layer_height", "temperature_2m"]
                aqvars = ["pm2_5", "us_aqi", "aerosol_optical_depth"]
                (weather, wxerror), (air, aqerror) = await asyncio.gather(
                    self.fetch_series(settings.OPEN_METEO_BASE_URL + "/forecast", {**params, "hourly": ",".join(wxvars), "wind_speed_unit": "ms", "models": "gfs_seamless"}, points, wxvars),
                    self.fetch_series(settings.OPEN_METEO_AQ_URL, {**params, "hourly": ",".join(aqvars), "domains": "cams_global"}, points, aqvars))
                times = sorted({t for item in weather + air for t in item["hours"]})
                now_hour = datetime.now(UTC).replace(minute=0, second=0, microsecond=0)
                frames = []
                for timestamp in times:
                    if not now_hour <= utc(timestamp) <= now_hour + timedelta(hours=48):
                        continue
                    frames.append({"valid_at": timestamp,
                        "wind": [{"lat": p["lat"], "lon": p["lon"], **p["hours"][timestamp]} for p in weather if timestamp in p["hours"]],
                        "air_quality": [{"lat": p["lat"], "lon": p["lon"], **p["hours"][timestamp]} for p in air if timestamp in p["hours"]]})
                payload = {"status": "available" if weather or air else "unavailable", "node": node,
                    "fetched_at": datetime.now(UTC).isoformat(), "model_run_at": None,
                    "kind": "forecast", "frames": frames,
                    "wind": {"source": "NOAA GFS via Open-Meteo", "units": "m/s", "status": "available" if weather else "unavailable", "error": wxerror},
                    "air_quality": {"source": "CAMS Global via Open-Meteo", "pm25_units": "µg/m³", "aqi_standard": "US AQI", "aod_units": "dimensionless", "native_resolution_km": 45, "native_time_step_hours": 3, "status": "available" if air else "unavailable", "error": aqerror},
                    "grid": {"nx": 20 if node == "all" else 5, "ny": 5, "bbox": REGIONS[node]["bbox"], "description": "100 combined sample points; interpolated wind display" if node == "all" else "25 regional sample points; interpolated wind display, not a street-level forecast"}}
                # Persist ALL fetched hours (including later hours) indexed by location/time.
                await asyncio.to_thread(save_snapshot, node + ":series", {"fetched_at": payload["fetched_at"], "weather": weather, "air_quality": air})
                await asyncio.to_thread(save_snapshot, node, payload)
                self.memory[node] = payload
        finally:
            self.tasks.pop(node, None)

forecast_service = ForecastService()
