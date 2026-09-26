from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from app.db.base_class import Base
from datetime import datetime, timezone

class CitizenReport(Base):
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(128))
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    image_url = Column(String(512), nullable=True) # Could be S3 link or local path
    laya_confidence_score = Column(Float, default=0.0)
    linked_event_id = Column(Integer, ForeignKey('pollution_event.id'), nullable=True)
    reported_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
