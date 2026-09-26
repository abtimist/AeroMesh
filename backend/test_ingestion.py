import asyncio
from app.services.openaq_client import OpenAQClient
from app.services.meteo_client import OpenMeteoClient
from app.services.firms_client import NASA_FIRMSClient
import logging

logging.basicConfig(level=logging.INFO)

async def test_openaq():
    print("--- Testing OpenAQ API (Measurements) ---")
    client = OpenAQClient()
    # Override saving to DB just to print
    original_save = client._save_locations
    client._save_locations = lambda data: print(f"Fetched {len(data)} locations. Example: {data[0] if data else 'None'}")
    await client.fetch_locations_in_bbox("73.0,20.0,89.0,31.0", limit=1)

async def test_meteo():
    print("--- Testing Open-Meteo API ---")
    client = OpenMeteoClient()
    # Override save
    client._save_weather_log = lambda lat, lon, data: print(f"Fetched weather for {lat}, {lon}. Data: {list(data.get('hourly', {}).keys())}")
    await client.fetch_weather_vectors(lat=28.6139, lon=77.2090)

async def test_firms():
    print("--- Testing NASA FIRMS API ---")
    client = NASA_FIRMSClient()
    from app.core.config import settings
    # Since we don't have a real NASA key, it will hit the fallback
    await client.fetch_active_fires(bbox="70,8,90,35", days=1)

async def main():
    await test_openaq()
    await test_meteo()
    await test_firms()

if __name__ == "__main__":
    asyncio.run(main())
