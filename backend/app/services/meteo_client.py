import httpx
import logging
from datetime import datetime, timezone
from geoalchemy2.shape import from_shape
from shapely.geometry import Point

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.weather import WeatherLog

logger = logging.getLogger(__name__)

class OpenMeteoClient:
    def __init__(self):
        self.base_url = settings.OPEN_METEO_BASE_URL
        self.timeout = 10.0

    async def fetch_weather_vectors(self, lat: float, lon: float):
        """
        Calls Open-Meteo's hourly forecast endpoint for wind and boundary layer height.
        """
        url = f"{self.base_url}/forecast"
        params = {
            "latitude": lat,
            "longitude": lon,
            "hourly": "wind_speed_10m,wind_direction_10m,boundary_layer_height",
            "timezone": "UTC"
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, params=params, timeout=self.timeout)
                response.raise_for_status()
                data = response.json()
                self._save_weather_log(lat, lon, data)
            except Exception as e:
                logger.error(f"Error fetching Open-Meteo data for {lat},{lon}: {e}")

    def _save_weather_log(self, lat: float, lon: float, data: dict):
        hourly = data.get('hourly', {})
        times = hourly.get('time', [])
        wind_speeds = hourly.get('wind_speed_10m', [])
        wind_directions = hourly.get('wind_direction_10m', [])
        pblhs = hourly.get('boundary_layer_height', [])
        
        if not times:
            return

        db = SessionLocal()
        try:
            # We just take the most recent hour (or the current hour)
            # Open-Meteo returns a forecast block, let's grab the current UTC hour index
            current_utc = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
            
            for i, ts_str in enumerate(times):
                dt = datetime.fromisoformat(ts_str).replace(tzinfo=timezone.utc)
                if dt == current_utc:
                    ws = wind_speeds[i]
                    wd = wind_directions[i]
                    pblh = pblhs[i]
                    
                    if ws is not None and wd is not None and pblh is not None:
                        geom = from_shape(Point(lon, lat), srid=4326)
                        
                        existing = db.query(WeatherLog).filter(
                            WeatherLog.timestamp == dt
                            # In production, we'd filter by exact geometry ST_Equals or similar
                        ).first()
                        
                        if not existing:
                            wlog = WeatherLog(
                                location=geom,
                                timestamp=dt,
                                wind_speed=float(ws),
                                wind_direction=float(wd),
                                pblh=float(pblh)
                            )
                            db.add(wlog)
                            db.commit()
                    break
        except Exception as e:
            db.rollback()
            logger.error(f"Database error saving weather log: {e}")
        finally:
            db.close()
