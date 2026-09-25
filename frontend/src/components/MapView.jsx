import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import KPIStrip from './KPIStrip';
import LayerControl from './LayerControl';
import AlertPanel from './AlertPanel';
import { useTheme } from '../hooks';

// AQI level → map marker color
const AQI_COLORS = {
  GOOD: '#00e400', MODERATE: '#ffff00', USG: '#ff7e00',
  UNHEALTHY: '#ff0000', VERY_UNHEALTHY: '#8f3f97', HAZARDOUS: '#7e0023',
};

// Realistic mock sensor data fallback
const MOCK_SENSORS = [
  { id: 1, lat: 28.522, lon: 77.275, pm25: 452, aqiLevel: 'HAZARDOUS',      location: 'Delhi (Okhla Phase 2)' },
  { id: 2, lat: 28.554, lon: 77.300, pm25: 395, aqiLevel: 'HAZARDOUS',      location: 'Noida (Sec 125)' },
  { id: 3, lat: 28.631, lon: 77.216, pm25: 215, aqiLevel: 'VERY_UNHEALTHY', location: 'Delhi (Connaught Place)' },
  { id: 4, lat: 28.704, lon: 77.102, pm25: 185, aqiLevel: 'UNHEALTHY',      location: 'Delhi (Rohini)' },
  { id: 5, lat: 28.459, lon: 77.026, pm25: 156, aqiLevel: 'USG',            location: 'Gurugram (Cyber City)' },
  { id: 6, lat: 28.669, lon: 77.453, pm25: 420, aqiLevel: 'HAZARDOUS',      location: 'Ghaziabad (Loni)' },
  { id: 7, lat: 29.390, lon: 76.970, pm25: 265, aqiLevel: 'VERY_UNHEALTHY', location: 'Haryana (Panipat)' },
  { id: 8, lat: 28.800, lon: 77.300, pm25: 145, aqiLevel: 'UNHEALTHY',      location: 'Delhi (Narela)' },
];

const MOCK_PLUME = {
  type: 'Feature',
  properties: { severity: 'CRITICAL', event_id: 9942 },
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [77.275, 28.522], [77.320, 28.550], [77.400, 28.510],
      [77.350, 28.450], [77.260, 28.490], [77.275, 28.522],
    ]],
  },
};

const MOCK_FIRE = { lat: 29.390, lon: 76.970 };

const NODE_CONFIG = {
  'India Node': { center: [28.6139, 77.209], zoom: 6, sensors: MOCK_SENSORS, plume: MOCK_PLUME, fire: MOCK_FIRE },
  'Brazil Node': { 
    center: [-23.5505, -46.6333], zoom: 6, 
    sensors: [
      { id: 101, lat: -23.5505, lon: -46.6333, pm25: 145, aqiLevel: 'UNHEALTHY', location: 'São Paulo (Centro)' },
      { id: 102, lat: -23.58, lon: -46.68, pm25: 210, aqiLevel: 'VERY_UNHEALTHY', location: 'Pinheiros' }
    ],
    plume: null, fire: { lat: -23.6, lon: -46.5 }
  },
  'China Node': {
    center: [39.9042, 116.4074], zoom: 6,
    sensors: [
      { id: 201, lat: 39.9042, lon: 116.4074, pm25: 280, aqiLevel: 'VERY_UNHEALTHY', location: 'Beijing (Dongcheng)' },
      { id: 202, lat: 39.95, lon: 116.3, pm25: 190, aqiLevel: 'UNHEALTHY', location: 'Haidian' }
    ],
    plume: null, fire: null
  },
  'South Africa Node': {
    center: [-26.2041, 28.0473], zoom: 8,
    sensors: [
      { id: 301, lat: -26.2041, lon: 28.0473, pm25: 85, aqiLevel: 'MODERATE', location: 'Johannesburg (CBD)' },
      { id: 302, lat: -26.1, lon: 28.1, pm25: 110, aqiLevel: 'USG', location: 'Sandton' }
    ],
    plume: null, fire: null
  }
};

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.5 });
  }, [center, zoom, map]);
  return null;
}

export default function MapView({ activeNode = 'India Node', alertPanelOpen, onAlertPanelClose }) {
  const [layers, setLayers] = useState({
    sensors: true, plumes: true, fire: true, wind: true, corridors: true,
  });
  
  const { dark } = useTheme();

  // State for fetched data
  const [sensors, setSensors] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [sensorRes, eventRes] = await Promise.all([
          fetch('http://localhost:8000/api/data/sensors').catch(() => null),
          fetch('http://localhost:8000/api/data/events').catch(() => null)
        ]);

        let fetchedSensors = [];
        let fetchedEvents = [];

        if (sensorRes && sensorRes.ok) fetchedSensors = await sensorRes.json();
        if (eventRes && eventRes.ok) fetchedEvents = await eventRes.json();

        const config = NODE_CONFIG[activeNode] || NODE_CONFIG['India Node'];
        
        // Fallback to mock data if DB is empty or API is down (for demo purposes)
        if (fetchedSensors.length === 0) {
          setSensors(config.sensors);
        } else {
          setSensors(fetchedSensors);
        }

        if (fetchedEvents.length === 0) {
          if (config.fire) {
            setEvents([{ type: 'mock_fire', lat: config.fire.lat, lon: config.fire.lon }]);
          } else {
            setEvents([]);
          }
        } else {
          setEvents(fetchedEvents);
        }
      } catch (err) {
        console.error("Failed to fetch map data", err);
        const config = NODE_CONFIG[activeNode] || NODE_CONFIG['India Node'];
        setSensors(config.sensors);
        if (config.fire) {
          setEvents([{ type: 'mock_fire', lat: config.fire.lat, lon: config.fire.lon }]);
        } else {
          setEvents([]);
        }
      } finally {
        setLoading(false);
      }
    }
    
    // Initial fetch
    fetchData();
    
    // Poll every 10 seconds for real-time live data
    const intervalId = setInterval(fetchData, 10000);
    
    return () => clearInterval(intervalId);
  }, [activeNode]);

  const toggleLayer = key => setLayers(prev => ({ ...prev, [key]: !prev[key] }));

  const plumeStyle = {
    fillColor: '#ff0000',
    fillOpacity: 0.35,
    color: '#ff0000',
    opacity: 0.7,
    weight: 1.5,
    dashArray: '4 4',
  };

  const onEachPlumeFeature = (feature, layer) => {
    if (feature.properties) {
      layer.bindPopup(`
        <div class="text-sm font-medium">🚨 Toxic Plume Dispersion Forecast</div>
        <div class="text-xs text-slate-500 mt-1">Severity: <span class="font-bold text-red-600">${feature.properties.severity}</span></div>
        <div class="text-[10px] text-slate-400 mt-1">AeroMesh ML Model Prediction based on wind vectors and emission source.</div>
      `);
    }
  };

  const tileUrl = dark 
    ? "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
    : "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}";

  const currentConfig = NODE_CONFIG[activeNode] || NODE_CONFIG['India Node'];

  return (
    <div className="relative w-full h-full overflow-hidden">
      <MapContainer
        center={currentConfig.center}
        zoom={currentConfig.zoom}
        scrollWheelZoom
        zoomControl={false}
        attributionControl={false}
        style={{ height: '100%', width: '100%', background: dark ? '#0d1117' : '#f8fafc' }}
      >
        <MapController center={currentConfig.center} zoom={currentConfig.zoom} />
        
        <TileLayer
          url={tileUrl}
          attribution='Esri, HERE, Garmin, FAO, NOAA, USGS, EPA'
        />

        {/* Real or Mock Sensors */}
        {layers.sensors && sensors.map(s => (
          <CircleMarker
            key={s.id}
            center={[s.lat, s.lon]}
            radius={8}
            pathOptions={{
              fillColor: AQI_COLORS[s.aqiLevel] || '#999',
              fillOpacity: 0.9,
              color: dark ? '#131920' : '#ffffff',
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-sm font-medium">{s.location || s.name}</div>
              <div className="text-xs text-slate-500">PM2.5: {s.pm25} µg/m³</div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Real or Mock Plumes & Fires */}
        {events.map((e, idx) => {
          if (e.type === 'mock_fire') {
            return (
              <div key="mock-event">
                {layers.fire && (
                  <CircleMarker
                    center={[e.lat, e.lon]}
                    radius={12}
                    pathOptions={{ fillColor: '#ff4500', fillOpacity: 0.9, color: dark ? '#131920' : '#ffffff', weight: 2 }}
                  >
                    <Popup>
                      <div className="text-sm font-medium">🔥 Active Fire Hotspot (Stubble)</div>
                      <div className="text-xs text-slate-500">NASA FIRMS (VIIRS) · Confidence: 88%</div>
                    </Popup>
                  </CircleMarker>
                )}
                {layers.plumes && currentConfig.plume && (
                  <GeoJSON 
                    data={currentConfig.plume} 
                    style={plumeStyle} 
                    onEachFeature={onEachPlumeFeature} 
                  />
                )}
              </div>
            );
          }

          // Real Event rendering
          return (
            <div key={e.id}>
              {layers.fire && (
                <CircleMarker
                  center={[e.lat, e.lon]}
                  radius={12}
                  pathOptions={{ fillColor: '#ff4500', fillOpacity: 0.9, color: dark ? '#131920' : '#ffffff', weight: 2 }}
                >
                  <Popup>
                    <div className="text-sm font-medium">🚨 Event #{e.id}</div>
                    <div className="text-xs text-slate-500">Type: {e.event_type} · Severity: {e.severity}</div>
                  </Popup>
                </CircleMarker>
              )}
              {layers.plumes && e.plume_polygon && (
                <GeoJSON 
                  data={e.plume_polygon} 
                  style={plumeStyle} 
                  onEachFeature={onEachPlumeFeature}
                />
              )}
            </div>
          );
        })}
      </MapContainer>

      <LayerControl activeLayers={layers} onToggle={toggleLayer} />
      <KPIStrip />
      <AlertPanel open={alertPanelOpen} onClose={onAlertPanelClose} />
    </div>
  );
}
