"""Explicit live integration check: persists five stations; no NOAA job submission.

Run from backend: python -m scripts.check_task1_live
The transport input is a labelled test scenario at Delhi, not a claimed fire.
"""
import asyncio
from datetime import datetime, timezone
import json
from app.services.transport import fetch_winds, simulate
from app.services.openaq_client import OpenAQClient


async def main():
    start = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    met = await fetch_winds(28.61, 77.21, start, 6)
    result = await asyncio.to_thread(simulate, 28.61, 77.21,
        {"start_at": start.isoformat(), "duration_hours": 6, "release_duration_minutes": 60,
         "diffusivity_m2_s": 100, "seed": 42, "assumptions": "Integration check: hypothetical near-surface unit tracer at Delhi, not an observed release"}, met)
    print(json.dumps({"transport": {"status": "completed", "weather_fetched_at": met["fetched_at"],
          "sha256": met["sha256"], "frames": len(result["frames"]), "features": len(result["features"]),
          "first": result["frames"][0], "last": result["frames"][-1]}}, indent=2), flush=True)
    client = OpenAQClient()
    await client.fetch_locations_in_bbox("68,7,97,37", limit=5)
    print(json.dumps({"openaq": await client.sync_latest_measurements()}, indent=2), flush=True)


if __name__ == "__main__":
    asyncio.run(main())
