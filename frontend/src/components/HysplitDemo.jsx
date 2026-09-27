import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, GeoJSON, MapContainer, TileLayer, Tooltip } from 'react-leaflet';
import { useResource } from '../api';

const colors = ['#fde68a', '#fbbf24', '#fb923c', '#f87171', '#e11d48', '#881337'];
function bandColor(value) {
  return colors[Math.max(0, Math.min(5, Math.round(Math.log10(value) + 6)))];
}

export default function HysplitDemo({ contextEvent, onClose }) {
  const metadata = useResource('/api/dispersion/demo', 0);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const frame = useResource(metadata.data ? `/api/dispersion/demo/frames/${index}` : null, 0);
  const count = metadata.data?.frame_count || 0;
  useEffect(() => {
    if (!playing || !count || frame.loading || frame.error) return;
    const timer = setTimeout(() => setIndex(i => (i + 1) % count), 1800);
    return () => clearTimeout(timer);
  }, [playing, count, index, frame.loading, frame.error]);
  const center = useMemo(() => metadata.data ? [metadata.data.source_location.lat, metadata.data.source_location.lon + 5] : [-34.05, 156], [metadata.data]);
  const time = metadata.data?.time_intervals[index];
  return (
    <div className="fixed inset-0 z-[1300] bg-gray-950 text-gray-100 flex flex-col p-4 sm:p-6 gap-3" role="dialog" aria-modal="true" aria-label="HYSPLIT demonstration">
      <header className="flex justify-between gap-4 items-start">
        <div><h2 className="text-lg font-semibold">HYSPLIT simulation — demonstration mode</h2>
          <p className="text-xs text-amber-300 mt-1">Recorded model output · Original location and dates · No READY API connection</p></div>
        <button onClick={onClose} className="rounded-lg border border-gray-600 px-4 py-2 shrink-0">Close demo</button>
      </header>
      {contextEvent && <p className="text-xs text-gray-400">Opened from live event #{contextEvent.id}. This historical replay illustrates model output; it is not a prediction for that event.</p>}
      {metadata.loading && <p>Loading bundled simulation…</p>}
      {metadata.error && <p role="alert">Demo unavailable: {metadata.error}</p>}
      {metadata.data && <>
        <div className="flex-1 min-h-48 relative rounded-xl overflow-hidden">
          <MapContainer center={center} zoom={5} preferCanvas style={{height: '100%', width: '100%', background: '#152132'}}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors · Model data: NOAA ARL" />
            <CircleMarker center={[metadata.data.source_location.lat, metadata.data.source_location.lon]} radius={6} pathOptions={{color: '#60a5fa', fillOpacity: 1}}>
              <Tooltip permanent direction="left">Original model release · {metadata.data.release_at}</Tooltip>
            </CircleMarker>
            {frame.data && <GeoJSON key={index} data={frame.data} style={feature => ({color: bandColor(feature.properties.relative_min), fillColor: bandColor(feature.properties.relative_min), fillOpacity: 0.65, weight: 0.5})}
              onEachFeature={(feature, layer) => layer.bindTooltip('HYSPLIT I131 model contour · ' + feature.properties.relative_min + '–' + feature.properties.relative_max + ' of scenario peak')} />}
          </MapContainer>
          {(frame.loading || frame.error) && <p role="status" className="absolute top-3 right-3 z-[500] bg-gray-950/95 px-3 py-2 text-sm">{frame.error ? `Frame unavailable: ${frame.error}` : 'Loading interval…'}</p>}
        </div>
        <div className="rounded-xl border border-gray-700 bg-gray-900 p-3 space-y-2">
          <div className="flex flex-wrap justify-between items-center gap-3 text-sm">
            <button className="bg-blue-600 rounded-lg px-4 py-2" onClick={() => setPlaying(value => !value)} disabled={count < 2}>{playing ? 'Pause replay' : 'Play replay'}</button>
            <time>{time?.from.replace('T', ' ').replace('+00:00', '')} → {time?.to.replace('T', ' ').replace('+00:00', '')} UTC</time>
            <span>Interval {index + 1} / {count}</span>
          </div>
          <input className="w-full accent-amber-400" aria-label="Historical HYSPLIT interval" type="range" min="0" max={Math.max(0, count - 1)} step="1" value={index} onChange={e => { setPlaying(false); setIndex(Number(e.target.value)); }} />
          <div className="flex flex-wrap gap-3 text-xs">{colors.map((color, i) => <span key={color} className="flex items-center gap-1"><span className="inline-block w-3 h-3" style={{background: color}} />{Math.pow(10, i - 6).toExponential(0)} of peak</span>)}</div>
          <p className="text-xs text-amber-200">{metadata.data.limitations}</p>
          <p className="text-xs text-gray-400">Meteorology: {metadata.data.meteorology} · Layer top: {metadata.data.layer_top_m} m · Peak scale is fixed across all intervals. Values below {metadata.data.display_min_fraction} of peak are omitted.</p>
          <a className="text-xs text-blue-400 underline" href={metadata.data.source_url} target="_blank" rel="noreferrer">Original NOAA output and provenance</a>
        </div>
      </>}
    </div>
  );
}
