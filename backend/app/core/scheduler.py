from apscheduler.schedulers.asyncio import AsyncIOScheduler
import logging
from app.services.openaq_client import OpenAQClient
from app.services.meteo_client import OpenMeteoClient
from app.services.firms_client import NASA_FIRMSClient

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

async def job_sync_openaq():
    logger.info("Starting OpenAQ sync job...")
    client = OpenAQClient()
    await client.fetch_locations_in_bbox("73.0,20.0,89.0,31.0", limit=50)
    await client.sync_latest_measurements()
    logger.info("OpenAQ sync job completed.")

async def job_sync_meteo():
    logger.info("Starting Open-Meteo sync job...")
    client = OpenMeteoClient()
    await client.fetch_weather_vectors(lat=28.6139, lon=77.2090)
    logger.info("Open-Meteo sync job completed.")

async def job_sync_firms():
    logger.info("Starting NASA FIRMS sync job...")
    client = NASA_FIRMSClient()
    # Broad bounding box for Northern India
    await client.fetch_active_fires(bbox="70,8,90,35", days=1)
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

