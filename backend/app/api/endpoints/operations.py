"""Persistent citizen reports and operator-driven dispatch simulation."""
import asyncio
from datetime import datetime, timezone
import hashlib
import logging
from io import BytesIO
import math
import secrets
import uuid
import warnings

import httpx
from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import FileResponse
from PIL import Image, ImageOps, UnidentifiedImageError
from pydantic import BaseModel, Field
from sqlalchemy import update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.cache import observations_cache
from app.db.session import SessionLocal, RUNTIME_DIR, get_db
from app.models.event import PollutionEvent
from app.models.operations import PhotoReport, ResponseResource, ResourceAssignment
from app.services import citizen_vision

router = APIRouter()
UTC = timezone.utc
logger = logging.getLogger(__name__)
MAX_BYTES = 10 * 1024 * 1024
MAX_PIXELS = 24_000_000


def now():
    return datetime.now(UTC)


def operator(x_operator_token: str | None = Header(None)):
    token = settings.MODEL_OPERATOR_TOKEN
    if (token or settings.APP_ENV != "development") and (not token or not x_operator_token or not secrets.compare_digest(token, x_operator_token)):
        raise HTTPException(403, "A valid operator token is required")


def image_bytes(raw):
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(raw)) as image:
                if image.format not in ("JPEG", "PNG", "WEBP") or image.width * image.height > MAX_PIXELS:
                    raise ValueError("Unsupported image or more than 24 million pixels")
                image.load()
                image = ImageOps.exif_transpose(image).convert("RGB")
                image.thumbnail((1600, 1600))
                output = BytesIO()
                # Re-encoding strips EXIF/GPS and arbitrary embedded metadata.
                image.save(output, format="JPEG", quality=90)
                return output.getvalue()
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise HTTPException(422, "Use a valid JPEG, PNG or WebP photo with at most 24 million pixels")


def report_json(row):
    return {"id": row.id, "report_id": row.id, "status": row.status, "lat": row.lat, "lon": row.lon,
            "location_source": row.location_source, "accuracy_m": row.accuracy_m, "description": row.description,
            "created_at": row.created_at, "updated_at": row.updated_at,
            "result": row.result, "error": row.error, "event_id": row.event_id,
            "image_url": f"/api/citizen/reports/{row.id}/photo", "review_required": True}


@router.get("/model")
def model_status():
    return {"status": "ready" if citizen_vision.ready() else "not_installed",
            "model": citizen_vision.MODEL_ID, "revision": citizen_vision.REVISION,
            "message": "Local classification, not verified fire detection. Photos are not sent to an external CV API."}


@router.post("/reports", status_code=202)
async def submit_report(photo: UploadFile = File(...), lat: float = Form(..., ge=-90, le=90),
                        lon: float = Form(..., ge=-180, le=180),
                        location_source: str = Form(..., pattern="^(gps|manual)$"),
                        accuracy_m: float | None = Form(None, ge=0, le=100000),
                        description: str = Form("", max_length=1000), db: Session = Depends(get_db)):
    if not math.isfinite(lat + lon) or (accuracy_m is not None and not math.isfinite(accuracy_m)):
        raise HTTPException(422, "Coordinates and accuracy must be finite")
    if not citizen_vision.ready():
        raise HTTPException(503, "Install the local classifier with python -m scripts.setup_citizen_model, then retry")
    if db.query(PhotoReport).filter(PhotoReport.status.in_(("queued", "processing"))).count() >= 20:
        raise HTTPException(429, "Report processing queue is full; retry later")
    raw = await photo.read(MAX_BYTES + 1)
    await photo.close()
    if not raw or len(raw) > MAX_BYTES:
        raise HTTPException(413, "Photo must be nonempty and no larger than 10 MiB")
    sanitized = await asyncio.to_thread(image_bytes, raw)
    report_id = str(uuid.uuid4())
    folder = RUNTIME_DIR / "citizen-photos"
    folder.mkdir(exist_ok=True)
    path = folder / (report_id + ".jpg")
    await asyncio.to_thread(path.write_bytes, sanitized)
    row = PhotoReport(id=report_id, lat=lat, lon=lon, location_source=location_source,
                      accuracy_m=accuracy_m, description=description.strip(), image_path=str(path),
                      image_sha256=hashlib.sha256(sanitized).hexdigest(), status="queued", created_at=now(), updated_at=now())
    try:
        db.add(row); db.commit(); db.refresh(row)
    except Exception:
        db.rollback()
        path.unlink(missing_ok=True)
        raise
    return report_json(row)


@router.get("/reports/{report_id}")
def report_status(report_id: uuid.UUID, db: Session = Depends(get_db)):
    row = db.get(PhotoReport, str(report_id))
    if not row:
        raise HTTPException(404, "Report not found")
    return report_json(row)


@router.get("/reports/{report_id}/photo")
def report_photo(report_id: uuid.UUID, db: Session = Depends(get_db)):
    row = db.get(PhotoReport, str(report_id))
    if not row:
        raise HTTPException(404, "Report not found")
    return FileResponse(row.image_path, media_type="image/jpeg", headers={"Cache-Control": "private, no-store"})


class ReportWorker:
    def __init__(self):
        self.task = None

    @staticmethod
    def recover():
        with SessionLocal() as db:
            db.query(PhotoReport).filter_by(status="processing").update({"status": "queued"})
            db.commit()

    async def start(self):
        await asyncio.to_thread(self.recover)
        self.task = asyncio.create_task(self.loop())

    async def close(self):
        if self.task:
            self.task.cancel()
            await asyncio.gather(self.task, return_exceptions=True)

    @staticmethod
    def process_next():
        with SessionLocal() as db:
            row = db.query(PhotoReport).filter_by(status="queued").order_by(PhotoReport.created_at).first()
            if row is None:
                return
            claimed = db.execute(update(PhotoReport).where(PhotoReport.id == row.id, PhotoReport.status == "queued").values(status="processing", updated_at=now())).rowcount
            db.commit()
            if not claimed:
                return
            try:
                result = citizen_vision.classify(row.image_path)
                row.result, row.status, row.error = result, "completed", None
                # All reports retain their exact scores; only model-positive
                # images become explicitly UNVERIFIED citizen events.
                if result["label"] in ("smoke", "fire") and result["score"] >= 0.7 and row.event_id is None:
                    event = PollutionEvent(lat=row.lat, lon=row.lon, origin_country="UNK",
                        event_type="citizen_" + result["label"] + "_unverified", severity="LOW",
                        confidence_score=result["score"] * 100, status="ACTIVE", detected_at=row.created_at)
                    db.add(event); db.flush(); row.event_id = event.id
                row.updated_at = now()
                db.commit()
                observations_cache.clear()
            except Exception:
                logger.exception("Citizen image processing failed for report %s", row.id)
                db.rollback()
                row = db.get(PhotoReport, row.id)
                row.status, row.error, row.updated_at = "failed", "Local image analysis failed. Check model installation and retry with a new report; no confidence was fabricated.", now()
                db.commit()

    async def loop(self):
        while True:
            try:
                await asyncio.to_thread(self.process_next)
            except Exception:
                # Database restart/outage must not permanently kill ingestion.
                logger.exception("Citizen report worker could not poll its queue")
            await asyncio.sleep(1)


report_worker = ReportWorker()


@router.get("/conditions")
async def local_conditions(lat: float, lon: float):
    if not math.isfinite(lat + lon) or not (-90 <= lat <= 90 and -180 <= lon <= 180):
        raise HTTPException(422, "Invalid coordinates")
    params = {"latitude": lat, "longitude": lon, "timezone": "UTC", "forecast_days": 1}
    if settings.OPEN_METEO_API_KEY:
        params["apikey"] = settings.OPEN_METEO_API_KEY
    async with httpx.AsyncClient(timeout=15) as client:
        async def fetch(url, extra):
            try:
                r = await client.get(url, params={**params, **extra}); r.raise_for_status()
                data = r.json()
                return {"status": "available", "current": data["current"], "units": data["current_units"]}
            except (httpx.HTTPError, ValueError, KeyError):
                return {"status": "unavailable"}
        weather, air = await asyncio.gather(
            fetch(settings.OPEN_METEO_BASE_URL + "/forecast", {"current": "temperature_2m,wind_speed_10m,wind_direction_10m", "wind_speed_unit": "ms", "models": "gfs_seamless"}),
            fetch(settings.OPEN_METEO_AQ_URL, {"current": "pm2_5,us_aqi", "domains": "cams_global"}))
    return {"kind": "forecast", "lat": lat, "lon": lon, "fetched_at": now().isoformat(),
            "weather": {**weather, "source": "GFS / Open-Meteo"}, "air_quality": {**air, "source": "CAMS Global / Open-Meteo (~45 km)"}}


class ResourceInput(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    lat: float = Field(ge=-90, le=90, allow_inf_nan=False)
    lon: float = Field(ge=-180, le=180, allow_inf_nan=False)
    capability: str = Field(default="inspection", pattern="^(inspection|fire_response|air_sampling)$")
    service_radius_km: float = Field(default=50, gt=0, le=500, allow_inf_nan=False)
    enabled: bool = True


def resource_json(row):
    return {key: getattr(row, key) for key in ("id", "name", "lat", "lon", "capability", "service_radius_km", "enabled", "busy_assignment_id", "updated_at")}


def assignment_json(row):
    return {"mode": "dispatch_simulation", "external_agency_contacted": False,
            **{key: getattr(row, key) for key in ("id", "event_id", "resource_id", "resource_name", "status", "distance_km", "note", "audit", "created_at", "updated_at")}}


@router.get("/resources", dependencies=[Depends(operator)])
def resources(db: Session = Depends(get_db)):
    return [resource_json(r) for r in db.query(ResponseResource).order_by(ResponseResource.name)]


@router.post("/resources", status_code=201, dependencies=[Depends(operator)])
def create_resource(body: ResourceInput, db: Session = Depends(get_db)):
    row = ResponseResource(id=str(uuid.uuid4()), **{**body.model_dump(), "enabled": int(body.enabled)}, updated_at=now())
    try:
        db.add(row); db.commit(); db.refresh(row)
    except IntegrityError:
        db.rollback(); raise HTTPException(409, "A resource with this name already exists")
    return resource_json(row)


@router.put("/resources/{resource_id}", dependencies=[Depends(operator)])
def edit_resource(resource_id: uuid.UUID, body: ResourceInput, db: Session = Depends(get_db)):
    result = db.execute(update(ResponseResource).where(ResponseResource.id == str(resource_id), ResponseResource.busy_assignment_id.is_(None)).values(**{**body.model_dump(), "enabled": int(body.enabled)}, updated_at=now()))
    if result.rowcount != 1:
        db.rollback(); raise HTTPException(409, "Resource missing or assigned; finish its assignment before editing")
    try:
        db.commit()
    except IntegrityError:
        db.rollback(); raise HTTPException(409, "Resource name is already in use")
    return resource_json(db.get(ResponseResource, str(resource_id)))


def distance_km(lat1, lon1, lat2, lon2):
    y1, y2 = math.radians(lat1), math.radians(lat2)
    a = math.sin((y2-y1)/2)**2 + math.cos(y1)*math.cos(y2)*math.sin(math.radians(lon2-lon1)/2)**2
    return 6371.0088 * 2 * math.asin(math.sqrt(min(1, max(0, a))))


class AssignmentInput(BaseModel):
    capability: str = Field(default="inspection", pattern="^(inspection|fire_response|air_sampling)$")
    note: str = Field(min_length=5, max_length=1000)


@router.get("/events/{event_id}/assignments", dependencies=[Depends(operator)])
def assignments(event_id: int, db: Session = Depends(get_db)):
    return [assignment_json(r) for r in db.query(ResourceAssignment).filter_by(event_id=event_id).order_by(ResourceAssignment.created_at.desc())]


@router.post("/events/{event_id}/assignments", status_code=201, dependencies=[Depends(operator)])
def assign(event_id: int, body: AssignmentInput, db: Session = Depends(get_db)):
    event = db.get(PollutionEvent, event_id)
    if not event:
        raise HTTPException(404, "Event not found")
    candidates = []
    for resource in db.query(ResponseResource).filter_by(enabled=1, capability=body.capability, busy_assignment_id=None):
        distance = distance_km(event.lat, event.lon, resource.lat, resource.lon)
        if distance <= resource.service_radius_km:
            candidates.append((distance, resource.id, resource))
    for distance, _, resource in sorted(candidates):
        ident = str(uuid.uuid4())
        reserved = db.execute(update(ResponseResource).where(ResponseResource.id == resource.id,
            ResponseResource.busy_assignment_id.is_(None), ResponseResource.enabled == 1).values(busy_assignment_id=ident, updated_at=now())).rowcount
        if not reserved:
            continue
        row = ResourceAssignment(id=ident, event_id=event_id, active_event_id=event_id,
            resource_id=resource.id, resource_name=resource.name, status="assigned", distance_km=distance,
            note=body.note, audit=[{"status": "assigned", "at": now().isoformat(), "note": body.note}], created_at=now(), updated_at=now())
        try:
            db.add(row); db.commit(); db.refresh(row)
        except IntegrityError:
            db.rollback(); raise HTTPException(409, "Event already has an active assignment")
        return assignment_json(row)
    db.rollback()
    raise HTTPException(409, "No available resource with the requested capability and service radius")


class TransitionInput(BaseModel):
    status: str = Field(pattern="^(en_route|on_scene|completed|cancelled)$")
    note: str = Field(min_length=5, max_length=1000)


@router.post("/assignments/{assignment_id}/status", dependencies=[Depends(operator)])
def transition(assignment_id: uuid.UUID, body: TransitionInput, db: Session = Depends(get_db)):
    row = db.get(ResourceAssignment, str(assignment_id))
    if not row:
        raise HTTPException(404, "Assignment not found")
    allowed = {"assigned": {"en_route", "cancelled"}, "en_route": {"on_scene", "cancelled"}, "on_scene": {"completed", "cancelled"}}
    if body.status not in allowed.get(row.status, set()):
        raise HTTPException(409, "Invalid assignment status transition")
    terminal = body.status in ("completed", "cancelled")
    updated = db.execute(update(ResourceAssignment).where(ResourceAssignment.id == row.id, ResourceAssignment.status == row.status).values(
        status=body.status, updated_at=now(), active_event_id=None if terminal else row.event_id,
        audit=[*row.audit, {"status": body.status, "at": now().isoformat(), "note": body.note}])).rowcount
    if not updated:
        db.rollback(); raise HTTPException(409, "Assignment changed; refresh and retry")
    if terminal:
        db.execute(update(ResponseResource).where(ResponseResource.id == row.resource_id, ResponseResource.busy_assignment_id == row.id).values(busy_assignment_id=None, updated_at=now()))
    db.commit(); db.refresh(row)
    return assignment_json(row)
