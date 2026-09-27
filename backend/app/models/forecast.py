from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, ForeignKey
from app.db.base_class import Base

class ForecastSnapshot(Base):
    key = Column(String(120), primary_key=True)
    fetched_at = Column(DateTime(timezone=True), nullable=False)
    payload = Column(JSON, nullable=False)

class FireEvidence(Base):
    event_id = Column(Integer, ForeignKey("pollution_event.id"), primary_key=True)
    source = Column(String(100), nullable=False)
    frp_mw = Column(Float, nullable=True)
    confidence = Column(String(20), nullable=True)
    satellite = Column(String(64), nullable=True)
    instrument = Column(String(64), nullable=True)
    fetched_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class MeasurementEvidence(Base):
    measurement_id = Column(Integer, ForeignKey("measurement.id"), primary_key=True)
    source = Column(String(100), nullable=False)
    upstream_sensor_id = Column(String(64), nullable=False)

class DispersionRun(Base):
    id = Column(String(36), primary_key=True)
    event_id = Column(Integer, ForeignKey("pollution_event.id"), nullable=False, index=True)
    status = Column(String(32), nullable=False, index=True)
    remote_id = Column(String(36), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)
    request = Column(JSON, nullable=False)
    result = Column(JSON, nullable=True)
    error = Column(String(500), nullable=True)
