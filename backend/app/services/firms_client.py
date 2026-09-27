import asyncio
import csv
from datetime import datetime, timezone
import io
import logging
import httpx
from app.core.config import settings
from app.core.cache import observations_cache
from app.db.session import SessionLocal
from app.models.event import PollutionEvent
from app.models.forecast import FireEvidence

logger = logging.getLogger(__name__)

class NASA_FIRMSClient:
    source = "VIIRS_NOAA20_NRT"

    async def fetch_active_fires(self, bbox="70,8,90,35", days=1):
        if not settings.NASA_FIRMS_API_KEY:
            return
        if not 1 <= days <= 10:
            raise ValueError("FIRMS days must be between 1 and 10")
        url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{settings.NASA_FIRMS_API_KEY}/{self.source}/{bbox}/{days}"
        async with httpx.AsyncClient(timeout=20) as client:
            try:
                response = await client.get(url)
                response.raise_for_status()
                await asyncio.to_thread(self._save_hotspots, list(csv.DictReader(io.StringIO(response.text))))
            except (httpx.HTTPError, ValueError):
                # The URL contains a credential: do not log it.
                logger.warning("FIRMS unavailable; existing observations retained")

    def _save_hotspots(self, records):
        with SessionLocal() as db:
            for row in records:
                try:
                    lat, lon = float(row["latitude"]), float(row["longitude"])
                    when = datetime.strptime(row["acq_date"] + " " + row["acq_time"].zfill(4), "%Y-%m-%d %H%M").replace(tzinfo=timezone.utc)
                    frp = float(row["frp"]) if row.get("frp") else None
                except (KeyError, ValueError):
                    continue
                event = db.query(PollutionEvent).filter_by(lat=lat, lon=lon, detected_at=when, event_type="biomass_burning").first()
                if event is None:
                    # Severity is a local FRP category, not source attribution or confidence.
                    severity = "CRITICAL" if frp is not None and frp > 100 else "HIGH" if frp is not None and frp > 50 else "MEDIUM" if frp is not None and frp > 20 else "LOW"
                    event = PollutionEvent(origin_country="UNK", event_type="biomass_burning",
                        lat=lat, lon=lon, detected_at=when, severity=severity,
                        confidence_score=0, status="ACTIVE", plume_polygon=None, predicted_vector_deg=None)
                    db.add(event)
                    db.flush()
                db.merge(FireEvidence(event_id=event.id, source=f"NASA FIRMS {self.source}",
                    frp_mw=frp, confidence=row.get("confidence"), satellite=row.get("satellite"),
                    instrument=row.get("instrument"), fetched_at=datetime.now(timezone.utc)))
            db.commit()
        observations_cache.clear()
