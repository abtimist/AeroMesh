import asyncio
from app.core.scheduler import job_sync_openaq

async def run():
    print("Fetching OpenAQ...")
    await job_sync_openaq()
    print("Done!")

if __name__ == "__main__":
    asyncio.run(run())
