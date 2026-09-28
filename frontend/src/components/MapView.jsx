import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { MapContainer, TileLayer, GeoJSON, Rectangle, CircleMarker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import AlertPanel from './AlertPanel';
import ForecastSlider from './ForecastSlider';
import LocateButton from './LocateButton';
import MeasureTool from './MeasureTool';
import { useTheme } from '../hooks';
import { useResource } from '../api';
import { selectFrame, selectContours, windVectors } from '../forecast';

const WindVelocityLayer = lazy(() => import('./WindVelocityLayer'));
const EvidencePanel = lazy(() => import('./AIEvidencePanel'));
const HysplitDemo = lazy(() => import('./HysplitDemo'));
const EMPTY = [];
const NODE_CONFIG = {
  'India Node': { key: 'india', center: [22.5, 78.5], zoom: 5 },
  'Brazil Node': { key: 'brazil', center: [-14, -51], zoom: 5 },
  'China Node': { key: 'china', center: [35, 105], zoom: 5 },
  'South Africa Node': { key: 'south-africa', center: [-29, 25], zoom: 6 },
};
const aqiColor = value => value == null ? '#94a3b8' : value <= 50 ? '#22c55e' : value <= 100 ? '#eab308' : value <= 150 ? '#f97316' : value <= 200 ? '#ef4444' : '#a855f7';
const valueText = value => value == null ? 'Unavailable' : Number(value).toFixed(1);
const dateText = value => value ? new Date(value).toLocaleString() : 'Time unavailable';

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => { map.flyTo(center, zoom, { duration: 0.8 }); }, [center, zoom, map]);
  return null;
}

function MapClickListener({ onMapClick }) {
  useMapEvents({ click: e => onMapClick(e.latlng) });
  return null;
}

export default function MapView({ activeNode = 'India Node', alertPanelOpen, onAlertPanelClose, measureMode, inspectMode, setInspectMode, mapType = 'satellite', layers }) {
  const { dark } = useTheme();
  const config = NODE_CONFIG[activeNode] || NODE_CONFIG['India Node'];
  const sensorResource = useResource('/api/data/sensors?node=all');
  const eventResource = useResource('/api/data/events?node=all');
  const forecastResource = useResource('/api/forecast?node=all', 60000);
  const plumeResource = useResource('/api/dispersion/contours?node=' + config.key);
  const modelResource = useResource('/api/dispersion/status', 60000);
  const sensors = sensorResource.data || EMPTY;
  const events = eventResource.data || EMPTY;
  const forecast = forecastResource.data;
  const [selection, setSelection] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [demo, setDemo] = useState(null);
  const [clickedLocation, setClickedLocation] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const timelineTimes = useMemo(() => [...new Set([
    ...(forecast?.frames || []).map(f => f.valid_at),
    ...(plumeResource.data?.features || []).map(f => f.properties.valid_to),
  ])].sort(), [forecast, plumeResource.data]);
  const selectedAt = timelineTimes.includes(selection) ? selection : forecast?.frames?.[0]?.valid_at || timelineTimes[0] || null;
  const frame = selectFrame(forecast, selectedAt);
  const plumes = useMemo(() => selectContours(plumeResource.data, selectedAt), [plumeResource.data, selectedAt]);
  const vectors = useMemo(() => windVectors(frame, forecast?.grid), [frame, forecast?.grid]);
  const selectedEvidence = events.find(e => e.id === selectedEvent);
  const future = selectedAt && Date.parse(selectedAt) > now;

  // Observations stay at their measured times when scrubbing a forecast.
  const inspectorPoint = useMemo(() => {
    if (!clickedLocation || !frame) return null;
    const closest = points => points.reduce((best, p) => {
      const distance = Math.hypot(p.lat - clickedLocation.lat, p.lon - clickedLocation.lng);
      return !best || distance < best.distance ? { ...p, distance } : best;
    }, null);
    return { weather: closest(frame.wind), air: closest(frame.air_quality) };
  }, [clickedLocation, frame]);

  return (
    <div className="relative w-full h-full" style={{ background: dark ? '#0d1117' : '#e8ecf0' }}>
      <MapContainer center={config.center} zoom={config.zoom} minZoom={3} maxZoom={18} preferCanvas scrollWheelZoom worldCopyJump style={{ height: '100%', width: '100%' }}>
        <MapController center={config.center} zoom={config.zoom} />
        <TileLayer
          url={mapType === 'satellite' ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
          attribution={mapType === 'satellite' ? 'Tiles © Esri — background imagery, not dated event evidence' : '© OpenStreetMap contributors'}
          className={mapType === 'satellite' ? 'darkened-satellite' : ''}
        />
        {layers.wind && <Suspense fallback={null}><WindVelocityLayer data={vectors} /></Suspense>}
        {layers.sensors && sensors.map(s => (
          <CircleMarker key={'sensor-' + s.id} center={[s.lat, s.lon]} radius={5}
            pathOptions={{ color: s.provenance_status === 'verified' ? '#22c55e' : '#94a3b8', fillOpacity: future ? 0.35 : 0.8, weight: 1 }}>
            <Tooltip className="dark-tooltip" direction="top">
              <div className="text-xs text-left">
                <strong>{s.name}</strong><br />
                Recorded PM2.5: {valueText(s.pm25)} µg/m³<br />
                {dateText(s.timestamp)}<br />
                Source: {s.source} · {s.provenance_status === 'verified' ? 'Verified ingestion' : 'Legacy provenance unverified'}<br />
                {future ? 'Latest observation — not a future sensor reading' : 'Recorded observation — check its age'}
              </div>
            </Tooltip>
          </CircleMarker>
        ))}
        {layers.fire && events.map(event => (
          <CircleMarker key={'event-' + event.id} center={[event.lat, event.lon]} radius={4}
            pathOptions={{ color: '#f97316', fillOpacity: future ? 0.45 : 0.9, weight: 1 }}
            eventHandlers={{ click: () => setSelectedEvent(event.id) }}>
            <Tooltip className="dark-tooltip">
              <div className="text-xs text-left">
                <strong>Recorded thermal event #{event.id}</strong><br />
                Observed {dateText(event.detected_at)}<br />
                Age: {Math.max(0, Math.round((now - Date.parse(event.detected_at)) / 3600000))} hours<br />
                {event.source}<br />Click for source evidence and dated imagery.
              </div>
            </Tooltip>
          </CircleMarker>
        ))}
        {layers.airQuality && (frame?.air_quality || EMPTY).map((p, i) => (
          <Rectangle key={'aq-' + i} bounds={[[p.lat - 5, p.lon - 5], [p.lat + 5, p.lon + 5]]}
            pathOptions={{ stroke: false, fillColor: aqiColor(p.us_aqi), fillOpacity: 0.35 }}>
            <Tooltip className="dark-tooltip">
              <div className="text-xs text-left">
                <strong>CAMS Global model forecast</strong><br />
                PM2.5: {valueText(p.pm2_5)} µg/m³ · US AQI: {valueText(p.us_aqi)}<br />
                AOD: {valueText(p.aerosol_optical_depth)} (column aerosol)<br />
                Valid {dateText(frame.valid_at)}<br />~45 km native resolution · regional sample
              </div>
            </Tooltip>
          </Rectangle>
        ))}
        {layers.plumes && plumes.features.length > 0 && (
          <GeoJSON key={selectedAt + ':' + plumes.features.map(f => f.properties.run_id).join(',')} data={plumes}
            style={{ color: '#f87171', weight: 1, fillOpacity: 0.2 }}
            onEachFeature={(feature, layer) => {
              const p = feature.properties;
              layer.bindTooltip('HYSPLIT relative dispersion · ' + dateText(p.valid_from) + ' to ' + dateText(p.valid_to) + ' · layer 0–' + p.averaged_layer_top_m + ' m');
              layer.on('click', () => setSelectedEvent(p.event_id));
            }} />
        )}
        <MeasureTool isActive={measureMode} />
        <LocateButton />
        <MapClickListener onMapClick={point => { if (inspectMode) setClickedLocation(point); }} />
      </MapContainer>

      <div className="absolute top-4 left-20 z-[500] bg-gray-950/90 text-gray-200 rounded-xl px-4 py-2 text-xs max-w-[70%]">
        {sensorResource.loading || eventResource.loading ? 'Loading regional observations…' : sensors.length + ' stations · ' + events.length + ' recorded events'}
        {(sensorResource.error || eventResource.error) && <p role="alert" className="text-amber-300">Observations unavailable or stale: {sensorResource.error || eventResource.error}</p>}
        {layers.wind && !vectors && <p className="text-amber-300">Wind unavailable for this time.</p>}
        {layers.airQuality && !frame?.air_quality?.length && <p className="text-amber-300">Air-quality forecast unavailable for this time.</p>}
        {plumeResource.error && <p className="text-amber-300">Dispersion unavailable: {plumeResource.error}</p>}
        <button className="block mt-2 text-amber-300 underline" onClick={() => setDemo({})}>Explore HYSPLIT demonstration</button>
      </div>

      {clickedLocation && inspectMode && (
        <section className="absolute top-4 right-4 z-[600] w-64 rounded-2xl bg-gray-950/95 border border-gray-700 text-gray-200 p-4 text-xs space-y-2">
          <div className="flex justify-between"><strong>Regional forecast sample</strong><button aria-label="Close location data" onClick={() => { setClickedLocation(null); setInspectMode(false); }}>Close</button></div>
          <p>Nearest sample to {clickedLocation.lat.toFixed(3)}, {clickedLocation.lng.toFixed(3)}</p>
          <p>Valid: {dateText(selectedAt)}</p>
          <p>Wind: {valueText(inspectorPoint?.weather?.wind_speed_10m)} m/s</p>
          <p>Direction (from): {valueText(inspectorPoint?.weather?.wind_direction_10m)}°</p>
          <p>Boundary layer: {valueText(inspectorPoint?.weather?.boundary_layer_height)} m</p>
          <p>PM2.5: {valueText(inspectorPoint?.air?.pm2_5)} µg/m³</p>
          <p>US AQI: {valueText(inspectorPoint?.air?.us_aqi)}</p>
          <p className="text-gray-400">GFS / CAMS via Open-Meteo. Regional samples, not measurements at your click location.</p>
        </section>
      )}

      <ForecastSlider forecast={forecast} times={timelineTimes} selectedAt={selectedAt} onChange={setSelection}
        loading={forecastResource.loading} error={forecastResource.error} dispersionStatus={modelResource.data} plumeCount={plumes.features.length} />
      {alertPanelOpen && <AlertPanel open onClose={onAlertPanelClose} events={events} onSelect={id => { setSelectedEvent(id); onAlertPanelClose(); }} />}
      {selectedEvidence && <Suspense fallback={<div className="absolute top-20 right-4 z-[1000] bg-gray-950 p-4 text-white">Loading evidence…</div>}>
        <EvidencePanel key={selectedEvidence.id} event={selectedEvidence} onClose={() => setSelectedEvent(null)} onDemo={() => setDemo({event: selectedEvidence})} modelStatus={modelResource.data} />
      </Suspense>}
      {demo && <Suspense fallback={<div className="fixed inset-0 z-[1300] bg-gray-950 text-white p-8">Loading bundled HYSPLIT replay…</div>}><HysplitDemo contextEvent={demo.event} onClose={() => setDemo(null)} /></Suspense>}
    </div>
  );
}
