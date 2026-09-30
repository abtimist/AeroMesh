import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Search, Sun, Moon, Radio, CheckCircle, AlertTriangle, XCircle, Database } from 'lucide-react';
import { useResource } from '../api';

export default function Topbar({ dark, onToggleDark }) {
  const [open, setOpen] = useState(false);
  const [providerOpen, setProviderOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [provStatus, setProvStatus] = useState(null);
  const ref = useRef(null);
  const provRef = useRef(null);
  const navigate = useNavigate();
  const events = useResource('/api/data/events?node=all');
  const records = events.data || [];
  const matches = records.filter(event => `${event.id} ${event.event_type} ${event.source} ${event.lat} ${event.lon}`.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    fetch('/api/providers/status')
      .then(r => r.json())
      .then(d => setProvStatus(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const close = e => {
      if (!ref.current?.contains(e.target)) { setOpen(false); setQuery(''); }
      if (!provRef.current?.contains(e.target)) { setProviderOpen(false); }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  function select(event) {
    setQuery(''); setOpen(false);
    navigate(`/map?event=${event.id}`);
  }

  const liveFeedsCount = (provStatus?.nasa_firms?.status === 'connected' ? 1 : 0) + (provStatus?.waqi?.status === 'connected' ? 1 : 0);

  return <header ref={ref} onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setProviderOpen(false); setQuery(''); } }}
    className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center justify-between gap-3 px-3 sm:px-4 z-[1000] rounded-3xl backdrop-blur-md border shadow-xl w-[calc(100%-2rem)] max-w-4xl h-16"
    style={{ background: dark ? 'rgba(15,15,20,.9)' : 'rgba(255,255,255,.94)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}>
    <Link to="/" aria-label="AeroMesh home" className="flex items-center gap-2 shrink-0"><img src="/icon.png" alt="" className="w-8 h-8" /><span className="font-semibold text-sm hidden sm:inline">AeroMesh</span></Link>
    <form role="search" className="flex-1 min-w-0 relative" onSubmit={e => { e.preventDefault(); if (matches.length) select(matches[0]); }}>
      <Search aria-hidden="true" size={16} className="absolute left-3 top-3" />
      <input aria-label="Search recorded events by ID, type, source or coordinates" placeholder="Search recorded events" value={query} onChange={e => { setQuery(e.target.value); setOpen(false); }} className="w-full rounded-full pl-9 pr-3 py-2 text-sm border border-slate-500/30 bg-transparent" />
    </form>

    {/* Providers Status Button */}
    <div className="relative" ref={provRef}>
      <button
        onClick={() => setProviderOpen(!providerOpen)}
        title="View live provider and satellite telemetry status"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border border-slate-500/20 hover:bg-slate-500/10 transition-colors"
      >
        <span className="relative flex h-2 w-2">
          {liveFeedsCount > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${liveFeedsCount > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
        </span>
        <Radio size={14} className="text-blue-500 hidden sm:inline" />
        <span className="hidden sm:inline">Live Feeds</span>
        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-500 font-bold">{liveFeedsCount}/3</span>
      </button>

      {providerOpen && (
        <div
          className="absolute top-full mt-2 right-0 w-80 sm:w-96 rounded-2xl border p-4 shadow-2xl z-[1010] text-left text-xs"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
        >
          <div className="flex items-center justify-between pb-3 border-b mb-3" style={{ borderColor: 'var(--color-border)' }}>
            <div>
              <h3 className="font-semibold text-sm">Telemetry & API Feeds</h3>
              <p className="text-[11px] opacity-70">Real-time status of configured upstream keys</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wide">
              {liveFeedsCount} Active
            </span>
          </div>

          <div className="space-y-3">
            {/* NASA FIRMS */}
            <div className="p-2.5 rounded-xl border flex items-start gap-2.5" style={{ background: 'var(--color-surface-hover)', borderColor: 'var(--color-border)' }}>
              {provStatus?.nasa_firms?.status === 'connected' ? (
                <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs">NASA FIRMS (VIIRS Satellite)</span>
                  <span className={`text-[10px] font-bold ${provStatus?.nasa_firms?.status === 'connected' ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {provStatus?.nasa_firms?.status === 'connected' ? 'CONNECTED' : 'DISCONNECTED'}
                  </span>
                </div>
                <p className="text-[11px] opacity-80 mt-0.5">
                  {provStatus?.nasa_firms?.status === 'connected'
                    ? `Active fire telemetry active (${provStatus.nasa_firms.latency_ms}ms) · ${provStatus.nasa_firms.transaction_limit} limit / ${provStatus.nasa_firms.transaction_interval}`
                    : provStatus?.nasa_firms?.message || 'NASA FIRMS key not verified.'}
                </p>
              </div>
            </div>

            {/* WAQI */}
            <div className="p-2.5 rounded-xl border flex items-start gap-2.5" style={{ background: 'var(--color-surface-hover)', borderColor: 'var(--color-border)' }}>
              {provStatus?.waqi?.status === 'connected' ? (
                <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <XCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs">WAQI (World Air Quality Index)</span>
                  <span className={`text-[10px] font-bold ${provStatus?.waqi?.status === 'connected' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {provStatus?.waqi?.status === 'connected' ? 'CONNECTED' : 'FAILED'}
                  </span>
                </div>
                <p className="text-[11px] opacity-80 mt-0.5">
                  {provStatus?.waqi?.status === 'connected'
                    ? `Live monitoring station feed active (${provStatus.waqi.latency_ms}ms). Current AQI: ${provStatus.waqi.current_aqi}`
                    : provStatus?.waqi?.message || 'WAQI API key issue'}
                </p>
              </div>
            </div>

            {/* OpenAQ */}
            <div className="p-2.5 rounded-xl border flex items-start gap-2.5" style={{ background: 'var(--color-surface-hover)', borderColor: 'var(--color-border)' }}>
              {provStatus?.openaq?.status === 'connected' ? (
                <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs">OpenAQ v3 API</span>
                  <span className={`text-[10px] font-bold ${provStatus?.openaq?.status === 'connected' ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {provStatus?.openaq?.status === 'connected' ? 'CONNECTED' : '401 UNAUTHORIZED'}
                  </span>
                </div>
                <p className="text-[11px] opacity-80 mt-0.5">
                  {provStatus?.openaq?.status === 'connected'
                    ? `OpenAQ authenticated (${provStatus.openaq.latency_ms}ms)`
                    : 'OpenAQ responded "Invalid credentials". Check if the key needs activation or was truncated.'}
                </p>
              </div>
            </div>

            {/* Database URL */}
            <div className="p-2.5 rounded-xl border flex items-start gap-2.5" style={{ background: 'var(--color-surface-hover)', borderColor: 'var(--color-border)' }}>
              <Database size={16} className="text-blue-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs">DATABASE_URL</span>
                  <span className="text-[10px] font-bold text-blue-500">CONFIGURED</span>
                </div>
                <p className="text-[11px] opacity-80 mt-0.5">
                  Local Postgres URL set.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

    <Link to="/report" className="text-xs sm:text-sm whitespace-nowrap text-blue-500 font-medium">Report</Link>
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

