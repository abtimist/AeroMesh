import httpx
import logging
from datetime import datetime, timezone

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.sensor import Sensor, Measurement

logger = logging.getLogger(__name__)

class OpenAQClient:
    def __init__(self):
        self.base_url = "https://api.openaq.org/v3"
        self.headers = {
            "Accept": "application/json"
        }
        if settings.OPENAQ_API_KEY:
            self.headers["X-API-Key"] = settings.OPENAQ_API_KEY
        self.timeout = 10.0

    async def fetch_locations_in_bbox(self, bbox: str = "-180,-90,180,90", limit: int = 100):
        """
        Fetches monitoring stations within a bounding box.
        Format for bbox: minLon,minLat,maxLon,maxLat.
        Default fetches a broad list for testing.
        """
        url = f"{self.base_url}/locations"
        params = {
            "bbox": bbox,
            "limit": limit
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=self.headers, params=params, timeout=self.timeout)
                response.raise_for_status()
                data = response.json()
                results = data.get('results', [])
                self._save_locations(results)
            except Exception as e:
                logger.error(f"Error fetching OpenAQ locations: {e}")

    def _save_locations(self, locations_data):
        db = SessionLocal()
        try:
            for loc in locations_data:
                provider_id = str(loc['id'])
                coords = loc.get('coordinates', {})
                lon = coords.get('longitude')
                lat = coords.get('latitude')
                
                if lon is None or lat is None:
                    continue
                
                existing = db.query(Sensor).filter(Sensor.provider_id == provider_id).first()
                if not existing:
                    
                    sensor = Sensor(
                        provider_id=provider_id,
                        name=loc.get('name', 'Unknown Station'),
                        lat=lat, lon=lon,
                        provider="openaq"
                    )
                    db.add(sensor)
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Database error saving locations: {e}")
        finally:
            db.close()

    async def sync_latest_measurements(self):
        """
        Loops through sensors saved in the DB and fetches their latest measurements.
        """
        db = SessionLocal()
        sensors = db.query(Sensor).filter(Sensor.provider == "openaq").all()
        db.close()
        
        async with httpx.AsyncClient() as client:
            for sensor in sensors:
                url = f"{self.base_url}/sensors/{sensor.provider_id}/measurements"
                params = {"limit": 5} # get top 5 latest
                try:
                    response = await client.get(url, headers=self.headers, params=params, timeout=self.timeout)
                    if response.status_code == 200:
                        data = response.json()
                        self._save_measurements(sensor.id, data.get('results', []))
                except Exception as e:
                    logger.error(f"Error syncing measurement for sensor {sensor.provider_id}: {e}")

    def _save_measurements(self, db_sensor_id: int, measurements_data):
        db = SessionLocal()
        try:
            for m in measurements_data:
                param = m.get('parameter', {}).get('name', 'unknown')
                val = m.get('value')
                ts = m.get('period', {}).get('datetimeTo') # Use datetimeTo for standard UTC
                
                if val is None or not ts:
                    continue
                    
                dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                
                # Deduplicate based on exact timestamp & param (optional safety check)
                existing = db.query(Measurement).filter(
                    Measurement.sensor_id == db_sensor_id,
                    Measurement.parameter == param,
                    Measurement.timestamp == dt
                ).first()
                
                if not existing:
                    measurement = Measurement(
                        sensor_id=db_sensor_id,
                        timestamp=dt,
                        parameter=param,
                        value=float(val)
                    )
                    db.add(measurement)
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Database error saving measurements: {e}")
        finally:
            db.close()
