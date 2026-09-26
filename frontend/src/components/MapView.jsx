import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import KPIStrip from './KPIStrip';
import LayerControl from './LayerControl';
import AlertPanel from './AlertPanel';
import AIEvidencePanel from './AIEvidencePanel';
import WindOverlay from './WindOverlay';
import ForecastSlider from './ForecastSlider';
import { useTheme } from '../hooks';

// AQI level → map marker color (EPA standard)
const getSensorColor = (pm25) => {
  if (!pm25) return '#999';
  if (pm25 <= 12) return '#00e400';
  if (pm25 <= 35.4) return '#ffff00';
  if (pm25 <= 55.4) return '#ff7e00';
  if (pm25 <= 150.4) return '#ff0000';
  if (pm25 <= 250.4) return '#8f3f97';
  return '#7e0023';
};

const getAqiLabel = (pm25) => {
  if (!pm25) return 'N/A';
  if (pm25 <= 12) return 'Good';
  if (pm25 <= 35.4) return 'Moderate';
  if (pm25 <= 55.4) return 'Unhealthy (SG)';
  if (pm25 <= 150.4) return 'Unhealthy';
  if (pm25 <= 250.4) return 'Very Unhealthy';
  return 'Hazardous';
};

const NODE_CONFIG = {
  'India Node':        { center: [22.5, 78.5],   zoom: 5 },
  'Brazil Node':       { center: [-14.0, -51.0], zoom: 5 },
  'China Node':        { center: [35.0, 105.0],  zoom: 5 },
  'South Africa Node': { center: [-29.0, 25.0],  zoom: 6 },
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
    sensors: true, plumes: true, fire: true, wind: false, corridors: false,
  });

  const { dark } = useTheme();
  const [sensors, setSensors] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [hoursForward, setHoursForward] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const [sensorRes, eventRes] = await Promise.all([
          fetch('http://localhost:8000/api/data/sensors').catch(() => null),
          fetch('http://localhost:8000/api/data/events').catch(() => null)
        ]);
        if (sensorRes && sensorRes.ok) setSensors(await sensorRes.json());
        if (eventRes && eventRes.ok) setEvents(await eventRes.json());
      } catch (err) {
        console.error("Failed to fetch map data", err);
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
    fillColor: '#ff000080',
    fillOpacity: 0.3,
    color: '#ff4444',
    opacity: 0.8,
    weight: 2,
    dashArray: '6 3',
  };

  // Esri World Imagery (Satellite view)
  const tileUrl = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

  const currentConfig = NODE_CONFIG[activeNode] || NODE_CONFIG['India Node'];

  // Filter data based on active node (roughly 35 degrees radius)
  const isPointInNode = (lat, lon) => {
    if (!lat || !lon) return false;
    const [centerLat, centerLon] = currentConfig.center;
    // Handle wrap-around for longitude
    let dLon = Math.abs(lon - centerLon);
    if (dLon > 180) dLon = 360 - dLon;
    const dist = Math.sqrt(Math.pow(lat - centerLat, 2) + Math.pow(dLon, 2));
    return dist < 35;
  };

  const filteredSensors = useMemo(() => sensors.filter(s => isPointInNode(s.lat, s.lon)), [sensors, activeNode]);
  const filteredEvents = useMemo(() => events.filter(e => isPointInNode(e.lat, e.lon)), [events, activeNode]);

  // Dynamic KPI stats from real data for the active node
  const dynamicStats = useMemo(() => {
    const peakSensor = filteredSensors.length > 0
      ? filteredSensors.reduce((a, b) => ((a.pm25 || 0) > (b.pm25 || 0) ? a : b), filteredSensors[0])
      : null;
    return {
      activeEvents: filteredEvents.length,
      pm25Peak: peakSensor ? peakSensor.pm25 : 0,
      pm25Location: peakSensor ? peakSensor.name : '—',
      stationsOnline: filteredSensors.length,
    };
  }, [filteredSensors, filteredEvents]);

  // Build GeoJSON features with properties so popups work
  const plumeFeatures = useMemo(() => {
    return filteredEvents
      .filter(e => e.plume_polygon && e.plume_polygon.coordinates)
      .map(e => {
        let coords = e.plume_polygon.coordinates;
        // Apply forecast time offset
        if (hoursForward > 0 && coords[0]) {
          const offsetLon = hoursForward * 0.04;
          const offsetLat = hoursForward * 0.008;
          coords = [coords[0].map(c => [c[0] + offsetLon, c[1] + offsetLat])];
        }
        return {
          type: 'Feature',
          properties: {
            id: e.id,
            severity: e.severity,
            event_type: e.event_type,
            confidence: e.confidence,
          },
          geometry: {
            type: e.plume_polygon.type || 'Polygon',
            coordinates: coords,
          },
        };
      });
  }, [filteredEvents, hoursForward]);

  const plumeGeoJSON = useMemo(() => ({
    type: 'FeatureCollection',
    features: plumeFeatures,
  }), [plumeFeatures]);

  const onEachPlumeFeature = (feature, layer) => {
    const p = feature.properties || {};
    layer.bindPopup(
      `<div style="font-family:Inter,sans-serif;">
        <div style="font-size:13px;font-weight:600;margin-bottom:4px;">🚨 Plume Dispersion Zone</div>
        <div style="font-size:11px;color:#666;">
          Severity: <strong style="color:#dc2626;">${p.severity || 'N/A'}</strong><br/>
          Type: ${p.event_type || 'Unknown'}<br/>
          Confidence: ${p.confidence ? p.confidence.toFixed(1) + '%' : 'N/A'}<br/>
          <span style="font-size:10px;color:#999;margin-top:4px;display:block;">
            Gaussian plume model · T+${hoursForward}h forecast
          </span>
        </div>
      </div>`
    );
    layer.on('mouseover', () => layer.setStyle({ fillOpacity: 0.5, weight: 3 }));
    layer.on('mouseout', () => layer.setStyle(plumeStyle));
  };

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: dark ? '#0d1117' : '#e8ecf0' }}>
      <MapContainer
        center={currentConfig.center}
        zoom={currentConfig.zoom}
        minZoom={3}
        maxZoom={18}
        scrollWheelZoom
        zoomControl={false}
        attributionControl={false}
        worldCopyJump={true}
        style={{ height: '100%', width: '100%', background: dark ? '#0d1117' : '#f8fafc' }}
      >
        <MapController center={currentConfig.center} zoom={currentConfig.zoom} />
        <WindOverlay isVisible={layers.wind} />

        <TileLayer
          url={tileUrl}
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          noWrap={false}
          className="darkened-satellite"
        />

        {/* Sensor markers */}
        {layers.sensors && sensors.map(s => (
          <CircleMarker
            key={`sensor-${s.id}`}
            center={[s.lat, s.lon]}
            radius={7}
            pathOptions={{
              fillColor: getSensorColor(s.pm25),
              fillOpacity: 0.9,
              color: dark ? '#1a2030' : '#ffffff',
              weight: 2,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={0.95} permanent={false}>
              <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 140 }}>
                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 2 }}>{s.name}</div>
                <div style={{ fontSize: 11, color: '#666' }}>
                  PM2.5: <strong style={{ color: getSensorColor(s.pm25) }}>{s.pm25} µg/m³</strong>
                </div>
                <div style={{ fontSize: 10, color: '#999' }}>AQI: {getAqiLabel(s.pm25)}</div>
                <div style={{ fontSize: 10, color: '#aaa' }}>Source: {s.provider}</div>
              </div>
            </Tooltip>
            <Popup>
              <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 180 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{s.name}</div>
                <table style={{ fontSize: 11, width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr><td style={{ color: '#888', padding: '2px 0' }}>PM2.5</td><td style={{ fontWeight: 600 }}>{s.pm25} µg/m³</td></tr>
                    <tr><td style={{ color: '#888', padding: '2px 0' }}>AQI Level</td><td><span style={{ color: getSensorColor(s.pm25), fontWeight: 600 }}>{getAqiLabel(s.pm25)}</span></td></tr>
                    <tr><td style={{ color: '#888', padding: '2px 0' }}>Provider</td><td>{s.provider}</td></tr>
                    <tr><td style={{ color: '#888', padding: '2px 0' }}>Updated</td><td style={{ fontSize: 10 }}>{s.timestamp ? new Date(s.timestamp).toLocaleTimeString() : '—'}</td></tr>
                  </tbody>
                </table>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Fire event markers */}
        {layers.fire && events.map(e => (
          <CircleMarker
            key={`event-${e.id}`}
            center={[e.lat, e.lon]}
            radius={11}
            pathOptions={{
              fillColor: e.severity === 'CRITICAL' ? '#dc2626' : '#ff4500',
              fillOpacity: 0.9,
              color: dark ? '#1a2030' : '#ffffff',
              weight: 2,
            }}
            eventHandlers={{ click: () => setSelectedEvidence(e) }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
              <div style={{ fontFamily: 'Inter, sans-serif' }}>
                <div style={{ fontWeight: 600, fontSize: 12 }}>🔥 Event #{e.id}</div>
                <div style={{ fontSize: 11, color: '#666' }}>{e.event_type} · {e.severity}</div>
              </div>
            </Tooltip>
            <Popup>
              <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 200 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>🚨 Pollution Event #{e.id}</div>
                <table style={{ fontSize: 11, width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr><td style={{ color: '#888', padding: '2px 0' }}>Type</td><td style={{ fontWeight: 600 }}>{e.event_type}</td></tr>
                    <tr><td style={{ color: '#888', padding: '2px 0' }}>Severity</td><td><span style={{ color: '#dc2626', fontWeight: 700 }}>{e.severity}</span></td></tr>
                    <tr><td style={{ color: '#888', padding: '2px 0' }}>Confidence</td><td>{e.confidence?.toFixed(1)}%</td></tr>
                    <tr><td style={{ color: '#888', padding: '2px 0' }}>Detected</td><td style={{ fontSize: 10 }}>{e.detected_at ? new Date(e.detected_at).toLocaleString() : '—'}</td></tr>
                  </tbody>
                </table>
                <button
                  onclick="document.dispatchEvent(new CustomEvent('aeromesh-view-evidence'))"
                  style="margin-top:8px;width:100%;padding:6px;font-size:11px;font-weight:600;color:#fff;background:#4f46e5;border:none;border-radius:8px;cursor:pointer;"
                >
                  View AI Analysis →
                </button>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Plume polygons as proper GeoJSON FeatureCollection */}
        {layers.plumes && plumeFeatures.length > 0 && (
          <GeoJSON
            key={`plumes-${hoursForward}-${events.length}`}
            data={plumeGeoJSON}
            style={plumeStyle}
            onEachFeature={onEachPlumeFeature}
          />
        )}
      </MapContainer>

      {/* HUD Overlays */}
      <LayerControl activeLayers={layers} onToggle={toggleLayer} />
      <KPIStrip stats={dynamicStats} />
      <AlertPanel open={alertPanelOpen} onClose={onAlertPanelClose} events={events} />
      {layers.plumes && <ForecastSlider hoursForward={hoursForward} setHoursForward={setHoursForward} />}
      <AIEvidencePanel event={selectedEvidence} onClose={() => setSelectedEvidence(null)} />
    </div>
  );
}
