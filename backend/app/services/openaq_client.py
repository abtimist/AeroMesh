"""OpenAQ v3: bounded, paced ingestion with location/sensor provenance."""
import asyncio
from datetime import datetime, timedelta, timezone
import logging
import math
import time
import unicodedata

import httpx
from app.core.config import settings
from app.core.cache import observations_cache
from app.db.session import SessionLocal
from app.models.sensor import Sensor, Measurement
from app.models.forecast import MeasurementEvidence, ForecastSnapshot

logger = logging.getLogger(__name__)
UTC = timezone.utc
_lock = asyncio.Lock()
_next_request = 0.0


def pm25_parameter(parameter):
    unit = unicodedata.normalize("NFKC", parameter.get("units") or "").replace("μ", "u").replace("µ", "u")
    return parameter.get("name") == "pm25" and unit == "ug/m3"


def status_snapshot(payload):
    with SessionLocal() as db:
        db.merge(ForecastSnapshot(key="openaq:health", fetched_at=datetime.now(UTC), payload=payload))
        db.commit()


class OpenAQClient:
    def __init__(self):
        self.base_url = "https://api.openaq.org/v3"
        self.headers = {"X-API-Key": settings.OPENAQ_API_KEY} if settings.OPENAQ_API_KEY else {}
        self.discovered = {}
        self.disabled = False
        self.health = {"source": "OpenAQ v3", "status": "syncing", "locations": 0,
                       "measurements_saved": 0, "empty_locations": 0, "failed_locations": 0,
                       "started_at": datetime.now(UTC).isoformat(), "error": None}

    async def request(self, client, path, params=None):
        global _next_request
        # One process-wide gate even when scheduler and manual refresh overlap.
        # 50 calls/minute leaves headroom beneath the documented 60/minute.
        async with _lock:
            if self.disabled:
                raise RuntimeError("OpenAQ sync halted")
            await asyncio.sleep(max(0, _next_request - time.monotonic()))
            _next_request = time.monotonic() + 1.2
            response = await client.get(self.base_url + path, params=params)
            if response.status_code in (401, 403, 429):
                self.disabled = True
                self.health["error"] = {401: "invalid_credentials", 403: "access_denied", 429: "rate_limited"}[response.status_code]
                if response.status_code == 429:
                    try:
                        reset = float(response.headers.get("retry-after", response.headers.get("x-ratelimit-reset", "60")))
                        if reset > time.time():
                            reset -= time.time()
                        _next_request = time.monotonic() + min(max(reset, 60), 3600)
                    except ValueError:
                        _next_request = time.monotonic() + 60
            response.raise_for_status()
            return response.json().get("results", [])

    async def fetch_locations_in_bbox(self, bbox="-180,-90,180,90", limit=100):
        if not settings.OPENAQ_API_KEY:
            self.health.update(status="unavailable", error="missing_credentials")
            await asyncio.to_thread(status_snapshot, self.health.copy())
            return
        if self.disabled:
            return
        async with httpx.AsyncClient(timeout=25, headers=self.headers) as client:
            try:
                # Fetch metadata in large pages, then favour recently reporting
                # PM2.5 stations, rather than the first 100 historical IDs.
                candidates = []
                for page in range(1, 5):
                    records = await self.request(client, "/locations", {"bbox": bbox, "limit": 1000,
                        "page": page, "parameters_id": 2, "order_by": "id", "sort_order": "desc"})
                    candidates.extend(records)
                    if len(records) < 1000:
                        break
                def last_seen(loc):
                    return (loc.get("datetimeLast") or {}).get("utc") or ""
                selected = sorted(candidates, key=last_seen, reverse=True)[:min(limit, 100)]
                await asyncio.to_thread(self._save_locations, selected)
                for loc in selected:
                    self.discovered[str(loc["id"])] = loc
                self.health["locations"] = len(self.discovered)
            except (httpx.HTTPError, RuntimeError, ValueError, KeyError):
                self.health["error"] = self.health["error"] or "provider_unavailable"
                logger.warning("OpenAQ discovery unavailable; no fallback data inserted")

    def _save_locations(self, records):
        with SessionLocal() as db:
            known = {s.provider_id: s for s in db.query(Sensor).filter(Sensor.provider == "openaq")}
            for loc in records:
                coords = loc.get("coordinates") or {}
                lat, lon = coords.get("latitude"), coords.get("longitude")
                if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)) or not (-90 <= lat <= 90 and -180 <= lon <= 180):
                    continue
                key = str(loc["id"])
                row = known.get(key)
                if row is None:
                    row = Sensor(provider_id=key, name=loc.get("name") or "Unnamed station", lat=lat, lon=lon, provider="openaq")
                    db.add(row)
                    known[key] = row
                else:
                    row.lat, row.lon, row.name = lat, lon, loc.get("name") or row.name
                db.merge(ForecastSnapshot(key="openaq:location:" + key, fetched_at=datetime.now(UTC), payload=loc))
            db.commit()
        observations_cache.clear()

    async def sync_latest_measurements(self):
        if not settings.OPENAQ_API_KEY:
            self.health.update(status="unavailable", error="missing_credentials")
        elif not self.disabled:
            def stations():
                with SessionLocal() as db:
                    return [(s.id, s.provider_id) for s in db.query(Sensor).filter(Sensor.provider == "openaq")
                            if s.provider_id in self.discovered]
            rows = await asyncio.to_thread(stations)
            async with httpx.AsyncClient(timeout=25, headers=self.headers) as client:
                for station_id, location_id in rows:
                    if self.disabled:
                        break
                    try:
                        # Discovery already supplies sensor parameter metadata:
                        # one request per station, no separate sensor-list call.
                        loc = self.discovered[location_id]
                        params = {s["id"]: s.get("parameter", {}) for s in loc.get("sensors", [])}
                        latest = await self.request(client, f"/locations/{location_id}/latest", {"limit": 1000})
                        measurements = [{"value": row.get("value"), "time": (row.get("datetime") or {}).get("utc"),
                                         "upstream_id": row.get("sensorsId")}
                                        for row in latest if pm25_parameter(params.get(row.get("sensorsId"), {}))
                                        and str(row.get("locationsId", location_id)) == location_id]
                        count = await asyncio.to_thread(self._save_measurements, station_id, measurements)
                        self.health["measurements_saved"] += count
                        self.health["empty_locations"] += int(not count)
                    except (httpx.HTTPError, RuntimeError, ValueError, KeyError):
                        self.health["failed_locations"] += 1
                        self.health["error"] = self.health["error"] or "provider_unavailable"
            self.health["status"] = "partial" if self.health["error"] else "available"
        if self.disabled:
            self.health["status"] = "unavailable"
        self.health["finished_at"] = datetime.now(UTC).isoformat()
        await asyncio.to_thread(status_snapshot, self.health.copy())
        return self.health

    def _save_measurements(self, station_id, records):
        count = 0
        with SessionLocal() as db:
            for item in records:
                value = item.get("value")
                if not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0 or not item.get("time"):
                    continue
                try:
                    when = datetime.fromisoformat(item["time"].replace("Z", "+00:00"))
                    if when.tzinfo is None or when > datetime.now(UTC) + timedelta(minutes=5):
                        continue
                except ValueError:
                    continue
                existing = db.query(Measurement).filter_by(sensor_id=station_id, timestamp=when, parameter="pm25").first()
                if not existing:
                    existing = Measurement(sensor_id=station_id, timestamp=when, parameter="pm25", value=value)
                    db.add(existing)
                    db.flush()
                else:
                    existing.value = value
                db.merge(MeasurementEvidence(measurement_id=existing.id, source="OpenAQ v3", upstream_sensor_id=str(item["upstream_id"])))
                count += 1
            db.commit()
        observations_cache.clear()
        return count
