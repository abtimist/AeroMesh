import math
from typing import Dict, Any
from app.db.session import SessionLocal
from app.models.event import PollutionEvent
from shapely.geometry import mapping

class Sentinel5PMockParser:
    @staticmethod
    def generate_mock_overlay(event_id: int) -> Dict[str, Any]:
        """
        Generates a mock GeoJSON FeatureCollection representing Sentinel-5P 
        NO2/SO2 pollutant overlays for a given fire hotspot.
        """
        db = SessionLocal()
        try:
            event = db.query(PollutionEvent).filter(PollutionEvent.id == event_id).first()
            if not event:
                return {"type": "FeatureCollection", "features": []}
                
            # Convert PostGIS geometry to Shapely Point
            
            
            features = []
            
            # Generate a few concentric circles (or ellipses) to simulate a heatmap
            # We'll use buffer with simple degrees (approximate)
            # 1 degree is roughly 111 km. Let's make the plume size scale with severity.
            base_radius_deg = 0.05
            if event.severity == "CRITICAL":
                base_radius_deg = 0.2
            elif event.severity == "HIGH":
                base_radius_deg = 0.15
            elif event.severity == "MEDIUM":
                base_radius_deg = 0.1
                
            for step, concentration in enumerate(["High", "Medium", "Low"]):
                # Increase radius for lower concentrations
                radius = base_radius_deg * (step + 1)
                
                # Mock a plume by shifting the center slightly (simulating wind effect)
                # In a real model, we'd use Gaussian Plume. Here we just shift the center east.
                shift_lon = event.lon + (radius * 0.5)
                shift_lat = event.lat
                
                from shapely.geometry import Point
                plume_poly = Point(shift_lon, shift_lat).buffer(radius)
                
                feature = {
                    "type": "Feature",
                    "geometry": mapping(plume_poly),
                    "properties": {
                        "pollutant": "NO2",
                        "concentration_level": concentration,
                        "source_event_id": event.id,
                        "severity": event.severity
                    }
                }
                features.append(feature)
                
            return {
                "type": "FeatureCollection",
                "features": features
            }
        except Exception as e:
            return {"type": "FeatureCollection", "features": [], "error": str(e)}
        finally:
            db.close()
