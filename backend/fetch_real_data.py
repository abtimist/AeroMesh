import asyncio
import logging
from app.core.scheduler import job_sync_openaq, job_sync_firms
from app.db.base_class import Base
from app.db.session import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def fetch_data():
    logger.info("Initializing database...")
    Base.metadata.create_all(bind=engine)
    
    logger.info("Fetching real OpenAQ data for BRICS...")
    await job_sync_openaq()
    
    logger.info("Fetching real NASA FIRMS data for BRICS...")
    await job_sync_firms()
    
    logger.info("Data fetch complete!")

if __name__ == "__main__":
    asyncio.run(fetch_data())
