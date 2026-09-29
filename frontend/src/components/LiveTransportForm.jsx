import { useState } from 'react';
import { fetchJSON, useResource } from '../api';

export default function LiveTransportForm({ eventId }) {
  const [runId, setRunId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { data: run } = useResource(runId ? `/api/dispersion/runs/${runId}` : null, 3000);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    const form = new FormData(e.currentTarget);
    try {
      const response = await fetchJSON(`/api/dispersion/events/${eventId}/transport`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Operator-Token': form.get('token') || '' },
        body: JSON.stringify({ start_at: new Date(form.get('start') + 'Z').toISOString(),
          duration_hours: Number(form.get('duration')), release_duration_minutes: Number(form.get('release')),
          diffusivity_m2_s: Number(form.get('diffusion')), assumptions: form.get('assumptions') }),
      });
      setRunId(response.id);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  const input = 'block w-full bg-gray-800 border border-gray-600 rounded p-2 mt-1';
  return <details className="text-sm" open>
    <summary className="font-semibold cursor-pointer">Live GFS transport — no NOAA key</summary>
    <p className="text-xs text-amber-200 my-2">A 2-D passive-tracer scenario using current 10 m forecast winds. Diffusion and continued release are your assumptions. Not HYSPLIT, measured smoke, or PM2.5 concentration; no vertical motion or deposition.</p>
    <form onSubmit={submit} className="space-y-3">
      <label className="block">Start (UTC)<input required type="datetime-local" name="start" defaultValue={new Date().toISOString().slice(0, 16)} className={input} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label>Run (hours)<input required type="number" name="duration" min="1" max="24" defaultValue="6" className={input} /></label>
        <label>Release (minutes)<input required type="number" name="release" min="5" max="1440" step="5" defaultValue="60" className={input} /></label>
      </div>
      <label className="block">Assumed horizontal diffusivity (m²/s)<input required type="number" name="diffusion" min="0" max="2000" defaultValue="100" className={input} /></label>
      <label className="block">Release assumptions / evidence<textarea required name="assumptions" minLength="10" maxLength="1000" className={input} placeholder="Explain why a release at this time and location is plausible." /></label>
      <label className="block">Operator token (if configured)<input type="password" name="token" autoComplete="off" className={input} /></label>
      <button disabled={busy || run?.status === 'LOCAL_RUNNING'} className="rounded-lg bg-blue-600 p-2 disabled:opacity-50">{busy || run?.status === 'LOCAL_RUNNING' ? 'Calculating from live winds…' : 'Calculate transport'}</button>
    </form>
    {error && <p role="alert">{error}</p>}
    {run && <div role="status" className="mt-2 space-y-2">
      <p>{run.status}{run.error ? `: ${run.error}` : ''}</p>
      {run.status === 'COMPLETED' && <>
        <p>{run.result?.frames?.length} hourly endpoints calculated. Enable Plumes on the map and select a matching UTC time.</p>
        <p className="text-xs">Weather fetched {run.result?.meteorology?.fetched_at}. Grid: 25 event-centred samples; 5 km output cells.</p>
        <button className="underline" onClick={() => {
          const url = URL.createObjectURL(new Blob([JSON.stringify(run, null, 2)], { type: 'application/json' }));
          const a = document.createElement('a'); a.href = url; a.download = `transport-${run.id}.json`; a.click(); URL.revokeObjectURL(url);
        }}>Download result, input winds and assumptions</button>
      </>}
    </div>}
  </details>;
}
