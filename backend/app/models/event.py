from sqlalchemy import Column, Integer, String, Float, DateTime, Index
from geoalchemy2 import Geometry

from app.db.base_class import Base

class PollutionEvent(Base):
    """
    Tracks detected hotspots and plume forecasts.
    Driven by NASA FIRMS hotspots and Citizen reports.
    """
    id = Column(Integer, primary_key=True, index=True)
    origin_country = Column(String(4), nullable=False) # ISO country code
    event_type = Column(String(64), nullable=False) # e.g., 'biomass_burning', 'industrial_emission'
    
    # Core hotspot location
    centroid = Column(Geometry(geometry_type='POINT', srid=4326), nullable=False)
    
    # Metadata
    severity = Column(String(16), nullable=False, index=True) # 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    confidence_score = Column(Float, nullable=False) # NASA FIRMS confidence or AI fusion score
    detected_at = Column(DateTime(timezone=True), nullable=False, index=True)
    
    # Plume Dispersion
    plume_polygon = Column(Geometry(geometry_type='POLYGON', srid=4326), nullable=True)
    predicted_vector_deg = Column(Float, nullable=True)
    
    status = Column(String(32), default='ACTIVE', index=True) # 'ACTIVE', 'MITIGATED', 'RESOLVED'

# Spatial Index created automatically by GeoAlchemy2 on the Geometry columns
Index('idx_pollution_event_status_time', PollutionEvent.status, PollutionEvent.detected_at)
