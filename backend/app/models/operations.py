"""New additive tables; existing citizen-report data is not destructively migrated."""
from sqlalchemy import Column, String, Float, Integer, DateTime, JSON, ForeignKey
from app.db.base_class import Base


class PhotoReport(Base):
    id = Column(String(36), primary_key=True)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    location_source = Column(String(16), nullable=False)
    accuracy_m = Column(Float)
    description = Column(String(1000), nullable=False)
    image_path = Column(String(512), nullable=False)
    image_sha256 = Column(String(64), nullable=False)
    status = Column(String(20), nullable=False, index=True)
    result = Column(JSON)
    error = Column(String(300))
    event_id = Column(Integer, ForeignKey("pollution_event.id"))
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)


class ResponseResource(Base):
    id = Column(String(36), primary_key=True)
    name = Column(String(120), nullable=False, unique=True)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    capability = Column(String(32), nullable=False)
    service_radius_km = Column(Float, nullable=False)
    enabled = Column(Integer, nullable=False, default=1)
    busy_assignment_id = Column(String(36), unique=True)
    updated_at = Column(DateTime(timezone=True), nullable=False)


class ResourceAssignment(Base):
    id = Column(String(36), primary_key=True)
    event_id = Column(Integer, ForeignKey("pollution_event.id"), nullable=False, index=True)
    # One active assignment per event; NULL releases the uniqueness reservation.
    active_event_id = Column(Integer, unique=True)
    resource_id = Column(String(36), ForeignKey("response_resource.id"), nullable=False)
    resource_name = Column(String(120), nullable=False)
    status = Column(String(20), nullable=False)
    distance_km = Column(Float, nullable=False)
    note = Column(String(1000), nullable=False)
    audit = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)
