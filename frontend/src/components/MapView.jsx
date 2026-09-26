import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import KPIStrip from './KPIStrip';
import LayerControl from './LayerControl';
import AlertPanel from './AlertPanel';
import AIEvidencePanel from './AIEvidencePanel';
import WindOverlay from './WindOverlay';
import ForecastSlider from './ForecastSlider';
import { useTheme } from '../hooks';

// AQI level → map marker color
const getSensorColor = (pm25) => {
  if (!pm25) return '#999';
  if (pm25 <= 12) return '#00e400'; // GOOD
  if (pm25 <= 35.4) return '#ffff00'; // MODERATE
  if (pm25 <= 55.4) return '#ff7e00'; // USG
  if (pm25 <= 150.4) return '#ff0000'; // UNHEALTHY
  if (pm25 <= 250.4) return '#8f3f97'; // VERY_UNHEALTHY
  return '#7e0023'; // HAZARDOUS
};

const NODE_CONFIG = {
  'India Node': { center: [28.6139, 77.209], zoom: 6 },
  'Brazil Node': { center: [-23.5505, -46.6333], zoom: 6 },
  'China Node': { center: [39.9042, 116.4074], zoom: 6 },
  'South Africa Node': { center: [-26.2041, 28.0473], zoom: 8 }
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
  const [sensors, setSensors] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvidence, setSelectedEvidence] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [sensorRes, eventRes] = await Promise.all([
          fetch('http://localhost:8000/api/data/sensors').catch(() => null),
          fetch('http://localhost:8000/api/data/events').catch(() => null)
        ]);

        if (sensorRes && sensorRes.ok) {
          const data = await sensorRes.json();
          setSensors(data);
        }
        if (eventRes && eventRes.ok) {
          const data = await eventRes.json();
          setEvents(data);
        }
      } catch (err) {
        console.error("Failed to fetch real map data", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
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

  // Premium CartoDB Maps
  const tileUrl = dark 
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png";

  const currentConfig = NODE_CONFIG[activeNode] || NODE_CONFIG['India Node'];

  // Calculate real stats for KPI strip
  const dynamicStats = {
    activeEvents: events.length,
    pm25Peak: sensors.length > 0 ? Math.max(...sensors.map(s => s.pm25 || 0)).toFixed(1) : 0,
    wind: '18 km/h NW',
    stationsOnline: sensors.length,
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0d1117]">
      <MapContainer
        center={currentConfig.center}
        zoom={currentConfig.zoom}
        scrollWheelZoom
        zoomControl={false}
        attributionControl={false}
        style={{ height: '100%', width: '100%', background: dark ? '#0d1117' : '#f8fafc' }}
      >
        <MapController center={currentConfig.center} zoom={currentConfig.zoom} />
        <WindOverlay isVisible={layers.wind} />
        
        <TileLayer
          url={tileUrl}
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        {layers.sensors && sensors.map(s => (
          <CircleMarker
            key={s.id || s.name}
            center={[s.lat, s.lon]}
            radius={6}
            pathOptions={{
              fillColor: getSensorColor(s.pm25),
              fillOpacity: 0.9,
              color: dark ? '#131920' : '#ffffff',
              weight: 1.5,
            }}
          >
            <Popup>
              <div className="text-sm font-medium">{s.location || s.name}</div>
              <div className="text-xs text-slate-500">PM2.5: {s.pm25} µg/m³</div>
              <div className="text-[10px] text-slate-400">Source: {s.provider}</div>
            </Popup>
          </CircleMarker>
        ))}

        {events.map((e) => {
          return (
            <div key={e.id || Math.random()}>
              {layers.fire && (
                <CircleMarker
                  center={[e.lat, e.lon]}
                  radius={10}
                  pathOptions={{ fillColor: '#ff4500', fillOpacity: 0.9, color: dark ? '#131920' : '#ffffff', weight: 2 }}
                  eventHandlers={{ click: () => setSelectedEvidence(e) }}
                >
                  <Popup>
                    <div className="text-sm font-medium">🚨 Event #{e.id}</div>
                    <div className="text-xs text-slate-500">Type: {e.event_type} · Severity: {e.severity}</div>
                    <button 
                        onClick={() => setSelectedEvidence(e)}
                        className="mt-2 text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-500 w-full"
                    >
                      View AI Analysis
                    </button>
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
      <KPIStrip stats={dynamicStats} />
      <AlertPanel open={alertPanelOpen} onClose={onAlertPanelClose} />
      {layers.plumes && <ForecastSlider />}
      <AIEvidencePanel event={selectedEvidence} onClose={() => setSelectedEvidence(null)} />
    </div>
  );
}
