# 🛰️ Step 2: Satellite Ingestion & Geospatial Indexing

> **Goal**: Ingest satellite active fire data, spatially link it to ground sensors, and build a mock parser for atmospheric overlays.

---

## 1. NASA FIRMS Pipeline (Task 2.1)

We implemented an asynchronous Python client (`firms_client.py`) to hit the NASA FIRMS REST API for Near-Real-Time active fire hotspots detected by the VIIRS and MODIS satellites. 
- **Parsing**: The API returns CSV format. We parse this in-memory and extract coordinates, time, confidence, and Fire Radiative Power (FRP).
- **Ingestion**: The coordinates are mapped into a PostGIS `Point` geometry, and we calculate a `severity` (e.g. CRITICAL) based on the FRP. It is saved directly to our `PollutionEvent` table.
- **Scheduling**: This was added to our APScheduler to run automatically every 3 hours in the background.

## 2. Geospatial Indexing (Task 2.2)

To fuse the ground data (OpenAQ) and satellite data (FIRMS), we need to know what sensors are near what fires. We created `spatial_indexer.py`.
- **Methodology**: Instead of calculating math in Python (which is slow for millions of points), we use **GeoAlchemy2** and PostGIS `ST_DistanceSphere`. 
- **Execution**: The database itself handles the spatial math at lightning speed, returning a list of sensors within a specified radius (e.g., 50km) of an active fire hotspot. This is exposed on the `/api/analysis/` endpoints.

## 3. Mock Sentinel-5P Parser (Task 2.3)

Real-time fetching and rendering of heavy Sentinel-5P NetCDF files is too heavy for a rapid early-warning system. We built a mock parser (`sentinel_mock.py`).
- **How it works**: It takes an active `PollutionEvent` and generates concentric GeoJSON buffer circles (polygons) around the fire to simulate an NO2/SO2 pollutant plume heatmap.
- **Purpose**: This GeoJSON payload will be served directly to the React frontend to overlay visually impressive heatmaps on top of the Leaflet map, without crippling the backend. 

*Day 2 is complete. We are now ready to begin Day 3: Computer Vision & Local Decision Engine.*
