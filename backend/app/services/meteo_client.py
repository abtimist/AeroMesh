"""Retain provider forecasts by location and UTC valid time, in m/s."""
import asyncio
from datetime import datetime, timezone
import httpx
from app.core.config import settings
from app.db.session import SessionLocal
from app.models.weather import WeatherLog

class OpenMeteoClient:
    async def fetch_weather_vectors(self, lat: float, lon: float):
        params = {"latitude": lat, "longitude": lon,
                  "hourly": "wind_speed_10m,wind_direction_10m,boundary_layer_height",
                  "wind_speed_unit": "ms", "timezone": "UTC", "forecast_days": 3}
        if settings.OPEN_METEO_API_KEY:
            params["apikey"] = settings.OPEN_METEO_API_KEY
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(settings.OPEN_METEO_BASE_URL + "/forecast", params=params)
            response.raise_for_status()
            await asyncio.to_thread(self._save_weather_log, lat, lon, response.json())

    def _save_weather_log(self, lat, lon, data):
        hourly = data.get("hourly", {})
        with SessionLocal() as db:
            existing = {r.timestamp.replace(tzinfo=timezone.utc): r for r in db.query(WeatherLog).filter(
                WeatherLog.lat == lat, WeatherLog.lon == lon).all()}
            for i, value in enumerate(hourly.get("time", [])):
                timestamp = datetime.fromisoformat(value).replace(tzinfo=timezone.utc)
                speed = hourly["wind_speed_10m"][i]
                direction = hourly["wind_direction_10m"][i]
                pblh = hourly["boundary_layer_height"][i]
                if speed is None or direction is None or pblh is None:
                    continue
                row = existing.get(timestamp)
                if row is None:
                    row = WeatherLog(lat=lat, lon=lon, timestamp=timestamp)
                    db.add(row)
                row.wind_speed, row.wind_direction, row.pblh = speed, direction, pblh
            db.commit()
