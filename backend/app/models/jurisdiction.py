from sqlalchemy import Column, Integer, String, Boolean, Index
from geoalchemy2 import Geometry

from app.db.base_class import Base

class InspectorJurisdiction(Base):
    """
    Stores regional response teams and their geographical zones.
    Used to route alerts via PostGIS ST_Contains queries.
    """
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    phone_number = Column(String(32), nullable=False)
    whatsapp_id = Column(String(64), nullable=True)
    
    # The geographical boundaries of their jurisdiction
    assigned_zone = Column(Geometry(geometry_type='POLYGON', srid=4326), nullable=False)
    
    active_status = Column(Boolean, default=True, index=True)
