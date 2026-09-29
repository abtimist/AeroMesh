from fastapi import APIRouter, BackgroundTasks
from app.services.openaq_client import OpenAQClient
from app.services.meteo_client import OpenMeteoClient
from app.services.firms_client import NASA_FIRMSClient
from app.api.endpoints.operations import submit_report

router = APIRouter()


@router.post("/openaq")
async def trigger_openaq_sync(background_tasks: BackgroundTasks):
    async def sync_task():
        client = OpenAQClient()
        await client.fetch_locations_in_bbox("73.0,20.0,89.0,31.0", limit=50)
        await client.sync_latest_measurements()
    background_tasks.add_task(sync_task)
    return {"status": "queued", "message": "OpenAQ refresh queued; inspect /api/data/providers/openaq for the outcome"}


@router.post("/meteo")
async def trigger_meteo_sync(background_tasks: BackgroundTasks, lat: float = 28.6139, lon: float = 77.2090):
    background_tasks.add_task(OpenMeteoClient().fetch_weather_vectors, lat=lat, lon=lon)
    return {"status": "queued", "message": "Weather refresh queued"}


@router.post("/firms")
async def trigger_firms_sync(background_tasks: BackgroundTasks, bbox: str = "70,8,90,35", days: int = 1):
    background_tasks.add_task(NASA_FIRMSClient().fetch_active_fires, bbox=bbox, days=days)
    return {"status": "queued", "message": "FIRMS refresh queued"}


# Preserve the existing upload URL; use the same real validation/processing path.
router.add_api_route("/report", submit_report, methods=["POST"], status_code=202)
