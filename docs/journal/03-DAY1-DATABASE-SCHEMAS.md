# 🛠️ Step 1.2: Database Schemas & Models

> **Goal**: Define the core database structure for AeroMesh using PostgreSQL, PostGIS (for geospatial queries), SQLAlchemy, and GeoAlchemy2.

---

## 1. Why We Needed This Structure

Before we can ingest live data from OpenAQ, Open-Meteo, or NASA FIRMS, we need a place to put it. Because AeroMesh relies heavily on geospatial operations (e.g., "Is this plume inside this inspector's jurisdiction?"), standard databases aren't enough. 

We used **PostGIS**, which adds spatial data types like `Point` and `Polygon` to PostgreSQL. To interface with it from Python, we used **SQLAlchemy** (the standard ORM) and **GeoAlchemy2** (an extension for PostGIS).

## 2. API Schema Analysis

Before writing the tables, we analyzed the APIs we'd be consuming to ensure a perfect fit:
- **OpenAQ v3**: Returns `Locations` (metadata) and `Measurements` (readings).
- **Open-Meteo**: Returns hourly weather variables like wind and boundary layer height.
- **NASA FIRMS**: Returns CSVs of fire hotspots (lat/lon points).

## 3. The Core Models

We split the models into focused files inside `backend/app/models/`:

### `Sensor` and `Measurement` (sensor.py)
Instead of hardcoding columns like `pm25` and `no2`, we used an **EAV (Entity-Attribute-Value)** pattern for measurements. 
* **Sensor**: Stores static metadata (`provider_id`, `name`, `location`).
* **Measurement**: Stores `sensor_id`, `timestamp`, `parameter` (e.g., 'pm25'), and `value`. This makes the system resilient if OpenAQ introduces a new pollutant type.

### `WeatherLog` (weather.py)
Stores the meteorological vectors essential for our Gaussian plume modeling later.
* **Fields**: `location` (Point), `timestamp`, `wind_speed`, `wind_direction`, and `pblh` (Planetary Boundary Layer Height).

### `PollutionEvent` (event.py)
The central entity for our crisis response.
* **Fields**: Stores a `centroid` (Point) for the origin of the hotspot (from NASA FIRMS) and a `plume_polygon` (Polygon) for where the smoke is forecasted to travel.

### `InspectorJurisdiction` (jurisdiction.py)
Stores the regional boundaries of response teams.
* **Fields**: `assigned_zone` (Polygon). We will use PostGIS queries like `ST_Contains` to automatically route alerts to the right inspector based on where a plume is located.

## 4. Verification

We created a simple test script to compile the Python models into SQL (Data Definition Language). This verified that all models translate into valid PostgreSQL syntax with the correct PostGIS geometries (e.g., `geometry(POINT, 4326)`) and foreign key relationships, proving our database foundation is rock solid and ready for data ingestion.
