import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, MapPin, Clock, ArrowLeft } from 'lucide-react';
import { API_BASE, fetchJSON, useResource } from '../api';
import { validatePhoto, reportLocation, loadReportIds, addReportId, nearbyRecords, REPORT_IDS_KEY } from '../citizenReports';

function ReportResult({ id }) {
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let stopped = false, timer;
    async function refresh() {
      try {
        const row = await fetchJSON(`/api/citizen/reports/${id}`);
        if (stopped) return;
        setReport(row); setError('');
        if (!['completed', 'failed'].includes(row.status)) timer = setTimeout(refresh, 3000);
      } catch (err) { if (!stopped) { setError(err.message); timer = setTimeout(refresh, 10000); } }
    }
    refresh();
    return () => { stopped = true; clearTimeout(timer); };
  }, [id]);
  return <article className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
    <h3 className="font-medium break-all">Report {id}</h3>
    {error && <p role="alert">{error}</p>}
    {!report ? <p>Loading saved report…</p> : <>
      <p>{report.status} · {new Date(report.created_at).toLocaleString()}</p>
      <p className="text-sm text-slate-400">{report.lat.toFixed(4)}, {report.lon.toFixed(4)} · {report.location_source}{report.accuracy_m != null ? ` ±${Math.round(report.accuracy_m)} m` : ''}</p>
      {report.error && <p role="alert" className="text-amber-300">{report.error}</p>}
      {report.result && <>
        <p>Model classification: <strong>{report.result.label}</strong> ({(report.result.score * 100).toFixed(1)}% model score)</p>
        <p className="text-xs text-slate-400">{Object.entries(report.result.scores).map(([label, score]) => `${label}: ${(score * 100).toFixed(1)}%`).join(' · ')}</p>
        <p className="text-xs text-amber-200">{report.result.interpretation}</p>
        <p className="text-xs text-slate-400">{report.result.model} · {report.result.inference_ms} ms</p>
      </>}
      {report.event_id && <p>Linked unverified event #{report.event_id} is available for operator review on the map.</p>}
      <a href={API_BASE + report.image_url} target="_blank" rel="noreferrer" className="text-blue-300 underline">View submitted photo</a>
    </>}
  </article>;
}

export default function CitizenPortalPage() {
  const [tab, setTab] = useState('report');
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [gpsBusy, setGpsBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [ids, setIds] = useState(() => loadReportIds(localStorage));
  const model = useResource('/api/citizen/model', 60000);
  const conditions = useResource(location ? `/api/citizen/conditions?lat=${location.lat}&lon=${location.lon}` : null, 600000);
  const events = useResource(tab === 'nearby' ? '/api/data/events?node=all' : null, 60000);
  const nearby = nearbyRecords(events.data || [], location);
  const input = 'block w-full mt-1 rounded-xl border border-white/15 bg-slate-900 p-3 text-white';
  function gps() {
    setGpsBusy(true); setLocationError('');
    if (!navigator.geolocation) { setLocationError('GPS is unavailable. Enter coordinates explicitly.'); setGpsBusy(false); return; }
    navigator.geolocation.getCurrentPosition(p => {
      setLocation({ source: 'gps', lat: p.coords.latitude, lon: p.coords.longitude, accuracy_m: p.coords.accuracy }); setGpsBusy(false);
    }, e => { setLocationError(`Location unavailable: ${e.message}. Enter coordinates explicitly or grant location access.`); setGpsBusy(false); }, { timeout: 10000, maximumAge: 0, enableHighAccuracy: true });
  }
  function manual(e) {
    e.preventDefault(); const form = new FormData(e.currentTarget);
    try { const value = reportLocation({ source: 'manual', lat: form.get('lat'), lon: form.get('lon') }); setLocation({ ...value, source: 'manual' }); setLocationError(''); }
    catch (err) { setLocationError(err.message); }
  }
  async function submit(e) {
    e.preventDefault(); setError(''); setNotice('');
    const formElement = e.currentTarget;
    const form = new FormData(formElement);
    const photoError = validatePhoto(form.get('photo'));
    if (photoError) { setError(photoError); return; }
    try {
      const coords = reportLocation(location || {});
      for (const [key, value] of Object.entries(coords)) form.set(key, String(value));
      setUploading(true);
      const result = await fetchJSON('/api/citizen/reports', { method: 'POST', body: form });
      const next = addReportId(ids, result.id);
      setIds(next);
      try { localStorage.setItem(REPORT_IDS_KEY, JSON.stringify(next)); } catch { setNotice('Browser storage is unavailable; save your report ID before leaving.'); }
      formElement.reset(); setTab('history');
    } catch (err) { setError(err.message); } finally { setUploading(false); }
  }
  const weather = conditions.data?.weather, air = conditions.data?.air_quality;
  return <main className="h-screen overflow-y-auto bg-slate-950 text-slate-100 px-4 py-6 sm:py-10">
    <div className="max-w-2xl mx-auto space-y-6">
      <Link to="/" className="inline-flex gap-2 text-slate-300"><ArrowLeft size={18} /> AeroMesh home</Link>
      <header><h1 className="text-3xl font-bold">Citizen portal</h1><p className="text-slate-400 mt-2">Report visible smoke or fire with a photo and an explicit location.</p></header>
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-blue-950/70 to-slate-900 p-5 space-y-3">
        <h2 className="font-semibold flex gap-2"><MapPin size={20} /> Your report location</h2>
        <button onClick={gps} disabled={gpsBusy} className="rounded-xl bg-blue-600 px-4 py-2 disabled:opacity-50">{gpsBusy ? 'Locating…' : 'Use my GPS location'}</button>
        <details><summary className="cursor-pointer text-sm">Enter coordinates manually</summary><form onSubmit={manual} className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <label>Latitude<input className={input} name="lat" type="number" min="-90" max="90" step="any" required /></label>
          <label>Longitude<input className={input} name="lon" type="number" min="-180" max="180" step="any" required /></label>
          <button className="col-span-2 rounded-xl border border-blue-400 p-2">Set report location</button>
        </form></details>
        {location && <p>{location.lat.toFixed(4)}, {location.lon.toFixed(4)} · {location.source}{location.accuracy_m != null ? ` ±${Math.round(location.accuracy_m)} m` : ''}</p>}
        {locationError && <p role="alert" className="text-amber-300">{locationError}</p>}
        {!location && <p className="text-sm text-slate-400">No location selected. We never substitute a default city.</p>}
      </section>
      {location && <section aria-label="Local forecast" className="rounded-2xl border border-white/10 p-4 text-sm space-y-2">
        <h2 className="font-semibold">Local forecast, not a ground observation</h2>
        {conditions.loading && <p>Fetching current forecast…</p>}
        {conditions.error && <p role="alert">{conditions.error}</p>}
        {weather && <p>Weather: {weather.status === 'available' ? `${weather.current.temperature_2m ?? 'Unavailable'} °C · wind ${weather.current.wind_speed_10m ?? 'Unavailable'} m/s · ${weather.current.wind_direction_10m ?? 'Unavailable'}° from` : 'Unavailable'} · {weather.source}</p>}
        {air && <p>Air forecast: {air.status === 'available' ? `PM2.5 ${air.current.pm2_5 ?? 'Unavailable'} µg/m³ · US AQI ${air.current.us_aqi ?? 'Unavailable'}` : 'Unavailable'} · {air.source}</p>}
        {air?.current?.time && <p className="text-xs text-slate-400">Valid {air.current.time} UTC</p>}
      </section>}
      <nav className="flex gap-2" aria-label="Citizen portal tabs">{[['report', Camera, 'New report'], ['history', Clock, 'My reports'], ['nearby', MapPin, 'Nearby events']].map(([key, Icon, label]) => <button key={key} onClick={() => setTab(key)} aria-pressed={tab === key} className={`flex flex-1 justify-center items-center gap-2 p-3 rounded-xl text-sm ${tab === key ? 'bg-blue-600' : 'bg-slate-800'}`}><Icon size={16} />{label}</button>)}</nav>
      {notice && <p role="status">{notice}</p>}
      {tab === 'report' && <form onSubmit={submit} className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-4">
        <h2 className="text-xl font-semibold">Submit a photo for analysis</h2>
        <p className="text-sm text-slate-400">Photos stay on this server. Embedded metadata is removed. A local model suggests fire, smoke or normal; a human must verify it.</p>
        <label className="block">Photo<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required className={input} /></label>
        <p className="text-xs text-slate-400">JPEG, PNG or WebP; maximum 10 MiB and 24 megapixels.</p>
        <label className="block">What did you observe?<textarea name="description" maxLength="1000" className={input} /></label>
        {model.data?.status !== 'ready' && <p className="text-amber-300">{model.error || 'Classifier is not ready. The server operator must install the local model before reports can be processed.'}</p>}
        {error && <p role="alert" className="text-amber-300">{error}</p>}
        <button disabled={uploading || !location || model.data?.status !== 'ready'} className="w-full bg-blue-600 rounded-xl p-3 font-semibold disabled:opacity-40">{uploading ? 'Uploading…' : 'Submit report'}</button>
      </form>}
      {tab === 'history' && <section className="space-y-3"><h2 className="text-xl font-semibold">Saved on this device</h2><p className="text-xs text-slate-400">Report IDs act as private viewing links. Keep them private. Clearing browser storage removes this local history, not server records.</p>{!ids.length && <p>No reports submitted on this device.</p>}{ids.map(id => <ReportResult key={id} id={id} />)}</section>}
      {tab === 'nearby' && <section className="space-y-3"><h2 className="text-xl font-semibold">Recorded events within 50 km</h2>{!location ? <p>Choose your location first.</p> : events.error ? <p role="alert">{events.error}</p> : events.loading ? <p>Loading recorded events…</p> : nearby.length ? nearby.slice(0, 50).map(e => <article key={e.id} className="rounded-xl bg-white/5 p-3"><p>#{e.id} · {e.event_type?.replaceAll('_', ' ')} · {e.distance_km.toFixed(1)} km</p><p className="text-xs text-slate-400">{e.detected_at ? new Date(e.detected_at).toLocaleString() : 'Time unavailable'} · {e.source} · {e.provenance_status}</p></article>) : <p>No recorded events nearby. This is not a guarantee of clean air.</p>}<Link className="block text-blue-300 underline" to="/map">Open full map</Link></section>}
    </div>
  </main>;
}
