from fastapi import APIRouter, Depends, HTTPException, Query
from app.services.spatial_indexer import SpatialIndexer
from app.api.endpoints.operations import assign, operator

router = APIRouter()


@router.get("/hotspots-near-sensor/{sensor_id}")
def get_hotspots_near_sensor(sensor_id: int, radius_km: float = Query(50, gt=0, le=500)):
    try:
        return SpatialIndexer.get_hotspots_near_sensor(sensor_id, radius_meters=radius_km * 1000)
    except Exception:
        raise HTTPException(503, "Spatial query unavailable")


@router.get("/sensors-near-hotspot/{event_id}")
def get_sensors_near_hotspot(event_id: int, radius_km: float = Query(50, gt=0, le=500)):
    try:
        return SpatialIndexer.get_sensors_near_hotspot(event_id, radius_meters=radius_km * 1000)
    except Exception:
        raise HTTPException(503, "Spatial query unavailable")


# Legacy dispatch URL now uses the persisted, validated allocation workflow.
router.add_api_route("/dispatch/{event_id}", assign, methods=["POST"], status_code=201, dependencies=[Depends(operator)])
