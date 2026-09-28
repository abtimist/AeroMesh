# Task 03: Wind Animation Performance Fix

## Issue Description
The current wind animation layer (implemented in `frontend/src/components/WindVelocityLayer.jsx` using `leaflet-velocity`) is causing severe performance issues. 
When the wind layer is enabled, the browser uses excessive CPU/GPU, causing the user's computer fan to speed up and leading to significant lag in the frontend.

Previously, `leaflet-velocity` was configured to pause rendering during map pan/zoom (`dragstart`/`zoomstart`). This was temporarily bypassed to make the wind animation "continuous", but this bypass seems to have exacerbated the lag and heavy background rendering.

## Requirements for Codex
1. **Performance Optimization:** We need a highly performant alternative for the wind animation. Investigate whether we can optimize `leaflet-velocity`, or completely replace it with a modern, hardware-accelerated WebGL approach (such as `leaflet-webgl-wind`, `windy.js` variants, or raw Canvas optimizations).
2. **Smooth Panning:** The wind animation should ideally continue flowing smoothly when the user pans or zooms, without freezing the map or causing the browser to stutter.
3. **Data Accuracy Check:** Verify that the wind vector data being fed to the plugin is accurate, properly mapped to the grid, and correctly integrated with the Leaflet map's coordinate system. Ensure the visual representation matches standard meteorological wind maps.

## Relevant Files
- `frontend/src/components/WindVelocityLayer.jsx`
- `backend/app/services/forecast_service.py` (provides the weather/wind data)

Please prioritize reducing the computational overhead while maintaining a smooth, continuous wind animation.
