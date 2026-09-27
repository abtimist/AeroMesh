"""Read-only live checks. Reports availability; never submits a NOAA model job."""
import argparse
import asyncio
import json
import time
import httpx

async def main(base):
    async with httpx.AsyncClient(base_url=base, timeout=55, trust_env=False) as client:
        for endpoint in ("/health", "/api/dispersion/status"):
            response = await client.get(endpoint)
            response.raise_for_status()
            print(endpoint, response.json(), flush=True)
        started = time.perf_counter()
        response = await client.get("/api/forecast?node=india")
        print("forecast initial", response.status_code, round((time.perf_counter() - started) * 1000), "ms", flush=True)
        for _ in range(12):
            data = response.json()
            if data.get("status") != "loading" and not data.get("refreshing"):
                break
            await asyncio.sleep(3)
            response = await client.get("/api/forecast?node=india")
        print("forecast", json.dumps({"status": data.get("status"), "frames": len(data.get("frames", [])), "wind": data.get("wind"), "air_quality": data.get("air_quality")}), flush=True)
        events = (await client.get("/api/data/events?node=india")).json()
        if events:
            event_id = events[0]["id"]
            evidence = await client.get(f"/api/evidence/{event_id}")
            evidence.raise_for_status()
            print("evidence", evidence.status_code, evidence.json()["satellite"]["date"], flush=True)
            image = await client.get(f"/api/evidence/{event_id}/satellite.png")
            print("satellite", image.status_code, image.headers.get("content-type"), len(image.content), flush=True)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://127.0.0.1:8000")
    asyncio.run(main(parser.parse_args().base))
