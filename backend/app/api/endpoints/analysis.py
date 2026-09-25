from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from app.services.spatial_indexer import SpatialIndexer
from app.services.sentinel_mock import Sentinel5PMockParser

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

@router.get("/sentinel-overlay/{event_id}")
def get_sentinel_overlay(event_id: int) -> Dict[str, Any]:
    """
    Returns a mock Sentinel-5P NO2 GeoJSON overlay for the given fire hotspot.
    """
    try:
        return Sentinel5PMockParser.generate_mock_overlay(event_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/plume-forecast/{event_id}")
def get_plume_forecast(event_id: int) -> Dict[str, Any]:
    """
    Generates a Gaussian Plume dispersion polygon based on weather data for an event.
    Returns GeoJSON.
    """
    from app.db.session import SessionLocal
    from app.models.event import PollutionEvent
    from app.models.weather import WeatherLog
    from app.services.plume_model import GaussianPlumeModel
    import shapely.geometry
    
    db = SessionLocal()
    try:
        event = db.query(PollutionEvent).filter(PollutionEvent.id == event_id).first()
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
            
        # Get latest weather for this event's location (mocking a proximity query for now)
        # In production, we'd do a spatial query for the closest WeatherLog
        weather = db.query(WeatherLog).order_by(WeatherLog.timestamp.desc()).first()
        
        polygon = GaussianPlumeModel.generate_forecast(event, weather)
        
        # Save polygon to DB
        from geoalchemy2.shape import from_shape
        event.plume_polygon = from_shape(polygon, srid=4326)
        db.commit()
        
        # Convert to GeoJSON Feature
        geojson_geom = shapely.geometry.mapping(polygon)
        return {
            "type": "Feature",
            "properties": {
                "event_id": event_id,
                "severity": event.severity,
                "type": "plume_forecast"
            },
            "geometry": geojson_geom
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

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

