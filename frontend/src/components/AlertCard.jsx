// AlertCard — single event card in the slide-in panel
// Light bg, left border accent colored by AQI severity, expandable on click

import { useState } from 'react';
import { Clock, ChevronDown, ChevronUp, Navigation } from 'lucide-react';
import StatusBadge from './StatusBadge';

const SEVERITY_BORDER = {
  LOW:      'border-l-green-400',
  MEDIUM:   'border-l-orange-400',
  HIGH:     'border-l-red-500',
  CRITICAL: 'border-l-[#7e0023]',
};

export default function AlertCard({ event }) {
  const [expanded, setExpanded] = useState(false);

  const {
    id = '#EV-0001',
    severity = 'CRITICAL',
    location = 'Delhi (Okhla)',
    time = '14:32',
    pm25 = 342,
    aqi = 391,
    wind = '18 km/h SE',
    source = 'Biomass Burning',
    confidence = 92,
    plume = 'PBLH 1200m | Wind 5m/s ESE',
    sources = ['NASA FIRMS', 'Ground Sensor (AQI 450)', 'Laya CV (Citizen Photo)'],
  } = event || {};

  return (
    <div
      className={`bg-white rounded-lg border border-slate-100 border-l-[3px] ${SEVERITY_BORDER[severity] || 'border-l-slate-300'} hover:bg-slate-50 transition-colors cursor-pointer`}
      onClick={() => setExpanded(v => !v)}
    >
      {/* ── Summary row ── */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />{time}
            </span>
            <StatusBadge level={severity} compact />
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          )}
        </div>

        <p className="font-semibold text-sm text-slate-900 leading-snug">{location}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          PM2.5: <span className="font-medium text-slate-700">{pm25} µg/m³</span>
          {' · '}AQI: <span className="font-medium text-slate-700">{aqi}</span>
          {' · '}Wind: <span className="font-medium text-slate-700">{wind}</span>
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Source: {source} ({confidence}% confidence)
        </p>
      </div>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium mb-1">Plume Forecast</p>
            <p className="text-xs text-slate-600 font-mono">{plume}</p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium mb-1">Evidence Sources</p>
            <ul className="space-y-1">
              {sources.map((s, i) => (
                <li key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={e => e.stopPropagation()}
            className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition"
          >
            <Navigation className="w-3.5 h-3.5" />
            Dispatch Inspector
          </button>
        </div>
      )}
    </div>
  );
}
