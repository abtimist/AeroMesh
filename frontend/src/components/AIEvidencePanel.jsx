import { useState } from 'react';
import { API_BASE, fetchJSON, useResource } from '../api';
import LiveTransportForm from './LiveTransportForm';
import DispatchPanel from './DispatchPanel';

export default function AIEvidencePanel({ event, onClose, onDemo, modelStatus }) {
  const { data, loading, error } = useResource(`/api/evidence/${event.id}`, 15000);
  const [imageFailed, setImageFailed] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submit = async e => {
    e.preventDefault();
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    try {
      const body = {
        start_at: new Date(form.get('start') + 'Z').toISOString(),
        release_bottom_m: Number(form.get('bottom')), release_top_m: Number(form.get('top')),
        release_duration_minutes: Number(form.get('release')), duration_hours: Number(form.get('duration')),
        averaged_layer_top_m: Number(form.get('layer')), assumptions: form.get('assumptions'),
      };
      const result = await fetchJSON(`/api/dispersion/events/${event.id}/runs`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Operator-Token': form.get('token') }, body: JSON.stringify(body),
      });
      setMessage(`Run ${result.id} submitted. NOAA processing is asynchronous; status is checked every five minutes.`);
    } catch (err) { setMessage(err.message); }
    finally { setSubmitting(false); }
  };
  const input = 'w-full rounded bg-gray-800 border border-gray-600 px-2 py-1 mt-1';
  return (
    <div className="fixed inset-0 z-[1100] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-label="Event evidence" className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-700 bg-gray-950 text-gray-200 shadow-xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between"><h2 className="font-semibold">Event #{event.id} · Evidence</h2><button aria-label="Close evidence" onClick={onClose}>Close</button></div>
        <p className="text-xs text-gray-400">{event.lat.toFixed(4)}, {event.lon.toFixed(4)} · Observed {new Date(event.detected_at).toLocaleString()}</p>
        {loading && <p>Loading evidence…</p>}{error && <p role="alert">Evidence unavailable: {error}</p>}
        {data && <>
          <div className="text-sm rounded-xl bg-gray-900 p-3 space-y-1">
            <p>Source: {data.fire.source || 'Unverified legacy record'}</p>
            {data.fire.status === 'available' ? <>
              <p>Fire radiative power: {data.fire.frp_mw ?? 'Unavailable'} MW</p>
              <p>Provider confidence category: {data.fire.confidence_category ?? 'Unavailable'}</p>
              <p>{data.fire.satellite} {data.fire.instrument}</p>
            </> : <p className="text-amber-300">{data.fire.note}</p>}
          </div>
          <figure className="space-y-2">
            <h3 className="text-sm font-semibold">Satellite observation context</h3>
            {imageFailed ? <div className="p-8 bg-gray-900 text-center text-gray-400">Imagery unavailable for this location and date.</div> : <div className="relative">
              <img className="rounded-xl w-full bg-gray-800 min-h-32" src={API_BASE + data.satellite.image_url} alt={`Terra MODIS imagery around event ${event.id} on ${data.satellite.date}`} onError={() => setImageFailed(true)} />
              <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-red-500 text-3xl pointer-events-none">+</span>
            </div>}
            <figcaption className="text-xs text-gray-400 space-y-1">
              <p>{data.satellite.source} · {data.satellite.date} UTC · {data.satellite.layer}</p>
              <p>{data.satellite.acquisition_note} Transparent areas have no imagery.</p>
            </figcaption>
          </figure>
          <div className="text-xs text-gray-400 space-y-2">
            <h3 className="text-gray-200 font-semibold">Nearby recorded measurements</h3>
            {!data.nearby_measurements?.length && <p>No readings within 50 km in the six hours preceding this event.</p>}
            {(data.nearby_measurements || []).map((reading, i) => <p key={i}>{reading.station}: {reading.pm25} {reading.units} · {reading.distance_km} km · {new Date(reading.observed_at).toLocaleString()} · {reading.source} ({reading.provenance_status})</p>)}
          </div>
          <p className="text-xs text-gray-400">Sensor anomaly: unavailable. {data.sensor_anomaly.reason}</p>
          <DispatchPanel key={event.id} event={event} />
          <div className="text-sm space-y-2"><h3 className="font-semibold">Transport / HYSPLIT runs</h3>
            {!data.dispersion_runs.length && <p className="text-gray-400">No model run for this event.</p>}
            {data.dispersion_runs.map(run => <p key={run.id}>{run.status} · {new Date(run.created_at).toLocaleString()}{run.error ? ` — ${run.error}` : ''}</p>)}
          </div>
        </>}
        <LiveTransportForm eventId={event.id} />
        <p className="text-xs text-amber-300">{modelStatus?.message || 'Checking dispersion configuration…'}</p>
        <button onClick={onDemo} className="w-full rounded-lg border border-amber-600 text-amber-200 px-4 py-2">View historical HYSPLIT demonstration</button>
        {modelStatus?.status === 'configured' && <details className="text-sm">
          <summary className="cursor-pointer font-semibold">Run a relative dispersion scenario</summary>
          <form onSubmit={submit} className="space-y-3 mt-3">
            <p className="text-xs text-gray-400">Generic unit release with no estimated emissions. Results are relative, not PM2.5 concentration. Height, duration and continued burning are operator assumptions.</p>
            <label className="block">Start (UTC)<input required name="start" type="datetime-local" defaultValue={new Date().toISOString().slice(0, 16)} className={input} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label>Release bottom (m)<input required name="bottom" type="number" min="0" max="9999" defaultValue="0" className={input} /></label>
              <label>Release top (m)<input required name="top" type="number" min="1" max="10000" defaultValue="100" className={input} /></label>
              <label>Release (minutes)<input required name="release" type="number" min="1" max="1440" defaultValue="60" className={input} /></label>
              <label>Simulation (hours)<input required name="duration" type="number" min="1" max="24" defaultValue="24" className={input} /></label>
            </div>
            <label className="block">Averaged layer top (m)<input required name="layer" type="number" min="100" max="10000" defaultValue="100" className={input} /></label>
            <label className="block">Release assumptions / evidence<textarea required name="assumptions" minLength="10" maxLength="1000" className={input} /></label>
            <label className="block">Operator token<input required name="token" type="password" autoComplete="off" className={input} /></label>
            <button disabled={submitting} className="rounded-lg bg-blue-600 px-4 py-2 disabled:opacity-50">{submitting ? 'Submitting…' : 'Submit model run'}</button>
          </form>
        </details>}
        {message && <p role="status" className="text-sm">{message}</p>}
      </section>
    </div>
  );
}
