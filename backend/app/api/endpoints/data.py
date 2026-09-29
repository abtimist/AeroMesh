from datetime import datetime, timedelta, timezone
import json
from typing import Literal
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.sensor import Sensor, Measurement
from app.models.event import PollutionEvent
from app.models.forecast import MeasurementEvidence, ForecastSnapshot
from app.core.regions import regional_query
from app.core.cache import observations_cache

router = APIRouter()
Node = Literal["india", "brazil", "china", "south-africa", "all"]

def utc_iso(value):
    return value.replace(tzinfo=value.tzinfo or timezone.utc).astimezone(timezone.utc).isoformat() if value else None

def sensor_records(db, node=None):
    # Indexed top-one lookup per station, executed in ONE SQL statement.
    latest_id = db.query(Measurement.id).filter(
        Measurement.sensor_id == Sensor.id, Measurement.parameter == "pm25"
    ).order_by(Measurement.timestamp.desc(), Measurement.id.desc()).limit(1).correlate(Sensor).scalar_subquery()
    query = db.query(Sensor, Measurement.value, Measurement.timestamp, MeasurementEvidence.source).outerjoin(Measurement, Measurement.id == latest_id).outerjoin(MeasurementEvidence, MeasurementEvidence.measurement_id == Measurement.id).filter(~Sensor.provider_id.startswith("mock_"))
    rows = regional_query(query, Sensor, node).order_by(Sensor.id).all()
    return [{"id": s.id, "provider_id": s.provider_id, "name": s.name,
             "lat": s.lat, "lon": s.lon, "pm25": value, "location": s.name,
             "source": source or s.provider, "kind": "observation", "units": "µg/m³",
             "provenance_status": "verified" if source else "unverified",
             "status": ("unavailable" if value is None else "stale" if timestamp and
                        datetime.now(timezone.utc) - timestamp.replace(tzinfo=timestamp.tzinfo or timezone.utc) > timedelta(hours=6)
                        else "available"),
             "timestamp": utc_iso(timestamp)} for s, value, timestamp, source in rows]

def event_record(row):
    return {"id": row.id, "event_type": row.event_type, "severity": row.severity,
            "lat": row.lat, "lon": row.lon, "detected_at": utc_iso(row.detected_at),
            "kind": "observation", "source": "Unverified legacy record",
            "provenance_status": "unverified", "status": row.status}

def event_records(db, node=None):
    # Legacy geometry/confidence is not selected or presented as evidence.
    query = db.query(PollutionEvent.id, PollutionEvent.event_type, PollutionEvent.severity,
                     PollutionEvent.lat, PollutionEvent.lon, PollutionEvent.detected_at, PollutionEvent.status)
    query = regional_query(query.filter(PollutionEvent.status == "ACTIVE"), PollutionEvent, node)
    rows = query.order_by(PollutionEvent.detected_at.desc(), PollutionEvent.id.desc()).all()
    from app.models.forecast import FireEvidence
    evidence = {e.event_id: e for e in db.query(FireEvidence).all()}
    result = []
    for row in rows:
        item = event_record(row)
        if row.id in evidence:
            item.update(source=evidence[row.id].source, provenance_status="verified")
        result.append(item)
    return result

def cached_response(key, factory):
    content = observations_cache.get_or_create(key, lambda: json.dumps(factory(), ensure_ascii=False, allow_nan=False, separators=(",", ":")))
    return Response(content, media_type="application/json", headers={"Cache-Control": "private, max-age=15"})

@router.get("/sensors")
def get_sensors(node: Node | None = None, db: Session = Depends(get_db)):
    return cached_response(("sensors", node), lambda: sensor_records(db, node))

@router.get("/providers/openaq")
def openaq_health(db: Session = Depends(get_db)):
    row = db.get(ForecastSnapshot, "openaq:health")
    return row.payload if row else {"status": "not_checked", "source": "OpenAQ v3"}

@router.get("/events")
def get_events(node: Node | None = None, db: Session = Depends(get_db)):
    return cached_response(("events", node), lambda: event_records(db, node))
