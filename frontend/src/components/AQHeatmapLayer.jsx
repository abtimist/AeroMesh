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
      radius: 65,       // Balanced radius for continuous field without blowing out
      blur: 45,         // Balanced blur to keep contours recognizable

      maxZoom: 6,       
      max: 150,         // Scale intensity relative to 150 AQI
      minOpacity: 0.15, // Make low values slightly transparent
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
