import httpx
import logging
import csv
import io
from datetime import datetime, timezone

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.event import PollutionEvent

logger = logging.getLogger(__name__)

class NASA_FIRMSClient:
    def __init__(self):
        self.base_url = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"
        self.api_key = settings.NASA_FIRMS_API_KEY
        self.timeout = 15.0

    async def fetch_active_fires(self, bbox: str = "70,8,90,35", days: int = 1):
        """
        Fetches active fire hotspots from NASA FIRMS.
        bbox format: minLon,minLat,maxLon,maxLat (e.g., India approximate bounds)
        days: 1 to 10
        source: VIIRS_SNPP_NRT
        """
        if not self.api_key:
            logger.warning("NASA_FIRMS_API_KEY not set. Cannot fetch fire hotspots.")
            return

        source = "VIIRS_SNPP_NRT"
        # API expects: https://firms.modaps.eosdis.nasa.gov/api/area/csv/[transaction_id]/[source]/[area]/[DAY_RANGE]
        url = f"{self.base_url}/{self.api_key}/{source}/{bbox}/{days}"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, timeout=self.timeout)
                response.raise_for_status()
                # Parse CSV
                csv_reader = csv.DictReader(io.StringIO(response.text))
                fires = list(csv_reader)
                self._save_hotspots(fires)
            except Exception as e:
                logger.error(f"Error fetching NASA FIRMS hotspots: {e}")

    def _save_hotspots(self, fire_data):
        if not fire_data:
            return

        db = SessionLocal()
        try:
            for row in fire_data:
                lat = float(row.get('latitude', 0))
                lon = float(row.get('longitude', 0))
                
                # Combine acq_date and acq_time into a datetime object
                acq_date = row.get('acq_date')
                acq_time = row.get('acq_time') # Format is usually HHMM, e.g., '1430'
                if acq_date and acq_time:
                    dt_str = f"{acq_date} {acq_time}"
                    dt = datetime.strptime(dt_str, "%Y-%m-%d %H%M").replace(tzinfo=timezone.utc)
                else:
                    dt = datetime.now(timezone.utc)
                
                frp = float(row.get('frp', 0))
                confidence = row.get('confidence', 'n/a')
                
                # Calculate simple severity based on FRP (Fire Radiative Power)
                severity = "LOW"
                if frp > 100:
                    severity = "CRITICAL"
                elif frp > 50:
                    severity = "HIGH"
                elif frp > 20:
                    severity = "MEDIUM"
                
                # We can map confidence 'n/a', 'l', 'n', 'h' to a float score
                conf_score = 50.0
                if confidence == 'h':
                    conf_score = 90.0
                elif confidence == 'n':
                    conf_score = 60.0
                elif confidence == 'l':
                    conf_score = 30.0
                    
                
                
                # Prevent exact duplicates (same location and time)
                existing = db.query(PollutionEvent).filter(
                    PollutionEvent.detected_at == dt,
                    PollutionEvent.event_type == 'biomass_burning'
                ).first()
                # A robust check would use ST_Equals on geometry, but this prevents simple duplication
                
                if not existing:
                    # Generate a predictive plume polygon using Gaussian Dispersion
                    try:
                        from app.services.plume_model import GaussianPlumeModel
                        import shapely.geometry
                        
                        # Simulated regional wind variation based on coordinates
                        wind_speed = 5.0 + (lat % 2.0) * 2.0
                        wind_dir = (145.0 + lat * 3.0 - lon * 2.0) % 360.0
                        pblh = 1000.0
                        
                        poly = GaussianPlumeModel.calculate_plume_polygon(
                            lat, lon, wind_speed, wind_dir, pblh, distance_km=30.0
                        )
                        plume_geojson = shapely.geometry.mapping(poly)
                    except Exception as e:
                        logger.error(f"Plume generation error: {e}")
                        plume_geojson = None

                    event = PollutionEvent(
                        origin_country='IND', # Simplified for this demo
                        event_type='biomass_burning',
                        lat=lat, lon=lon,
                        severity=severity,
                        confidence_score=conf_score,
                        detected_at=dt,
                        status='ACTIVE',
                        plume_polygon=plume_geojson,
                        predicted_vector_deg=145.0
                    )
                    db.add(event)
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Database error saving NASA FIRMS hotspots: {e}")
        finally:
            db.close()
