import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

export default function AQHeatmapLayer({ data }) {
  const map = useMap();
  
  useEffect(() => {
    if (!data || data.length === 0) return;
    
    // Map AQI to intensity points
    const points = data.map(p => [p.lat, p.lon, p.us_aqi || p.pm2_5 || 0]);
    
    // Gradient matching standard AQI colors
    const gradient = {
      0.1: '#22c55e',  // Good
      0.3: '#eab308',  // Moderate
      0.5: '#f97316',  // Unhealthy for Sensitive Groups
      0.7: '#ef4444',  // Unhealthy
      0.9: '#a855f7'   // Very Unhealthy
    };

    const heatLayer = L.heatLayer(points, {
      radius: 80,       // Large radius to interpolate across the coarse grid
      blur: 50,         // High blur for smooth transitions
      maxZoom: 8,       // Zoom level where points reach max radius
      max: 200,         // Scale intensity relative to 200 AQI
      gradient: gradient
    }).addTo(map);

    return () => {
      if (map.hasLayer(heatLayer)) {
        map.removeLayer(heatLayer);
      }
    };
  }, [map, data]);

  return null;
}
