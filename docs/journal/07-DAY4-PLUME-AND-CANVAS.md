# 🌬️ Step 4: Gaussian Plume Simulator & Weather Vector Canvas

> **Goal**: Predict where smoke/pollution will travel in the next 12-24 hours using advanced mathematical modeling, and render it in a highly-performant interactive map on the frontend.

---

## 1. Gaussian Plume Dispersion Model (Backend)

The core physics of AeroMesh resides in `backend/app/services/plume_model.py`. 
Instead of waiting for satellites to slowly image where smoke went, we *predict* where it is going immediately upon a fire's detection.

- **The Math**: We implemented a simplified Gaussian Plume dispersion equation. It takes the active fire's exact coordinates and the most recent `WeatherLog` (Planetary Boundary Layer Height and Wind Speed/Direction).
- **The Geometry**: Based on wind direction, we calculate a dispersion cone (a Shapely Polygon). Higher wind speeds create a narrower, further-reaching cone.
- **The Engine**: This logic is automatically triggered by our Evidence Fusion matrix. The polygon is converted to PostGIS geometry and saved directly to the database.

## 2. Dynamic Plume Overlays (API)

We exposed a new endpoint `/api/analysis/plume-forecast/{event_id}`.
- It pulls the PostGIS geometry and converts it into a standard GeoJSON `Feature` payload on the fly, ready for frontend consumption.

## 3. Map Component & Canvas 2D Particles (Frontend)

We began building the real frontend architecture for the Command Center in React.
- **Leaflet**: We integrated `react-leaflet` to render a dark-themed, high-contrast base map.
- **GeoJSON Overlays**: The map actively pulls our `plume_forecast` GeoJSON from the backend and renders it as an interactive red polygon layer.
- **Wind Vector Particles**: To give immediate visual feedback of weather dynamics, we built a raw HTML5 `<canvas>` layer that sits above the map. We wrote a custom particle animation engine that flows mocked wind particles across the screen, mimicking the backend's wind vectors!

*Day 4 is complete. The physics engine is running and visualizing beautifully. We are ready to move on to Day 5: Command Center UI & Mobile Portal.*
