from datetime import datetime, timedelta, timezone
import secrets
import uuid
from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Response
from pydantic import AwareDatetime, BaseModel, Field, model_validator
from sqlalchemy.orm import Session
from app.api.endpoints.data import Node, utc_iso
from app.api.endpoints.evidence import require_event
from app.core.config import settings
from app.core.regions import regional_query
from app.db.session import get_db
from app.models.event import PollutionEvent
from app.models.forecast import DispersionRun
from app.services.hysplit import hysplit_worker, ready_payload, ACTIVE
from app.services.demo import demo_metadata, demo_frame

router = APIRouter()

@router.get("/demo")
def historical_demo():
    return demo_metadata()

@router.get("/demo/frames/{index}")
def historical_demo_frame(index: int):
    try:
        return Response(demo_frame(index), media_type="application/geo+json", headers={"Cache-Control": "public, max-age=86400"})
    except IndexError:
        raise HTTPException(404, "Demo frame not found")

class RunRequest(BaseModel):
    start_at: AwareDatetime
    release_bottom_m: int = Field(ge=0, le=10000)
    release_top_m: int = Field(gt=0, le=10000)
    release_duration_minutes: int = Field(gt=0, le=1440)
    duration_hours: int = Field(ge=1, le=24)
    averaged_layer_top_m: int = Field(ge=100, le=10000)
    assumptions: str = Field(min_length=10, max_length=1000)

    @model_validator(mode="after")
    def check_release(self):
        if self.release_bottom_m >= self.release_top_m:
            raise ValueError("Release top must be above its bottom")
        if self.release_duration_minutes > self.duration_hours * 60:
            raise ValueError("Release cannot outlast the simulation")
        return self

@router.get("/status")
def model_status():
    enabled = bool(settings.HYSPLIT_AUTH_HEADERS and settings.MODEL_OPERATOR_TOKEN)
    return {"status": "configured" if enabled else "unavailable", "source": "NOAA HYSPLIT / READY",
            "demo_status": "available", "demo_url": "/api/dispersion/demo",
            "quantity": "relative_dispersion", "poll_interval_seconds": max(60, settings.HYSPLIT_POLL_SECONDS),
            "message": "READY is configured; model runs require explicit release assumptions." if enabled else "HYSPLIT needs approved NOAA authentication and a model operator token in the backend environment.",
            "requirements": ["NOAA-approved READY credentials and authentication instructions", "Release height and duration assumptions"],
            "limitation": "Generic unit-release dispersion; not estimated PM2.5 concentration or a surface exposure measurement."}

@router.post("/events/{event_id}/runs", status_code=202)
def create_run(event_id: int, request: RunRequest, tasks: BackgroundTasks,
               x_operator_token: str | None = Header(None), db: Session = Depends(get_db)):
    if not settings.MODEL_OPERATOR_TOKEN or not x_operator_token or not secrets.compare_digest(x_operator_token, settings.MODEL_OPERATOR_TOKEN):
        raise HTTPException(403, "A valid model operator token is required")
    if not settings.HYSPLIT_AUTH_HEADERS:
        raise HTTPException(503, "NOAA READY authentication is not configured")
    now = datetime.now(timezone.utc)
    if not now - timedelta(hours=6) <= request.start_at <= now + timedelta(hours=48):
        raise HTTPException(422, "This forecast adapter accepts starts from 6 hours ago through 48 hours ahead; historical events need an explicit current release scenario.")
    event = require_event(db, event_id)
    active = db.query(DispersionRun).filter(DispersionRun.event_id == event_id, DispersionRun.status.in_((*ACTIVE, "SUBMITTING"))).first()
    if active:
        raise HTTPException(409, f"Event already has active run {active.id}")
    run_id = str(uuid.uuid4())
    inputs = request.model_dump(mode="json")
    payload = ready_payload(event, inputs)
    db.add(DispersionRun(id=run_id, event_id=event_id, status="SUBMITTING", created_at=now, updated_at=now,
                         request={**inputs, "provider_payload": payload, "quantity": "relative_dispersion"}))
    db.commit()
    tasks.add_task(hysplit_worker.submit, run_id, payload)
    return {"id": run_id, "status": "SUBMITTING", "quantity": "relative_dispersion"}

@router.get("/runs/{run_id}")
def get_run(run_id: uuid.UUID, db: Session = Depends(get_db)):
    row = db.get(DispersionRun, str(run_id))
    if not row:
        raise HTTPException(404, "Model run not found")
    return {"id": row.id, "event_id": row.event_id, "status": row.status,
            "created_at": utc_iso(row.created_at), "updated_at": utc_iso(row.updated_at),
            "request": row.request, "error": row.error, "result": row.result}

@router.get("/contours")
def contours(node: Node = "india", db: Session = Depends(get_db)):
    query = db.query(DispersionRun).join(PollutionEvent, PollutionEvent.id == DispersionRun.event_id)
    query = regional_query(query.filter(DispersionRun.status == "COMPLETED"), PollutionEvent, node)
    features, seen = [], set()
    for row in query.order_by(DispersionRun.created_at.desc()):
        if row.event_id in seen:
            continue
        seen.add(row.event_id)
        for feature in (row.result or {}).get("features", []):
            features.append({**feature, "properties": {**feature["properties"], "event_id": row.event_id,
                "averaged_layer_top_m": row.request["averaged_layer_top_m"], "assumptions": row.request["assumptions"]}})
    return {"type": "FeatureCollection", "features": features,
            "status": "available" if features else "unavailable", "source": "NOAA HYSPLIT / READY"}
