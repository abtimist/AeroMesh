import asyncio
from app.db.base_class import Base
from app.db.session import engine
from app.core.scheduler import job_sync_firms

async def run():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("Fetching NASA FIRMS...")
    await job_sync_firms()
    print("Done!")

if __name__ == "__main__":
    asyncio.run(run())
