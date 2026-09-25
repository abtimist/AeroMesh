from fastapi import APIRouter, BackgroundTasks
from app.services.openaq_client import OpenAQClient
from app.services.meteo_client import OpenMeteoClient
from app.services.firms_client import NASA_FIRMSClient
import asyncio

router = APIRouter()

@router.post("/openaq")
async def trigger_openaq_sync(background_tasks: BackgroundTasks):
    """
    Manually trigger the OpenAQ location and measurement sync in the background.
    """
    async def sync_task():
        client = OpenAQClient()
        await client.fetch_locations_in_bbox("73.0,20.0,89.0,31.0", limit=50)
        await client.sync_latest_measurements()
        
    background_tasks.add_task(sync_task)
    return {"status": "success", "message": "OpenAQ sync triggered in background"}

@router.post("/meteo")
async def trigger_meteo_sync(background_tasks: BackgroundTasks, lat: float = 28.6139, lon: float = 77.2090):
    """
    Manually trigger the Open-Meteo vector sync for a specific coordinate.
    """
    async def sync_task():
        client = OpenMeteoClient()
        await client.fetch_weather_vectors(lat=lat, lon=lon)
        
    background_tasks.add_task(sync_task)
    return {"status": "success", "message": f"Open-Meteo sync triggered for {lat}, {lon}"}

@router.post("/firms")
async def trigger_firms_sync(background_tasks: BackgroundTasks, bbox: str = "70,8,90,35", days: int = 1):
    """
    Manually trigger the NASA FIRMS active fire sync for a specific bounding box.
    """
    async def sync_task():
        client = NASA_FIRMSClient()
        await client.fetch_active_fires(bbox=bbox, days=days)
        
    background_tasks.add_task(sync_task)
    return {"status": "success", "message": f"NASA FIRMS sync triggered for bbox {bbox}"}

