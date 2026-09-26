from apscheduler.schedulers.asyncio import AsyncIOScheduler
import logging
from app.services.openaq_client import OpenAQClient
from app.services.meteo_client import OpenMeteoClient
from app.services.firms_client import NASA_FIRMSClient

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

BRICS_BBOXES = [
    "68,7,97,37",       # India
    "-73,-33,-34,5",    # Brazil
    "73,18,135,53",     # China
    "16,-35,33,-22"     # South Africa
]

async def job_sync_openaq():
    logger.info("Starting OpenAQ sync job...")
    client = OpenAQClient()
    for bbox in BRICS_BBOXES:
        await client.fetch_locations_in_bbox(bbox, limit=100)
    await client.sync_latest_measurements()
    logger.info("OpenAQ sync job completed.")

async def job_sync_meteo():
    logger.info("Starting Open-Meteo sync job...")
    client = OpenMeteoClient()
    # Currently meteo syncs a single point, could be expanded.
    await client.fetch_weather_vectors(lat=28.6139, lon=77.2090)
    logger.info("Open-Meteo sync job completed.")

async def job_sync_firms():
    logger.info("Starting NASA FIRMS sync job...")
    client = NASA_FIRMSClient()
    for bbox in BRICS_BBOXES:
        await client.fetch_active_fires(bbox=bbox, days=1)
    logger.info("NASA FIRMS sync job completed.")

def start_scheduler():
    # Sync OpenAQ every hour
    scheduler.add_job(job_sync_openaq, 'interval', minutes=60)
    
    # Sync Weather every hour
    scheduler.add_job(job_sync_meteo, 'interval', minutes=60)
    
    # Sync NASA FIRMS every 3 hours
    scheduler.add_job(job_sync_firms, 'interval', minutes=180)
    
    scheduler.start()
    logger.info("Background APScheduler started.")

