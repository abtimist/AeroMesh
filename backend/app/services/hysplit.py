"""Durable READY dispersion jobs; NOAA processing stays outside map requests."""
import asyncio
from datetime import datetime, timedelta, timezone
import uuid
import httpx
from app.core.config import settings
from app.db.session import SessionLocal, RUNTIME_DIR
from app.models.forecast import DispersionRun, ForecastSnapshot
from app.services.hysplit_output import parse_archive, MAX_BYTES

UTC = timezone.utc
ACTIVE = ("QUEUED", "RUNNING", "GRAPHICS_RUNNING", "DOWNLOADING")

def reserve_call():
    # Single API process: rolling 24h budget is conservative across NOAA's ET reset.
    with SessionLocal() as db:
        now = datetime.now(UTC)
        row = db.get(ForecastSnapshot, "hysplit:usage")
        calls = row.payload.get("calls", []) if row else []
        calls = [t for t in calls if datetime.fromisoformat(t) > now - timedelta(hours=24)]
        if len(calls) >= settings.HYSPLIT_DAILY_BUDGET:
            raise RuntimeError("Local NOAA request budget exhausted; try again later")
        calls.append(now.isoformat())
        db.merge(ForecastSnapshot(key="hysplit:usage", fetched_at=now, payload={"calls": calls}))
        db.commit()

def update_run(run_id, **values):
    with SessionLocal() as db:
        row = db.get(DispersionRun, run_id)
        for key, value in values.items():
            setattr(row, key, value)
        row.updated_at = datetime.now(UTC)
        db.commit()

def ready_payload(event, request):
    start = datetime.fromisoformat(request["start_at"].replace("Z", "+00:00")).astimezone(UTC)
    return {"meteorologicalData": "GFS0p25", "latitude": event.lat, "longitude": event.lon,
        "startDate": start.date().isoformat(), "startTime": start.strftime("%H:%M"),
        "releaseBottom": request["release_bottom_m"], "releaseTop": request["release_top_m"],
        "releaseDuration": request["release_duration_minutes"], "totalDuration": request["duration_hours"],
        "averagingPeriod": 1, "averagedLayerTop": request["averaged_layer_top_m"],
        "graphic": ["kmz"], "application": "none", "includeDiagnostics": True}

class HysplitWorker:
    def __init__(self):
        self.task = None
        self.client = None
        self.lock = asyncio.Lock()

    async def start(self):
        self.client = httpx.AsyncClient(base_url=settings.HYSPLIT_BASE_URL, timeout=30,
            headers={**settings.HYSPLIT_AUTH_HEADERS, "Accept": "application/json"})
        # A killed submit may have reached NOAA: never automatically submit it twice.
        await asyncio.to_thread(self.recover)
        self.task = asyncio.create_task(self.loop())

    @staticmethod
    def recover():
        with SessionLocal() as db:
            for run in db.query(DispersionRun).filter(DispersionRun.status == "SUBMITTING"):
                run.status = "SUBMISSION_UNKNOWN"
                run.error = "Server restarted during submission; check NOAA before resubmitting."
            db.commit()

    async def close(self):
        if self.task:
            self.task.cancel()
            await asyncio.gather(self.task, return_exceptions=True)
        if self.client:
            await self.client.aclose()

    async def request(self, method, path, **kwargs):
        async with self.lock:
            await asyncio.to_thread(reserve_call)
            response = await self.client.request(method, path, **kwargs)
            response.raise_for_status()
            return response

    async def submit(self, run_id, payload):
        try:
            response = await self.request("POST", "/api/v1/disp", json=payload)
            remote_id = str(uuid.UUID(response.json()["uuid"]))
            await asyncio.to_thread(update_run, run_id, remote_id=remote_id, status="QUEUED")
        except (httpx.TransportError, ValueError, KeyError):
            await asyncio.to_thread(update_run, run_id, status="SUBMISSION_UNKNOWN", error="NOAA submission timed out; verify with NOAA before retrying.")
        except (httpx.HTTPStatusError, RuntimeError):
            await asyncio.to_thread(update_run, run_id, status="FAILED", error="NOAA submission failed. Check authentication, input times, and quota.")

    async def loop(self):
        while True:
            await asyncio.sleep(max(60, settings.HYSPLIT_POLL_SECONDS))
            if not settings.HYSPLIT_AUTH_HEADERS:
                continue
            with SessionLocal() as db:
                runs = [(r.id, r.remote_id) for r in db.query(DispersionRun).filter(DispersionRun.status.in_(ACTIVE)).order_by(DispersionRun.updated_at).limit(4)]
            for run_id, remote_id in runs:
                try:
                    await self.poll(run_id, remote_id)
                except (httpx.HTTPError, ValueError, RuntimeError, KeyError):
                    await asyncio.to_thread(update_run, run_id, error="NOAA temporarily unavailable, quota exhausted, or invalid response; will retry.")

    async def poll(self, run_id, remote_id):
        response = await self.request("GET", f"/api/v1/disp/status/{remote_id}")
        status = response.json()["jobStatus"]
        if status not in (*ACTIVE, "COMPLETED", "CRASHED", "GRAPHICS_FAILED", "EXPIRED"):
            raise ValueError("Unexpected NOAA job state")
        if status != "COMPLETED":
            await asyncio.to_thread(update_run, run_id, status=status, error=None)
            return
        await asyncio.to_thread(update_run, run_id, status="DOWNLOADING", error=None)
        # Stream and bound the archive; never extract provider paths to disk.
        async with self.lock:
            await asyncio.to_thread(reserve_call)
            async with self.client.stream("GET", f"/api/v1/disp/download/{remote_id}") as response:
                response.raise_for_status()
                data = bytearray()
                async for chunk in response.aiter_bytes():
                    data.extend(chunk)
                    if len(data) > MAX_BYTES:
                        await asyncio.to_thread(update_run, run_id, status="FAILED", error="Model result exceeds the download limit.")
                        return
        folder = RUNTIME_DIR / "hysplit"
        folder.mkdir(exist_ok=True)
        await asyncio.to_thread((folder / f"{run_id}.zip").write_bytes, data)
        try:
            result = await asyncio.to_thread(parse_archive, data)
            for feature in result["features"]:
                feature["properties"]["run_id"] = run_id
            await asyncio.to_thread(update_run, run_id, status="COMPLETED", result=result, error=None)
        except Exception:
            # Unsupported contour output is explicit, never replaced with an ellipse.
            await asyncio.to_thread(update_run, run_id, status="OUTPUT_UNSUPPORTED", error="Downloaded output could not be converted to dated contours. Raw archive is retained for inspection.")

hysplit_worker = HysplitWorker()
