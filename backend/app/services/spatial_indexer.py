import math
from app.db.session import SessionLocal
from app.models.sensor import Sensor
from app.models.event import PollutionEvent

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000  # radius of Earth in meters
    phi_1 = math.radians(lat1)
    phi_2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi_1) * math.cos(phi_2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

class SpatialIndexer:
    @staticmethod
    def get_sensors_near_hotspot(event_id: int, radius_meters: float = 50000):
        db = SessionLocal()
        try:
            event = db.query(PollutionEvent).filter(PollutionEvent.id == event_id).first()
            if not event: return []
            
            sensors = db.query(Sensor).all()
            nearby = []
            for s in sensors:
                dist = haversine(event.lat, event.lon, s.lat, s.lon)
                if dist <= radius_meters:
                    nearby.append({
                        "sensor_id": s.id,
                        "location": s.location_name,
                        "distance_meters": dist
                    })
            return nearby
        finally:
            db.close()
            
    @staticmethod
    def get_hotspots_near_sensor(sensor_id: int, radius_meters: float = 50000):
        db = SessionLocal()
        try:
            sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
            if not sensor: return []
            
            events = db.query(PollutionEvent).all()
            nearby = []
            for e in events:
                dist = haversine(sensor.lat, sensor.lon, e.lat, e.lon)
                if dist <= radius_meters:
                    nearby.append({
                        "event_id": e.id,
                        "severity": e.severity,
                        "distance_meters": dist
                    })
            return nearby
        finally:
            db.close()
