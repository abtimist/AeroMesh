from sqlalchemy import func
from geoalchemy2.functions import ST_DistanceSphere

from app.db.session import SessionLocal
from app.models.sensor import Sensor
from app.models.event import PollutionEvent

class SpatialIndexer:
    @staticmethod
    def get_hotspots_near_sensor(sensor_id: int, radius_meters: float = 50000.0, limit: int = 10):
        """
        Uses PostGIS ST_DistanceSphere to find active NASA FIRMS fire hotspots 
        within `radius_meters` of a specific sensor.
        """
        db = SessionLocal()
        try:
            sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
            if not sensor:
                return []
                
            # Query active pollution events (hotspots)
            # ST_DistanceSphere calculates distance in meters on the Earth's surface
            hotspots = db.query(
                PollutionEvent,
                ST_DistanceSphere(PollutionEvent.centroid, sensor.location).label('distance')
            ).filter(
                PollutionEvent.status == 'ACTIVE',
                ST_DistanceSphere(PollutionEvent.centroid, sensor.location) <= radius_meters
            ).order_by('distance').limit(limit).all()
            
            result = []
            for event, distance in hotspots:
                result.append({
                    "event_id": event.id,
                    "event_type": event.event_type,
                    "severity": event.severity,
                    "distance_meters": distance,
                    "detected_at": event.detected_at.isoformat()
                })
            return result
            
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()
            
    @staticmethod
    def get_sensors_near_hotspot(event_id: int, radius_meters: float = 50000.0):
        """
        Finds all ground sensors within a certain radius of a specific fire hotspot.
        Useful for determining which sensors should be tracking a plume.
        """
        db = SessionLocal()
        try:
            event = db.query(PollutionEvent).filter(PollutionEvent.id == event_id).first()
            if not event:
                return []
                
            sensors = db.query(
                Sensor,
                ST_DistanceSphere(Sensor.location, event.centroid).label('distance')
            ).filter(
                ST_DistanceSphere(Sensor.location, event.centroid) <= radius_meters
            ).order_by('distance').all()
            
            result = []
            for sensor, distance in sensors:
                result.append({
                    "sensor_id": sensor.id,
                    "provider": sensor.provider,
                    "name": sensor.name,
                    "distance_meters": distance
                })
            return result
            
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()
