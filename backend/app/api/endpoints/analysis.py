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

