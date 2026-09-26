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
        Calculates a predicted plume cone using Pasquill-Gifford dispersion physics.
        Returns a Shapely Polygon representing the affected area.
        
        Args:
            source_lat: Source latitude
            source_lon: Source longitude
            wind_speed_ms: Wind speed in m/s
            wind_dir_deg: Wind direction (meteorological, where wind blows FROM)
            pblh: Planetary Boundary Layer Height (meters)
            distance_km: How far downwind to project the plume
        """
        travel_dir_deg = (wind_dir_deg + 180.0) % 360.0
        travel_dir_rad = math.radians(travel_dir_deg)
        
        # Determine Pasquill Stability Class (simplified based on wind speed)
        # A: Very unstable (<2 m/s), B: Unstable (2-3), C: Slightly unstable (3-5), D: Neutral (>5)
        # For this model, we'll use rural dispersion coefficients for Sigma Y (lateral dispersion)
        if wind_speed_ms < 2.0:
            c, d = 0.22, 0.0001   # Class A/B
        elif wind_speed_ms < 5.0:
            c, d = 0.11, 0.0001   # Class C
        else:
            c, d = 0.08, 0.0001   # Class D
            
        # Earth radius for coordinate offsets
        R = 6371.0 # km
        
        def project_point(lat, lon, distance, bearing_rad):
            lat_rad = math.radians(lat)
            lon_rad = math.radians(lon)
            new_lat_rad = math.asin(math.sin(lat_rad)*math.cos(distance/R) + 
                                    math.cos(lat_rad)*math.sin(distance/R)*math.cos(bearing_rad))
            new_lon_rad = lon_rad + math.atan2(math.sin(bearing_rad)*math.sin(distance/R)*math.cos(lat_rad),
                                               math.cos(distance/R)-math.sin(lat_rad)*math.sin(new_lat_rad))
            return (math.degrees(new_lon_rad), math.degrees(new_lat_rad))

        # Generate points along the centerline to create a smooth contoured polygon
        num_segments = 15
        left_edge = []
        right_edge = []
        
        for i in range(1, num_segments + 1):
            # Distance downwind in km
            x_km = (distance_km / num_segments) * i
            x_m = x_km * 1000.0
            
            # Calculate lateral dispersion (Sigma Y) in meters
            # sigma_y = c * x / sqrt(1 + d * x)
            sigma_y_m = (c * x_m) / math.sqrt(1.0 + d * x_m)
            
            # We plot the plume boundary at 2 standard deviations (95% of pollutant mass)
            spread_radius_km = (2.0 * sigma_y_m) / 1000.0
            
            # Find the center point at distance x_km
            center_pt = project_point(source_lat, source_lon, x_km, travel_dir_rad)
            
            # Find left and right points orthogonal to the travel direction
            orthogonal_angle_rad = travel_dir_rad + (math.pi / 2.0)
            
            right_pt = project_point(center_pt[1], center_pt[0], spread_radius_km, orthogonal_angle_rad)
            left_pt = project_point(center_pt[1], center_pt[0], spread_radius_km, orthogonal_angle_rad + math.pi)
            
            left_edge.append(left_pt)
            right_edge.append(right_pt)
            
        # Build polygon: Source -> Right Edge (outward) -> Left Edge (inward) -> Source
        coords = [(source_lon, source_lat)] + right_edge + list(reversed(left_edge)) + [(source_lon, source_lat)]
        
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
