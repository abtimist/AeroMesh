import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Search, Sun, Moon } from 'lucide-react';
import { useResource } from '../api';

export default function Topbar({ dark, onToggleDark }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);
  const navigate = useNavigate();
  const events = useResource('/api/data/events?node=all');
  const records = events.data || [];
  const matches = records.filter(event => `${event.id} ${event.event_type} ${event.source} ${event.lat} ${event.lon}`.toLowerCase().includes(query.trim().toLowerCase()));
  useEffect(() => {
    const close = e => { if (!ref.current?.contains(e.target)) { setOpen(false); setQuery(''); } };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  function select(event) {
    setQuery(''); setOpen(false);
    navigate(`/map?event=${event.id}`);
  }
  return <header ref={ref} onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setQuery(''); } }}
    className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center justify-between gap-3 px-3 sm:px-4 z-[1000] rounded-3xl backdrop-blur-md border shadow-xl w-[calc(100%-2rem)] max-w-3xl h-16"
    style={{ background: dark ? 'rgba(15,15,20,.9)' : 'rgba(255,255,255,.94)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}>
    <Link to="/" aria-label="AeroMesh home" className="flex items-center gap-2 shrink-0"><img src="/icon.png" alt="" className="w-8 h-8" /><span className="font-semibold text-sm hidden sm:inline">AeroMesh</span></Link>
    <form role="search" className="flex-1 min-w-0 relative" onSubmit={e => { e.preventDefault(); if (matches.length) select(matches[0]); }}>
      <Search aria-hidden="true" size={16} className="absolute left-3 top-3" />
      <input aria-label="Search recorded events by ID, type, source or coordinates" placeholder="Search recorded events" value={query} onChange={e => { setQuery(e.target.value); setOpen(false); }} className="w-full rounded-full pl-9 pr-3 py-2 text-sm border border-slate-500/30 bg-transparent" />
    </form>
    <Link to="/report" className="text-xs sm:text-sm whitespace-nowrap text-blue-500">Report</Link>
    <button onClick={onToggleDark} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} className="p-2 rounded-xl">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
    <button onClick={() => { setOpen(!open); setQuery(''); }} aria-label="Show recorded events" aria-expanded={open} className="relative p-2 rounded-xl"><Bell size={19} />{records.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-orange-500" />}</button>
    {(open || query.trim()) && <section aria-label="Recorded events" className="absolute top-full mt-2 left-0 right-0 border rounded-2xl shadow-xl overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <h2 className="p-4 text-sm font-semibold">{query.trim() ? `${matches.length} matching records` : `${records.length} recorded events`}</h2>
      <div className="max-h-72 overflow-y-auto px-2 pb-2">
        {events.error && <p role="alert" className="p-3 text-sm">Events unavailable: {events.error}</p>}
        {events.loading && <p className="p-3 text-sm">Loading recorded events…</p>}
        {!events.loading && !events.error && !matches.length && <p className="p-3 text-sm">No matching events recorded.</p>}
        {matches.slice(0, 30).map(event => <button key={event.id} onClick={() => select(event)} className="w-full text-left rounded-xl p-3 hover:bg-blue-500/10 focus-visible:bg-blue-500/10">
          <span className="block text-sm font-medium">#{event.id} · {event.event_type.replaceAll('_', ' ')}</span>
          <span className="block text-xs opacity-70">{event.lat.toFixed(3)}, {event.lon.toFixed(3)} · {new Date(event.detected_at).toLocaleString()}</span>
          <span className="block text-xs opacity-70">{event.source} · {event.provenance_status}</span>
        </button>)}
        {matches.length > 30 && <p className="p-3 text-xs opacity-70">Showing the latest 30 matches. Search to narrow the list.</p>}
      </div>
    </section>}
  </header>;
}
