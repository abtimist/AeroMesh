import math
from typing import List, Tuple
from shapely.geometry import Polygon
from app.models.event import PollutionEvent
from app.models.weather import WeatherLog
import logging

logger = logging.getLogger(__name__)

class GaussianPlumeModel:
    """
    Implements a simplified Gaussian Plume Dispersion model to predict 
    the spatial spread of pollution downwind from a source.
    """
    
    @staticmethod
    def calculate_plume_polygon(source_lat: float, source_lon: float, 
                                wind_speed_ms: float, wind_dir_deg: float, 
                                pblh: float, distance_km: float = 50.0) -> Polygon:
        """
        Calculates a predicted plume cone based on wind parameters.
        Returns a Shapely Polygon representing the affected area.
        
        Args:
            source_lat: Source latitude
            source_lon: Source longitude
            wind_speed_ms: Wind speed in m/s
            wind_dir_deg: Wind direction (meteorological, where wind blows FROM)
            pblh: Planetary Boundary Layer Height (meters)
            distance_km: How far downwind to project the plume
        """
        # Wind direction represents where the wind is coming FROM.
        # Plume moves TOWARDS (wind_dir_deg + 180) % 360
        travel_dir_deg = (wind_dir_deg + 180.0) % 360.0
        travel_dir_rad = math.radians(travel_dir_deg)
        
        # Base spread angle of the plume (simplified Pasquill-Gifford approximation)
        # Higher wind speed = narrower plume.
        spread_angle_deg = max(10.0, 45.0 - (wind_speed_ms * 2.0))
        half_spread_rad = math.radians(spread_angle_deg / 2.0)
        
        # Earth radius for coordinate offsets
        R = 6371.0 # km
        
        # Calculate left and right boundary points at max distance
        left_angle_rad = travel_dir_rad - half_spread_rad
        right_angle_rad = travel_dir_rad + half_spread_rad
        
        def project_point(lat, lon, distance, bearing_rad):
            lat_rad = math.radians(lat)
            lon_rad = math.radians(lon)
            
            new_lat_rad = math.asin(math.sin(lat_rad)*math.cos(distance/R) + 
                                    math.cos(lat_rad)*math.sin(distance/R)*math.cos(bearing_rad))
            
            new_lon_rad = lon_rad + math.atan2(math.sin(bearing_rad)*math.sin(distance/R)*math.cos(lat_rad),
                                               math.cos(distance/R)-math.sin(lat_rad)*math.sin(new_lat_rad))
            
            return (math.degrees(new_lon_rad), math.degrees(new_lat_rad))
            
        left_point = project_point(source_lat, source_lon, distance_km, left_angle_rad)
        right_point = project_point(source_lat, source_lon, distance_km, right_angle_rad)
        center_point = project_point(source_lat, source_lon, distance_km, travel_dir_rad)
        
        # Build the polygon: Source -> Right Edge -> Center Edge -> Left Edge -> Source
        # Adding a slight curve using center point for better visual aesthetics
        coords = [
            (source_lon, source_lat),
            right_point,
            center_point,
            left_point,
            (source_lon, source_lat)
        ]
        
        return Polygon(coords)

    @staticmethod
    def generate_forecast(event: PollutionEvent, weather: WeatherLog) -> Polygon:
        """
        Takes database model instances and returns the Shapely polygon geometry.
        """
        
        
        # Default fallback values if weather is missing
        wind_speed = weather.wind_speed_ms if weather else 5.0
        wind_dir = weather.wind_direction_deg if weather else 90.0
        pblh = weather.pblh_m if weather else 1000.0
        
        # Calculate severity based spread
        dist_km = 30.0
        if event.severity == 'CRITICAL':
            dist_km = 100.0
        elif event.severity == 'HIGH':
            dist_km = 60.0
            
        return GaussianPlumeModel.calculate_plume_polygon(
            source_lat=event.lat,
            source_lon=event.lon,
            wind_speed_ms=wind_speed,
            wind_dir_deg=wind_dir,
            pblh=pblh,
            distance_km=dist_km
        )
