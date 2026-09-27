"""OpenAQ v3 ingestion; missing credentials/outages never create observations."""
import asyncio
from datetime import datetime
import logging
import httpx
from app.core.config import settings
from app.core.cache import observations_cache
from app.db.session import SessionLocal
from app.models.sensor import Sensor, Measurement
from app.models.forecast import MeasurementEvidence

logger = logging.getLogger(__name__)

class OpenAQClient:
    def __init__(self):
        self.base_url = "https://api.openaq.org/v3"
        self.headers = {"X-API-Key": settings.OPENAQ_API_KEY} if settings.OPENAQ_API_KEY else {}
        self.semaphore = asyncio.Semaphore(3)

    async def fetch_locations_in_bbox(self, bbox="-180,-90,180,90", limit=100):
        if not settings.OPENAQ_API_KEY:
            return
        async with httpx.AsyncClient(timeout=15, headers=self.headers) as client:
            try:
                response = await client.get(self.base_url + "/locations", params={"bbox": bbox, "limit": limit})
                response.raise_for_status()
                await asyncio.to_thread(self._save_locations, response.json().get("results", []))
            except httpx.HTTPError:
                logger.warning("OpenAQ location sync unavailable; no fallback data inserted")

    def _save_locations(self, records):
        with SessionLocal() as db:
            known = {s.provider_id: s for s in db.query(Sensor).filter(Sensor.provider == "openaq")}
            for loc in records:
                coords = loc.get("coordinates") or {}
                if coords.get("latitude") is None or coords.get("longitude") is None:
                    continue
                key = str(loc["id"])
                if key not in known:
                    row = Sensor(provider_id=key, name=loc.get("name") or "Unnamed station",
                        lat=coords["latitude"], lon=coords["longitude"], provider="openaq")
                    db.add(row)
                    known[key] = row
            db.commit()
        observations_cache.clear()

    async def sync_latest_measurements(self):
        if not settings.OPENAQ_API_KEY:
            return
        def stations():
            with SessionLocal() as db:
                return [(s.id, s.provider_id) for s in db.query(Sensor).filter(Sensor.provider == "openaq") if s.provider_id.isdigit()]
        rows = await asyncio.to_thread(stations)
        async with httpx.AsyncClient(timeout=15, headers=self.headers) as client:
            async def sync(station_id, location_id):
                async with self.semaphore:
                    try:
                        # Database provider_id is a LOCATION id, not an OpenAQ sensor id.
                        meta, latest = await asyncio.gather(
                            client.get(f"{self.base_url}/locations/{location_id}/sensors"),
                            client.get(f"{self.base_url}/locations/{location_id}/latest"))
                        meta.raise_for_status()
                        latest.raise_for_status()
                        params = {s["id"]: s["parameter"] for s in meta.json().get("results", [])}
                        measurements = []
                        for row in latest.json().get("results", []):
                            parameter = params.get(row.get("sensorsId"), {})
                            if parameter.get("name") != "pm25" or parameter.get("units") not in ("µg/m³", "μg/m³", "ug/m3"):
                                continue
                            measurements.append({"value": row.get("value"),
                                "time": row.get("datetime", {}).get("utc"), "upstream_id": row.get("sensorsId")})
                        await asyncio.to_thread(self._save_measurements, station_id, measurements)
                    except (httpx.HTTPError, KeyError, ValueError):
                        logger.warning("OpenAQ readings unavailable for location %s", location_id)
            await asyncio.gather(*(sync(*row) for row in rows))

    def _save_measurements(self, station_id, records):
        with SessionLocal() as db:
            for item in records:
                if item.get("value") is None or item["value"] < 0 or not item.get("time"):
                    continue
                when = datetime.fromisoformat(item["time"].replace("Z", "+00:00"))
                existing = db.query(Measurement).filter_by(sensor_id=station_id, timestamp=when, parameter="pm25").first()
                if not existing:
                    existing = Measurement(sensor_id=station_id, timestamp=when, parameter="pm25", value=item["value"])
                    db.add(existing)
                    db.flush()
                else:
                    existing.value = item["value"]
                db.merge(MeasurementEvidence(measurement_id=existing.id, source="OpenAQ v3",
                    upstream_sensor_id=str(item["upstream_id"])))
            db.commit()
        observations_cache.clear()
