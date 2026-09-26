from sqlalchemy import Column, Integer, Float, DateTime, Index

from app.db.base_class import Base

class WeatherLog(Base):
    """
    Meteorological data needed for dispersion modeling.
    Mapped to Open-Meteo hourly response.
    """
    id = Column(Integer, primary_key=True, index=True)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    
    # Weather Vectors
    wind_speed = Column(Float, nullable=False) # km/h or m/s based on API config
    wind_direction = Column(Float, nullable=False) # Degrees (0-360)
    pblh = Column(Float, nullable=False) # Planetary Boundary Layer Height (meters)
    
# Create a spatial index and a time index
Index('idx_weather_log_time', WeatherLog.timestamp)
