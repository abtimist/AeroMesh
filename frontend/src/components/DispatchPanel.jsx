import { useState } from 'react';
import { fetchJSON } from '../api';

export default function DispatchPanel({ event }) {
  const [token, setToken] = useState('');
  const [resources, setResources] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const input = 'block w-full mt-1 rounded bg-gray-800 border border-gray-600 p-2';
  const headers = { 'Content-Type': 'application/json', 'X-Operator-Token': token };
  async function refresh() {
    const [units, runs] = await Promise.all([fetchJSON('/api/citizen/resources', { headers }), fetchJSON(`/api/citizen/events/${event.id}/assignments`, { headers })]);
    setResources(units); setAssignments(runs);
  }
  async function action(fn) { setBusy(true); setMessage(''); try { await fn(); await refresh(); } catch (err) { setMessage(err.message); } finally { setBusy(false); } }
  const active = assignments.find(a => !['completed', 'cancelled'].includes(a.status));
  return <details className="text-sm border-t border-gray-700 pt-3">
    <summary className="cursor-pointer font-semibold">Dispatch planning and resource allocation</summary>
    <p className="text-xs text-amber-200 my-3">Persisted dispatch simulation. Only resources entered by an operator can be assigned. No emergency agency is contacted. Selection uses straight-line distance, capability, availability and service radius—not road ETA.</p>
    <label>Operator token (if configured)<input type="password" value={token} onChange={e => setToken(e.target.value)} autoComplete="off" className={input} /></label>
    <button disabled={busy} onClick={() => action(refresh)} className="underline text-blue-300 my-2">Load resources and assignment history</button>
    <p>{resources.length} resource records loaded · {resources.filter(r => r.enabled && !r.busy_assignment_id).length} available</p>
    <details className="my-3"><summary className="cursor-pointer">Register a resource</summary>
      <form className="space-y-2 mt-2" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); action(() => fetchJSON('/api/citizen/resources', { method: 'POST', headers, body: JSON.stringify({name:f.get('name'), lat:Number(f.get('lat')), lon:Number(f.get('lon')), capability:f.get('capability'), service_radius_km:Number(f.get('radius'))}) })); }}>
        <label>Name<input name="name" minLength="2" maxLength="120" required className={input}/></label>
        <div className="grid grid-cols-2 gap-2"><label>Actual latitude<input type="number" name="lat" min="-90" max="90" step="any" required className={input}/></label><label>Actual longitude<input type="number" name="lon" min="-180" max="180" step="any" required className={input}/></label></div>
        <label>Capability<select name="capability" className={input}><option value="inspection">Inspection</option><option value="fire_response">Fire response</option><option value="air_sampling">Air sampling</option></select></label>
        <label>Service radius (km)<input type="number" name="radius" min="1" max="500" defaultValue="50" required className={input}/></label>
        <button disabled={busy} className="rounded bg-blue-600 p-2">Register resource</button>
      </form>
    </details>
    {resources.map(r => <p key={r.id} className="text-xs text-gray-400">{r.name} · {r.capability} · {r.lat.toFixed(3)}, {r.lon.toFixed(3)} · {r.busy_assignment_id ? 'Assigned' : r.enabled ? 'Available' : 'Disabled'}</p>)}
    {!active && <form className="space-y-2 mt-3" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); action(() => fetchJSON(`/api/citizen/events/${event.id}/assignments`, {method:'POST', headers, body:JSON.stringify({capability:f.get('capability'),note:f.get('note')})})); }}>
      <label>Required capability<select name="capability" className={input}><option value="inspection">Inspection</option><option value="fire_response">Fire response</option><option value="air_sampling">Air sampling</option></select></label>
      <label>Allocation reason<textarea name="note" required minLength="5" maxLength="1000" className={input}/></label>
      <button disabled={busy} className="rounded bg-blue-600 p-2">Assign nearest available resource</button>
    </form>}
    {assignments.map(a => <article key={a.id} className="border border-gray-700 rounded p-3 mt-3 space-y-1"><p>{a.resource_name} · {a.status} · {a.distance_km.toFixed(2)} km straight-line</p><p className="text-xs text-gray-400">{a.audit.map(item => `${item.status} (${new Date(item.at).toLocaleString()})`).join(' → ')}</p>
      {!['completed','cancelled'].includes(a.status) && <form onSubmit={e=>{ e.preventDefault(); const f=new FormData(e.currentTarget); action(()=>fetchJSON(`/api/citizen/assignments/${a.id}/status`,{method:'POST',headers,body:JSON.stringify({status:f.get('status'),note:f.get('note')})})); }} className="space-y-2">
        <label>Next status<select name="status" className={input}>{({assigned:['en_route','cancelled'],en_route:['on_scene','cancelled'],on_scene:['completed','cancelled']}[a.status] || []).map(status=><option key={status}>{status}</option>)}</select></label>
        <label>Operator update<textarea name="note" required minLength="5" maxLength="1000" className={input}/></label><button disabled={busy} className="rounded border border-blue-500 p-2">Save status</button>
      </form>}
    </article>)}
    {message && <p role="alert" className="text-amber-300 mt-2">{message}</p>}
  </details>;
}
