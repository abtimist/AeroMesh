import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { Route, X } from 'lucide-react';
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
import AQHeatmapLayer from './AQHeatmapLayer';
import AQLegend from './AQLegend';
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

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 600);
    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);
  return null;
}

function MapClickListener({ onMapClick }) {
  useMapEvents({ click: e => onMapClick(e.latlng) });
  return null;
}



export default function MapView({ activeNode = 'India Node', alertPanelOpen, onAlertPanelClose, measureMode, inspectMode, setInspectMode, mapType = 'satellite', layers, toggleLayer }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { dark } = useTheme();
  const config = NODE_CONFIG[activeNode] || NODE_CONFIG['India Node'];
  const sensorResource = useResource('/api/data/sensors?node=all');
  const eventResource = useResource('/api/data/events?node=all');
  const forecastResource = useResource('/api/forecast?node=all', 60000);

  // Transport scenarios fire spots selection state
  const [selectedSpotsForForecast, setSelectedSpotsForForecast] = useState([]);
  const [isForecastActive, setIsForecastActive] = useState(false);

  // Reset selection if plumes layer is toggled off
  useEffect(() => {
    if (!layers?.plumes) {
      setIsForecastActive(false);
      setSelectedSpotsForForecast([]);
    }
  }, [layers?.plumes]);

  // Request plumes specifically for selected event IDs when active
  const plumeUrl = useMemo(() => {
    if (!layers?.plumes || !isForecastActive || selectedSpotsForForecast.length === 0) {
      return null;
    }
    return `/api/dispersion/contours?node=${config.key}&event_ids=${selectedSpotsForForecast.join(',')}`;
  }, [layers?.plumes, isForecastActive, selectedSpotsForForecast, config.key]);

  const plumeResource = useResource(plumeUrl);
  const modelResource = useResource('/api/dispersion/status', 60000);
  const sensors = sensorResource.data || EMPTY;
  const events = eventResource.data || EMPTY;
  const forecast = forecastResource.data;
  const [selection, setSelection] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [zoomTarget, setZoomTarget] = useState(null);

  useEffect(() => {
    const id = Number(searchParams.get('event'));
    if (Number.isSafeInteger(id) && id > 0) {
      setSelectedEvent(id);
      setZoomTarget(id);
    }
  }, [searchParams]);
  const [demo, setDemo] = useState(null);
  const [clickedLocation, setClickedLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState(config.center);
  const [mapZoom, setMapZoom] = useState(config.zoom);
  const [now, setNow] = useState(() => Date.now());

  // Fly to node center when switching regions
  useEffect(() => {
    setMapCenter(config.center);
    setMapZoom(config.zoom);
  }, [config.key]);

  // Fly to event when selected (ONLY from View on Map button via URL)
  useEffect(() => {
    if (zoomTarget && events.length > 0) {
      const ev = events.find(e => e.id === zoomTarget);
      if (ev) {
        setMapCenter([ev.lat, ev.lon]);
        setMapZoom(14); // Zoom in closely
        setZoomTarget(null); // Clear it so it only fires once
      }
    }
  }, [zoomTarget, events]);

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

  // Plumes are strictly filtered to the selected spots chosen by the user
  const filteredPlumes = useMemo(() => {
    if (!layers?.plumes || !isForecastActive || selectedSpotsForForecast.length === 0) {
      return { type: 'FeatureCollection', features: [] };
    }
    const selectedSet = new Set(selectedSpotsForForecast);
    const timeMatched = selectContours(plumeResource.data, selectedAt);
    return {
      type: 'FeatureCollection',
      features: (timeMatched.features || []).filter(f => selectedSet.has(f.properties?.event_id)),
    };
  }, [layers?.plumes, isForecastActive, selectedSpotsForForecast, plumeResource.data, selectedAt]);

  const vectors = useMemo(() => windVectors(frame, forecast?.grid), [frame, forecast?.grid]);
  const selectedEvidence = events.find(e => e.id === selectedEvent);
  const future = selectedAt && Date.parse(selectedAt) > now;

  // Handle clicking fire spots (either toggle selection for forecast, or open evidence)
  const handleEventClick = (eventId) => {
    if (layers?.plumes && !isForecastActive) {
      setSelectedSpotsForForecast(prev =>
        prev.includes(eventId) ? prev.filter(id => id !== eventId) : [...prev, eventId]
      );
      return;
    }
    setSelectedEvent(eventId);
  };

  // Observations stay at their measured times when scrubbing a forecast.
  const inspectorPoint = useMemo(() => {
    if (!clickedLocation || !frame) return null;
    const closest = points => Array.isArray(points) ? points.reduce((best, p) => {
      if (!p || typeof p.lat !== 'number' || typeof p.lon !== 'number') return best;
      const distance = Math.hypot(p.lat - clickedLocation.lat, p.lon - clickedLocation.lng);
      return !best || distance < best.distance ? { ...p, distance } : best;
    }, null) : null;
    return { weather: closest(frame.wind), air: closest(frame.air_quality) };
  }, [clickedLocation, frame]);

  const validSensors = useMemo(() => {
    return sensors.filter(s => s && typeof s.lat === 'number' && typeof s.lon === 'number' && !isNaN(s.lat) && !isNaN(s.lon));
  }, [sensors]);

  const validEvents = useMemo(() => {
    return events.filter(e => e && typeof e.lat === 'number' && typeof e.lon === 'number' && !isNaN(e.lat) && !isNaN(e.lon));
  }, [events]);

  const tileUrl = useMemo(() => {
    if (mapType === 'satellite') {
      return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    }
    return dark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  }, [mapType, dark]);

  return (
    <div className="relative w-full h-full min-h-[300px]" style={{ background: dark ? '#0d1117' : '#e8ecf0' }}>
      <MapContainer
        center={config.center}
        zoom={config.zoom}
        minZoom={3}
        maxZoom={18}
        preferCanvas
        scrollWheelZoom
        worldCopyJump
        style={{ height: '100%', width: '100%', minHeight: '100%' }}
      >
        <MapController center={mapCenter} zoom={mapZoom} />
        <MapResizer />
        <TileLayer
          url={tileUrl}
          attribution={mapType === 'satellite' ? 'Tiles © Esri — background imagery' : '© OpenStreetMap contributors, © CARTO'}
          className={mapType === 'satellite' ? 'darkened-satellite' : ''}
        />
        {layers.wind && <Suspense fallback={null}><WindVelocityLayer data={vectors} /></Suspense>}
        {layers.sensors && validSensors.map(s => (
          <CircleMarker key={'sensor-' + s.id} center={[s.lat, s.lon]} radius={3}
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
        {layers.fire && validEvents.map(event => {
          const isSelected = selectedSpotsForForecast.includes(event.id);
          const isTransportMode = layers?.plumes && !isForecastActive;

          return (
            <React.Fragment key={'event-group-' + event.id}>
              {/* Highlight halo for fire spots selected for transport forecast */}
              {isSelected && (
                <CircleMarker
                  center={[event.lat, event.lon]}
                  radius={13}
                  pathOptions={{
                    color: '#06b6d4',
                    weight: 2.5,
                    fillColor: '#22d3ee',
                    fillOpacity: 0.35,
                    dashArray: '4, 4',
                  }}
                />
              )}
              <CircleMarker
                center={[event.lat, event.lon]}
                radius={isSelected ? 7 : 5}
                pathOptions={{
                  color: isSelected ? '#06b6d4' : '#f97316',
                  fillColor: isSelected ? '#38bdf8' : '#ea580c',
                  fillOpacity: future ? 0.45 : 0.9,
                  weight: isSelected ? 2.5 : 1,
                }}
                eventHandlers={{
                  click: () => handleEventClick(event.id),
                }}
              >
                <Tooltip className="dark-tooltip">
                  <div className="text-xs text-left">
                    {isTransportMode ? (
                      <div>
                        <strong className="text-cyan-300">
                          {isSelected ? '✓ Selected for Transport Forecast' : 'Click to select for forecast'}
                        </strong>
                        <br />
                        Thermal Spot #{event.id} ({event.severity})<br />
                        FRP: {event.frp || 15} MW · Lat: {event.lat.toFixed(3)}, Lon: {event.lon.toFixed(3)}
                      </div>
                    ) : (
                      <div>
                        <strong>Recorded thermal event #{event.id}</strong><br />
                        Observed {dateText(event.detected_at)}<br />
                        Age: {Math.max(0, Math.round((now - (Date.parse(event.detected_at) || now)) / 3600000))} hours<br />
                        {event.source}<br />Click for source evidence and dated imagery.
                      </div>
                    )}
                  </div>
                </Tooltip>
              </CircleMarker>
            </React.Fragment>
          );
        })}
        {layers.airQuality && <AQHeatmapLayer data={frame?.air_quality || EMPTY} />}
        {layers.plumes && isForecastActive && filteredPlumes?.features?.length > 0 && (
          <GeoJSON
            key={selectedAt + ':' + (filteredPlumes?.features || []).map(f => f?.properties?.event_id || 0).join(',')}
            data={filteredPlumes}
            style={{ color: '#f87171', weight: 1.5, fillOpacity: 0.25 }}
            onEachFeature={(feature, layer) => {
              const p = feature.properties || {};
              layer.bindTooltip(
                `Plume #${p.event_id} · ${dateText(p.valid_to)} · Boundary Layer 0–${p.averaged_layer_top_m || 500}m`
              );
              layer.on('click', () => setSelectedEvent(p.event_id));
            }}
          />
        )}
        <MeasureTool isActive={measureMode} />
        <LocateButton />
        <MapClickListener onMapClick={point => { if (inspectMode) setClickedLocation(point); }} />
      </MapContainer>

      {/* Top Banner / Help Note for Transport Scenario Setup */}
      {layers?.plumes && !isForecastActive && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-[600] flex flex-col sm:flex-row items-center gap-3.5 bg-gray-950/95 border border-cyan-500/50 text-gray-100 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-300 max-w-[92vw]">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Route className="w-3.5 h-3.5" />
                Transport Scenario Setup
              </div>
              <p className="text-sm font-semibold text-gray-100">
                Select the fire spots that you want to forecast.
              </p>
              <p className="text-[11px] text-gray-400">
                Click one or more fire spots on the map, then press &quot;Selected&quot;.
              </p>
            </div>
          </div>

          <div className="hidden sm:block h-9 w-px bg-gray-800" />

          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1 rounded-full font-bold bg-gray-900 border border-gray-700 text-cyan-300">
              {selectedSpotsForForecast.length} selected
            </span>
            <button
              onClick={() => {
                if (selectedSpotsForForecast.length > 0) {
                  setIsForecastActive(true);
                }
              }}
              disabled={selectedSpotsForForecast.length === 0}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-1.5 ${
                selectedSpotsForForecast.length > 0
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-gray-950 cursor-pointer shadow-cyan-500/30 hover:scale-105'
                  : 'bg-gray-800/80 text-gray-500 cursor-not-allowed border border-gray-700'
              }`}
            >
              Selected ({selectedSpotsForForecast.length})
            </button>

            {selectedSpotsForForecast.length > 0 && (
              <button
                onClick={() => setSelectedSpotsForForecast([])}
                className="text-xs text-gray-400 hover:text-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Clear
              </button>
            )}

            <button
              onClick={() => toggleLayer?.('plumes')}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              title="Cancel scenario setup"
              aria-label="Cancel scenario setup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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

      {/* Forecast timeline: ONLY displayed when transport scenarios overlay is selected AND fire spots are chosen */}
      {layers?.plumes && isForecastActive && (
        <ForecastSlider
          forecast={forecast}
          times={timelineTimes}
          selectedAt={selectedAt}
          onChange={setSelection}
          loading={forecastResource.loading}
          error={forecastResource.error}
          dispersionStatus={modelResource.data}
          plumeCount={filteredPlumes.features.length}
          selectedFireSpotsCount={selectedSpotsForForecast.length}
          onEditSpots={() => setIsForecastActive(false)}
          onClose={() => toggleLayer?.('plumes')}
        />
      )}
      <AQLegend isVisible={layers.airQuality} />
      {alertPanelOpen && <AlertPanel open onClose={onAlertPanelClose} events={events} onSelect={id => { setSelectedEvent(id); onAlertPanelClose(); }} />}
      {selectedEvidence && <Suspense fallback={<div className="absolute top-20 right-4 z-[1000] bg-gray-950 p-4 text-white">Loading evidence…</div>}>
        <EvidencePanel key={selectedEvidence.id} event={selectedEvidence} onClose={() => {
          setSelectedEvent(null);
          if (searchParams.has('event')) {
            searchParams.delete('event');
            setSearchParams(searchParams);
          }
        }} onDemo={() => setDemo({event: selectedEvidence})} modelStatus={modelResource.data} />
      </Suspense>}
      {demo && <Suspense fallback={<div className="fixed inset-0 z-[1300] bg-gray-950 text-white p-8">Loading bundled HYSPLIT replay…</div>}><HysplitDemo contextEvent={demo.event} onClose={() => setDemo(null)} /></Suspense>}
    </div>
  );
}
