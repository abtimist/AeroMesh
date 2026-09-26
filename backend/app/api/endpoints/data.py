from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
import datetime

from app.db.session import SessionLocal
from app.models.sensor import Sensor, Measurement
from app.models.event import PollutionEvent
import shapely.geometry

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/sensors")
def get_sensors(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """
    Returns all active sensors with their latest PM2.5 measurement.
    """
    try:
        sensors = db.query(Sensor).all()
        result = []
        for s in sensors:
            # Get latest pm2.5 measurement
            latest_meas = db.query(Measurement)\
                .filter(Measurement.sensor_id == s.id, Measurement.parameter == 'pm25')\
                .order_by(Measurement.timestamp.desc())\
                .first()
            
            geom = None # location is lat/lon
            
            # Simple AQI level mapping based on PM2.5
            pm25 = latest_meas.value if latest_meas else 0
            if pm25 <= 12: aqiLevel = 'GOOD'
            elif pm25 <= 35.4: aqiLevel = 'MODERATE'
            elif pm25 <= 55.4: aqiLevel = 'USG'
            elif pm25 <= 150.4: aqiLevel = 'UNHEALTHY'
            elif pm25 <= 250.4: aqiLevel = 'VERY_UNHEALTHY'
            else: aqiLevel = 'HAZARDOUS'
            
            result.append({
                "id": s.id,
                "provider_id": s.provider_id,
                "name": s.name,
                "lat": s.lat,
                "lon": s.lon,
                "pm25": pm25,
                "aqiLevel": aqiLevel,
                "location": s.name,
                "timestamp": latest_meas.timestamp.isoformat() if latest_meas else None
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/events")
def get_events(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """
    Returns active pollution events (hotspots and plumes).
    """
    try:
        events = db.query(PollutionEvent).filter(PollutionEvent.status == 'ACTIVE').order_by(PollutionEvent.detected_at.desc()).all()
        result = []
        for e in events:
            centroid = None
            plume_geojson = None
            if e.plume_polygon:
                plume_shape = None
                plume_geojson = e.plume_polygon
            
            result.append({
                "id": e.id,
                "event_type": e.event_type,
                "severity": e.severity,
                "confidence": e.confidence_score,
                "lat": e.lat,
                "lon": e.lon,
                "detected_at": e.detected_at.isoformat(),
                "plume_polygon": plume_geojson,
                "predicted_vector_deg": e.predicted_vector_deg
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
