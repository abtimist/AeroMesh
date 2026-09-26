import os
import re

def replace_in_file(filepath, replacements):
    try:
        with open(filepath, 'r') as f:
            content = f.read()
            
        for old, new in replacements:
            content = content.replace(old, new)
            
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated {filepath}")
    except Exception as e:
        print(f"Error {filepath}: {e}")

# data.py
replace_in_file('backend/app/api/endpoints/data.py', [
    ('from geoalchemy2.shape import to_shape\n', ''),
    ('geom = to_shape(s.location)', 'geom = None # location is lat/lon'),
    ('s.location', 's.lat, s.lon'),
    ('centroid = to_shape(e.centroid)', 'centroid = None'),
    ('e.centroid', 'e.lat, e.lon'),
    ('plume_shape = to_shape(e.plume_polygon)', 'plume_shape = None'),
    ('plume_geojson = shapely.geometry.mapping(plume_shape)', 'plume_geojson = e.plume_polygon'),
    ('"lat": geom.y,\n                "lon": geom.x', '"lat": s.lat,\n                "lon": s.lon'),
    ('"lat": centroid.y,\n                "lon": centroid.x', '"lat": e.lat,\n                "lon": e.lon')
])

# ingestion.py
replace_in_file('backend/app/api/endpoints/ingestion.py', [
    ('from geoalchemy2.shape import from_shape\n', ''),
    ('import shapely.geometry\n', ''),
    ('event.plume_polygon = from_shape(plume_poly, srid=4326)', 'event.plume_polygon = shapely.geometry.mapping(plume_poly) if plume_poly else None'),
])

# analysis.py
replace_in_file('backend/app/api/endpoints/analysis.py', [
    ('from geoalchemy2.shape import from_shape\n', ''),
    ('event.plume_polygon = from_shape(polygon, srid=4326)', 'event.plume_polygon = shapely.geometry.mapping(polygon)'),
])

# openaq_client.py
replace_in_file('backend/app/services/openaq_client.py', [
    ('from geoalchemy2.shape import from_shape\n', ''),
    ('from shapely.geometry import Point\n', ''),
    ('geom = from_shape(Point(lon, lat), srid=4326)', ''),
    ('location=geom', 'lat=lat, lon=lon')
])

# meteo_client.py
replace_in_file('backend/app/services/meteo_client.py', [
    ('from geoalchemy2.shape import from_shape\n', ''),
    ('from shapely.geometry import Point\n', ''),
    ('geom = from_shape(Point(lon, lat), srid=4326)', ''),
    ('location=geom', 'lat=lat, lon=lon')
])

# firms_client.py
replace_in_file('backend/app/services/firms_client.py', [
    ('from geoalchemy2.shape import from_shape\n', ''),
    ('from shapely.geometry import Point\n', ''),
    ('geom = from_shape(Point(lon, lat), srid=4326)', ''),
    ('centroid=geom', 'lat=lat, lon=lon')
])

# sentinel_mock.py
replace_in_file('backend/app/services/sentinel_mock.py', [
    ('from geoalchemy2.shape import to_shape\n', ''),
    ('centroid = to_shape(event.centroid)', ''),
    ('centroid.y', 'event.lat'),
    ('centroid.x', 'event.lon')
])

# plume_model.py
replace_in_file('backend/app/services/plume_model.py', [
    ('from geoalchemy2.shape import to_shape\n', ''),
    ('source_pt = to_shape(event.centroid)', ''),
    ('source_lat=source_pt.y', 'source_lat=event.lat'),
    ('source_lon=source_pt.x', 'source_lon=event.lon')
])
