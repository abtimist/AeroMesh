"""Fetch a bounded India sample and print only status/counts, never credentials."""
import asyncio
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from sqlalchemy import text
from app.db.session import SessionLocal, engine
from app.models.forecast import FireEvidence, MeasurementEvidence
from app.models.sensor import Sensor
from app.services.firms_client import NASA_FIRMSClient
from app.services.openaq_client import OpenAQClient

async def main():
    with SessionLocal() as db:
        db.execute(text("SELECT 1"))
        print("Database connected:", engine.dialect.name, flush=True)
    aq = OpenAQClient()
    await asyncio.gather(NASA_FIRMSClient().fetch_active_fires("68,7,97,37", 1),
                         aq.fetch_locations_in_bbox("68,7,97,37", limit=50))
    await aq.sync_latest_measurements()
    with SessionLocal() as db:
        print("Stations:", db.query(Sensor).count(), flush=True)
        print("Verified FIRMS events:", db.query(FireEvidence).count(), flush=True)
        print("Verified OpenAQ measurements:", db.query(MeasurementEvidence).count(), flush=True)

if __name__ == "__main__":
    asyncio.run(main())
