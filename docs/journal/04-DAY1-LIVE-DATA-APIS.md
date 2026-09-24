# 🛠️ Step 1.3: Live Data API Connectors

> **Goal**: Connect the backend to our live data sources (OpenAQ v3 and Open-Meteo) and build a scheduler to automate ingestion.

---

## 1. Background Schedulers vs. REST Routes

We had two options for triggering data ingestion:
1. Wait for a user to press a button in the frontend (REST route).
2. Have the server automatically pull data in the background (Scheduler).

Since this is an automated early-warning system, we built **both**. We added REST endpoints (`/api/ingestion/openaq`) for manual testing, but we also integrated **APScheduler**.

When the FastAPI server starts up, it uses a `lifespan` context manager to boot up APScheduler, which runs the fetching functions every 60 minutes.

## 2. OpenAQ v3 Client

In `backend/app/services/openaq_client.py`, we implemented the logic to talk to the OpenAQ API using `httpx` (an asynchronous HTTP client).

1. **`fetch_locations_in_bbox()`**: Queries a geographical bounding box (e.g., Northern India) for ground sensors and inserts them into our `Sensor` PostGIS table.
2. **`sync_latest_measurements()`**: Loops over our saved sensors and hits the `/v3/sensors/{id}/measurements` endpoint. The data is carefully parsed into our resilient Entity-Attribute-Value (EAV) `Measurement` table.

## 3. Open-Meteo Client

In `backend/app/services/meteo_client.py`, we fetch crucial meteorological data.
We call the `https://api.open-meteo.com/v1/forecast` endpoint for `wind_speed_10m`, `wind_direction_10m`, and `boundary_layer_height`. 

Because Open-Meteo returns a time-series forecast array for the next several hours, we wrote Python logic to extract *only* the current hour's UTC data, and then inserted it into the `WeatherLog` table.

## 4. Next Steps

With the live data flowing into our geospatial database, we are ready for **Day 2: Satellite Ingestion & Geospatial Indexing**, where we will integrate NASA FIRMS fire hotspots and pair them with this weather data.
