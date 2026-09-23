from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry

from app.db.base_class import Base

class Sensor(Base):
    """
    Metadata for static air quality monitoring stations.
    """
    id = Column(Integer, primary_key=True, index=True)
    # The OpenAQ location ID or custom ID
    provider_id = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    location = Column(Geometry(geometry_type='POINT', srid=4326), nullable=False)
    provider = Column(String(64), nullable=False) # e.g., 'openaq', 'cpcb'
    
    measurements = relationship("Measurement", back_populates="sensor", cascade="all, delete-orphan")

class Measurement(Base):
    """
    Time-series readings from sensors, using an EAV pattern to handle varied pollutants.
    """
    id = Column(Integer, primary_key=True, index=True)
    sensor_id = Column(Integer, ForeignKey("sensor.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    parameter = Column(String(32), nullable=False, index=True) # e.g., 'pm25', 'pm10', 'no2'
    value = Column(Float, nullable=False)
    
    sensor = relationship("Sensor", back_populates="measurements")

# Create composite index for time-series querying
Index('idx_measurement_sensor_time', Measurement.sensor_id, Measurement.timestamp)
