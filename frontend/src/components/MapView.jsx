import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import KPIStrip from './KPIStrip';
import LayerControl from './LayerControl';
import AlertPanel from './AlertPanel';
import AIEvidencePanel from './AIEvidencePanel';
import WindOverlay from './WindOverlay';
import ForecastSlider from './ForecastSlider';
import AQILegend from './AQILegend';
import LocateButton from './LocateButton';
import MeasureTool from './MeasureTool';
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

export default function MapView({ activeNode = 'India Node', alertPanelOpen, onAlertPanelClose, measureMode }) {
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
    fillColor: '#ff2244',
    fillOpacity: 0.25,
    color: 'transparent',
    opacity: 0,
    weight: 0,
    className: 'plume-polygon'
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
    layer.bindTooltip(
      `<div style="font-family:Inter,sans-serif; text-align:left;">
        <div style="font-size:12px;font-weight:600;margin-bottom:2px;color:#fff;">Plume Forecast</div>
        <div style="font-size:11px;color:#cbd5e1;">
          Severity: <strong style="color:#f87171;">${p.severity || 'N/A'}</strong><br/>
          T+${hoursForward}h Dispersion
        </div>
      </div>`,
      { sticky: true, className: 'dark-tooltip', opacity: 0.95 }
    );
    layer.on('mouseover', () => layer.setStyle({ fillOpacity: 0.45 }));
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
            radius={8}
            pathOptions={{
              fillColor: getSensorColor(s.pm25),
              fillOpacity: 0.65,
              color: getSensorColor(s.pm25),
              weight: 0,
              className: 'heatmap-dot'
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={0.95} className="dark-tooltip" sticky>
              <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 140, textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, color: '#fff' }}>{s.name}</div>
                <div style={{ fontSize: 11, color: '#cbd5e1' }}>
                  PM2.5: <strong style={{ color: getSensorColor(s.pm25) }}>{s.pm25} µg/m³</strong>
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                  AQI: <span style={{ color: getSensorColor(s.pm25) }}>{getAqiLabel(s.pm25)}</span>
                </div>
              </div>
            </Tooltip>
          </CircleMarker>
        ))}

        {/* Fire event markers */}
        {layers.fire && events.map(e => (
          <CircleMarker
            key={`event-${e.id}`}
            center={[e.lat, e.lon]}
            radius={6}
            pathOptions={{
              fillColor: e.severity === 'CRITICAL' ? '#ef4444' : '#f97316',
              fillOpacity: 1.0,
              color: e.severity === 'CRITICAL' ? '#fca5a5' : '#fdba74',
              weight: 2,
              className: 'fire-glow-dot'
            }}
            eventHandlers={{ click: () => setSelectedEvidence(e) }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={0.95} className="dark-tooltip" sticky>
              <div style={{ fontFamily: 'Inter, sans-serif', textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#fff', marginBottom: 2 }}>🔥 Thermal Anomaly</div>
                <div style={{ fontSize: 11, color: '#cbd5e1' }}>
                  Severity: <strong style={{ color: e.severity === 'CRITICAL' ? '#ef4444' : '#f97316' }}>{e.severity}</strong><br/>
                  <span style={{ color: '#94a3b8' }}>Click to view AI Evidence</span>
                </div>
              </div>
            </Tooltip>
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

        <MeasureTool isActive={measureMode} />
        <LocateButton />
      </MapContainer>

      {/* HUD Overlays */}
      <LayerControl activeLayers={layers} onToggle={toggleLayer} />
      <KPIStrip stats={dynamicStats} />
      <AQILegend isVisible={layers.sensors} />
      <AlertPanel open={alertPanelOpen} onClose={onAlertPanelClose} events={events} />
      {layers.plumes && <ForecastSlider hoursForward={hoursForward} setHoursForward={setHoursForward} />}
      <AIEvidencePanel event={selectedEvidence} onClose={() => setSelectedEvidence(null)} />
    </div>
  );
}
