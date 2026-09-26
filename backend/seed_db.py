import sys
sys.path.append('.')
import datetime
from app.db.session import SessionLocal
from app.models.sensor import Sensor, Measurement
from app.models.event import PollutionEvent
import json

db = SessionLocal()

def seed():
    print("Clearing old data...")
    db.query(Measurement).delete()
    db.query(Sensor).delete()
    db.query(PollutionEvent).delete()
    db.commit()

    print("Inserting sensors...")
    sensors_data = [
        {"provider_id": "openaq_1", "name": "Delhi AQI Central", "lat": 28.6139, "lon": 77.2090, "provider": "OpenAQ", "pm25": 250.5},
        {"provider_id": "openaq_2", "name": "Delhi North", "lat": 28.7041, "lon": 77.1025, "provider": "OpenAQ", "pm25": 310.0},
        {"provider_id": "openaq_3", "name": "Mumbai Bandra", "lat": 19.0760, "lon": 72.8777, "provider": "OpenAQ", "pm25": 120.5},
        {"provider_id": "openaq_4", "name": "Beijing Central", "lat": 39.9042, "lon": 116.4074, "provider": "OpenAQ", "pm25": 180.0},
        {"provider_id": "openaq_5", "name": "Sao Paulo Centro", "lat": -23.5505, "lon": -46.6333, "provider": "OpenAQ", "pm25": 85.0},
        {"provider_id": "openaq_6", "name": "Johannesburg", "lat": -26.2041, "lon": 28.0473, "provider": "OpenAQ", "pm25": 55.0},
    ]

    for sd in sensors_data:
        sensor = Sensor(provider_id=sd['provider_id'], name=sd['name'], lat=sd['lat'], lon=sd['lon'], provider=sd['provider'])
        db.add(sensor)
        db.flush()
        meas = Measurement(sensor_id=sensor.id, timestamp=datetime.datetime.now(datetime.timezone.utc), parameter="pm25", value=sd['pm25'])
        db.add(meas)
        
    print("Inserting events...")
    poly1 = {
        "type": "Polygon",
        "coordinates": [[[77.1, 28.5], [77.3, 28.5], [77.4, 28.7], [77.0, 28.7], [77.1, 28.5]]]
    }
    event1 = PollutionEvent(
        origin_country="IN", event_type="crop_fire", lat=28.6, lon=77.2, 
        severity="CRITICAL", confidence_score=95.5, detected_at=datetime.datetime.now(datetime.timezone.utc),
        plume_polygon=poly1, status="ACTIVE"
    )
    db.add(event1)
    
    poly2 = {
        "type": "Polygon",
        "coordinates": [[[-46.7, -23.6], [-46.5, -23.6], [-46.4, -23.4], [-46.8, -23.4], [-46.7, -23.6]]]
    }
    event2 = PollutionEvent(
        origin_country="BR", event_type="forest_fire", lat=-23.5, lon=-46.6, 
        severity="HIGH", confidence_score=88.0, detected_at=datetime.datetime.now(datetime.timezone.utc),
        plume_polygon=poly2, status="ACTIVE"
    )
    db.add(event2)

    db.commit()
    print("Seeding complete.")

if __name__ == '__main__':
    seed()
