from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from app.services.spatial_indexer import SpatialIndexer

router = APIRouter()

@router.get("/hotspots-near-sensor/{sensor_id}")
def get_hotspots_near_sensor(sensor_id: int, radius_km: float = 50.0) -> List[Dict[str, Any]]:
    """
    Finds active fire hotspots within a given radius (in km) of a sensor.
    """
    try:
        radius_meters = radius_km * 1000
        return SpatialIndexer.get_hotspots_near_sensor(sensor_id, radius_meters=radius_meters)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sensors-near-hotspot/{event_id}")
def get_sensors_near_hotspot(event_id: int, radius_km: float = 50.0) -> List[Dict[str, Any]]:
    """
    Finds ground sensors within a given radius (in km) of a fire hotspot.
    """
    try:
        radius_meters = radius_km * 1000
        return SpatialIndexer.get_sensors_near_hotspot(event_id, radius_meters=radius_meters)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@router.post("/dispatch/{event_id}")
def dispatch_inspector(event_id: int):
    """
    Simulates dispatching a ground inspector or drone to a pollution event.
    In production, this would integrate with a fleet management or SMS API.
    """
    from app.db.session import SessionLocal
    from app.models.event import PollutionEvent
    
    db = SessionLocal()
    try:
        # We don't necessarily need to require the event to exist for a mock demo, 
        # but let's update status if it does
        event = db.query(PollutionEvent).filter(PollutionEvent.id == event_id).first()
        if event:
            event.status = 'DISPATCHED'
            db.commit()
            
        import random
        unit_id = random.randint(10, 99)
        return {
            "status": "success",
            "message": f"Inspector Unit {unit_id} dispatched successfully",
            "unit": f"Unit {unit_id}",
            "event_id": event_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

