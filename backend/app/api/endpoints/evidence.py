from datetime import timedelta
import math
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.event import PollutionEvent
from app.models.forecast import FireEvidence, DispersionRun
from app.models.forecast import MeasurementEvidence
from app.models.sensor import Sensor, Measurement
from app.services.spatial_indexer import haversine
from app.api.endpoints.data import utc_iso
from app.services import satellite

router = APIRouter()

def require_event(db, event_id):
    event = db.get(PollutionEvent, event_id)
    if not event:
        raise HTTPException(404, "Event not found")
    return event

def nearby_measurements(db, event):
    latest = db.query(Measurement.id).filter(
        Measurement.sensor_id == Sensor.id, Measurement.parameter == "pm25",
        Measurement.timestamp <= event.detected_at,
        Measurement.timestamp >= event.detected_at - timedelta(hours=6),
    ).order_by(Measurement.timestamp.desc(), Measurement.id.desc()).limit(1).correlate(Sensor).scalar_subquery()
    lon_radius = min(180, 50 / (111 * max(0.01, math.cos(math.radians(event.lat)))))
    query = db.query(Sensor, Measurement.value, Measurement.timestamp, MeasurementEvidence.source).join(Measurement, Measurement.id == latest).outerjoin(MeasurementEvidence, MeasurementEvidence.measurement_id == Measurement.id)
    query = query.filter(Sensor.lat.between(event.lat - 0.46, event.lat + 0.46),
                         Sensor.lon.between(event.lon - lon_radius, event.lon + lon_radius), ~Sensor.provider_id.startswith("mock_"))
    readings = []
    for station, value, when, source in query:
        distance = haversine(event.lat, event.lon, station.lat, station.lon) / 1000
        if distance <= 50:
            readings.append({"station": station.name, "pm25": value, "units": "µg/m³", "observed_at": utc_iso(when),
                "distance_km": round(distance, 2), "source": source or station.provider,
                "provenance_status": "verified" if source else "unverified"})
    return sorted(readings, key=lambda r: r["distance_km"])[:5]

@router.get("/{event_id}")
def evidence(event_id: int, db: Session = Depends(get_db)):
    event = require_event(db, event_id)
    fire = db.get(FireEvidence, event_id)
    runs = db.query(DispersionRun).filter(DispersionRun.event_id == event_id).order_by(DispersionRun.created_at.desc()).limit(10).all()
    return {"event_id": event.id, "lat": event.lat, "lon": event.lon,
        "observed_at": utc_iso(event.detected_at), "event_type": event.event_type,
        "fire": {"status": "available" if fire else "unavailable",
                 "source": fire.source if fire else "Citizen photo / local classifier (unverified)" if event.event_type.startswith("citizen_") else None,
                 "frp_mw": fire.frp_mw if fire else None,
                 "confidence_category": fire.confidence if fire else None,
                 "satellite": fire.satellite if fire else None,
                 "instrument": fire.instrument if fire else None,
                 "note": None if fire else "Local photo classification requires human review; it is not satellite confirmation." if event.event_type.startswith("citizen_") else "This legacy record has no verified upstream evidence."},
        "satellite": satellite.metadata(event),
        "nearby_measurements": nearby_measurements(db, event),
        "dispersion_runs": [{"id": r.id, "status": r.status, "created_at": utc_iso(r.created_at), "error": r.error} for r in runs],
        "sensor_anomaly": {"status": "unavailable", "reason": "No validated baseline analysis is associated with this event."},
        "dispatch": {"status": "available", "mode": "dispatch_simulation", "external_agency_contacted": False,
                     "assignments_url": f"/api/citizen/events/{event.id}/assignments"}}

@router.get("/{event_id}/satellite.png")
async def satellite_image(event_id: int, db: Session = Depends(get_db)):
    event = require_event(db, event_id)
    # Release the DB connection before waiting for satellite network I/O.
    lat, lon, day = event.lat, event.lon, event.detected_at.date().isoformat()
    db.close()
    content = await satellite.fetch_image(lat, lon, day)
    if not content:
        raise HTTPException(404, "Imagery unavailable for this location and date")
    return Response(content, media_type="image/png", headers={"Cache-Control": "public, max-age=3600", "X-Imagery-Date": day})
