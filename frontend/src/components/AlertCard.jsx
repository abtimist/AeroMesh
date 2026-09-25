import { useState } from 'react';
import { Clock, ChevronDown, ChevronUp, Navigation, Loader2, CheckCircle2 } from 'lucide-react';
import StatusBadge from './StatusBadge';

const SEVERITY_BORDER = {
  LOW:      'border-l-green-400',
  MEDIUM:   'border-l-orange-400',
  HIGH:     'border-l-red-500',
  CRITICAL: 'border-l-[#7e0023]',
};

export default function AlertCard({ event }) {
  const [expanded, setExpanded] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState('idle'); // idle, loading, success
  const [unit, setUnit] = useState(null);

  const {
    id = '#EV-0001',
    severity = 'CRITICAL',
    location = 'Delhi (Okhla Industrial Area)',
    time = '14:32',
    pm25 = 452,
    aqi = 480,
    wind = '12 km/h NW',
    source = 'Industrial Emission Spike',
    confidence = 94,
    plume = 'PBLH 1100m | Wind 3m/s NW',
    sources = ['Continuous Emission Monitoring System (CEMS)', 'Ground Sensor (AQI 480)', 'Satellite: Sentinel-5P NO2'],
  } = event || {};

  const handleDispatch = async (e) => {
    e.stopPropagation();
    if (dispatchStatus !== 'idle') return;

    setDispatchStatus('loading');
    try {
      // In a real app we would use the actual event id instead of parsing mock string id
      const numericalId = parseInt(id.replace(/[^0-9]/g, ''), 10) || 9942;
      const res = await fetch(`http://localhost:8000/api/analysis/dispatch/${numericalId}`, { method: 'POST' });
      if (!res.ok) throw new Error('Dispatch failed');
      const data = await res.json();
      setUnit(data.unit);
      setDispatchStatus('success');
    } catch (err) {
      console.error(err);
      setDispatchStatus('idle'); // Reset on failure
    }
  };

  return (
    <div
      className={`rounded-lg border border-l-[3px] ${SEVERITY_BORDER[severity] || 'border-l-slate-300'} transition-colors cursor-pointer alert-card`}
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      onClick={() => setExpanded(v => !v)}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--color-surface)'}
    >
      {/* ── Summary row ── */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
              <Clock className="w-3 h-3" />{time}
            </span>
            <StatusBadge level={severity} compact />
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 shrink-0" style={{ color: 'var(--color-text-secondary)' }} />
          ) : (
            <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--color-text-secondary)' }} />
          )}
        </div>

        <p className="font-semibold text-sm leading-snug" style={{ color: 'var(--color-text-primary)' }}>{location}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
          PM2.5: <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{pm25} µg/m³</span>
          {' · '}AQI: <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{aqi}</span>
          {' · '}Wind: <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{wind}</span>
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-disabled)' }}>
          Source: {source} ({confidence}% conf.)
        </p>
      </div>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div className="px-4 pb-4 pt-3 space-y-3" style={{ borderTop: '1px solid var(--color-border)' }}>
          <div>
            <p className="text-[10px] uppercase tracking-widest font-medium mb-1" style={{ color: 'var(--color-text-disabled)' }}>Plume Forecast</p>
            <p className="text-xs font-mono" style={{ color: 'var(--color-text-primary)' }}>{plume}</p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest font-medium mb-1" style={{ color: 'var(--color-text-disabled)' }}>Evidence Sources</p>
            <ul className="space-y-1">
              {sources.map((s, i) => (
                <li key={i} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={handleDispatch}
            disabled={dispatchStatus !== 'idle'}
            className={`w-full flex items-center justify-center gap-2 py-2 text-white text-xs font-semibold rounded-lg transition ${
              dispatchStatus === 'success' ? 'bg-green-600' : ''
            }`}
            style={{ background: dispatchStatus === 'success' ? '#16a34a' : 'var(--color-primary)' }}
            onMouseEnter={e => { if (dispatchStatus === 'idle') e.currentTarget.style.filter = 'brightness(1.1)'; }}
            onMouseLeave={e => { if (dispatchStatus === 'idle') e.currentTarget.style.filter = 'brightness(1)'; }}
          >
            {dispatchStatus === 'loading' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Dispatching...
              </>
            ) : dispatchStatus === 'success' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Inspector Dispatched ({unit})
              </>
            ) : (
              <>
                <Navigation className="w-3.5 h-3.5" />
                Dispatch Inspector
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
