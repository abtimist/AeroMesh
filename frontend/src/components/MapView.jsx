// MapView — full-bleed Leaflet map with all layer overlays
// AQI-colored sensor markers, plume polygon, fire hotspots, Leaflet wind arrows
// No Canvas animation (rejected in design system Section 11)

import { useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import KPIStrip from './KPIStrip';
import LayerControl from './LayerControl';
import AlertPanel from './AlertPanel';

// AQI level → map marker color
const AQI_COLORS = {
  GOOD: '#00e400', MODERATE: '#ffff00', USG: '#ff7e00',
  UNHEALTHY: '#ff0000', VERY_UNHEALTHY: '#8f3f97', HAZARDOUS: '#7e0023',
};

// Mock sensor data scattered around Delhi NCR
const MOCK_SENSORS = [
  { id: 1, lat: 28.70, lon: 77.10, pm25: 45,  aqiLevel: 'GOOD',           location: 'Delhi (Rohini)' },
  { id: 2, lat: 28.65, lon: 77.23, pm25: 88,  aqiLevel: 'MODERATE',       location: 'Delhi (Karol Bagh)' },
  { id: 3, lat: 28.55, lon: 77.25, pm25: 198, aqiLevel: 'UNHEALTHY',      location: 'Delhi (Okhla)' },
  { id: 4, lat: 28.59, lon: 77.38, pm25: 342, aqiLevel: 'HAZARDOUS',      location: 'Noida (Sec 62)' },
  { id: 5, lat: 28.48, lon: 77.03, pm25: 156, aqiLevel: 'USG',            location: 'Gurugram' },
  { id: 6, lat: 28.72, lon: 77.50, pm25: 89,  aqiLevel: 'MODERATE',       location: 'Ghaziabad' },
  { id: 7, lat: 28.62, lon: 77.08, pm25: 245, aqiLevel: 'VERY_UNHEALTHY', location: 'Delhi (Dwarka)' },
  { id: 8, lat: 28.80, lon: 77.30, pm25: 62,  aqiLevel: 'MODERATE',       location: 'Delhi (Pitampura)' },
];

// Mock plume polygon (Delhi Okhla → Noida direction)
const MOCK_PLUME = {
  type: 'Feature',
  properties: { severity: 'CRITICAL', event_id: 9942 },
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [77.25, 28.55],
      [77.55, 28.62],
      [77.70, 28.40],
      [77.45, 28.32],
      [77.25, 28.55],
    ]],
  },
};

// Mock fire hotspot
const MOCK_FIRE = { lat: 28.55, lon: 77.25 };

export default function MapView({ alertPanelOpen, onAlertPanelClose }) {
  const [layers, setLayers] = useState({
    sensors: true, plumes: true, fire: true, wind: true, corridors: true,
  });

  const toggleLayer = key => setLayers(prev => ({ ...prev, [key]: !prev[key] }));

  const plumeStyle = {
    fillColor: '#ff0000',
    fillOpacity: 0.35,
    color: '#ff0000',
    opacity: 0.7,
    weight: 1.5,
    dashArray: '4 4',
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Full-bleed map */}
      <MapContainer
        center={[28.6139, 77.209]}
        zoom={10}
        scrollWheelZoom
        zoomControl={false}
        attributionControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        {/* CartoDB Dark Matter — free, no API key, best contrast for AQI overlays */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/attributions">CARTO</a>'
        />

        {/* AQI sensor markers */}
        {layers.sensors && MOCK_SENSORS.map(s => (
          <CircleMarker
            key={s.id}
            center={[s.lat, s.lon]}
            radius={10}
            pathOptions={{
              fillColor: AQI_COLORS[s.aqiLevel] || '#999',
              fillOpacity: 0.9,
              color: '#fff',
              weight: 1.5,
            }}
          >
            <Popup>
              <div className="text-sm font-medium">{s.location}</div>
              <div className="text-xs text-slate-500">PM2.5: {s.pm25} µg/m³</div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Plume polygon */}
        {layers.plumes && (
          <GeoJSON data={MOCK_PLUME} style={plumeStyle} />
        )}

        {/* Fire hotspot */}
        {layers.fire && (
          <CircleMarker
            center={[MOCK_FIRE.lat, MOCK_FIRE.lon]}
            radius={12}
            pathOptions={{
              fillColor: '#ff4500',
              fillOpacity: 0.9,
              color: '#ff4500',
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-sm font-medium">🔥 Active Fire Hotspot</div>
              <div className="text-xs text-slate-500">NASA FIRMS · Confidence: 92%</div>
            </Popup>
          </CircleMarker>
        )}
      </MapContainer>

      {/* Floating layer control (top-right) */}
      <LayerControl activeLayers={layers} onToggle={toggleLayer} />

      {/* Floating KPI strip (bottom-center, absolute inside map) */}
      <KPIStrip />

      {/* Slide-in alert panel (right edge) */}
      <AlertPanel open={alertPanelOpen} onClose={onAlertPanelClose} />
    </div>
  );
}
