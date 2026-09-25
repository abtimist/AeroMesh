// AlertPanel — slide-in right panel, dismissible
// Width 360px, bg-white, overlays the map edge
// Opens/closes with CSS transform transition

import { X } from 'lucide-react';
import AlertCard from './AlertCard';

const MOCK_EVENTS = [
  {
    id: '#EV-9942', severity: 'CRITICAL', location: 'Delhi (Okhla)',
    time: '14:32', pm25: 342, aqi: 391, wind: '18 km/h SE',
    source: 'Biomass Burning', confidence: 92,
    plume: 'PBLH 1200m | Wind 5m/s ESE',
    sources: ['NASA FIRMS', 'Ground Sensor (AQI 450)', 'Laya CV (Citizen Photo)'],
  },
  {
    id: '#EV-9941', severity: 'HIGH', location: 'Noida (Sec 62)',
    time: '14:28', pm25: 198, aqi: 221, wind: '16 km/h SE',
    source: 'Industrial Emission', confidence: 78,
    plume: 'PBLH 800m | Wind 2m/s N',
    sources: ['Ground Sensor (SO2 Anomaly)'],
  },
  {
    id: '#EV-9940', severity: 'CRITICAL', location: 'Uttarakhand (Dehradun)',
    time: '13:47', pm25: 276, aqi: 318, wind: '22 km/h S',
    source: 'Forest Fire', confidence: 88,
    plume: 'PBLH 2000m | Wind 8m/s S',
    sources: ['NASA FIRMS', 'Laya CV (Drone Photo)'],
  },
  {
    id: '#EV-9939', severity: 'MEDIUM', location: 'Delhi (Sec 62)',
    time: '13:22', pm25: 198, aqi: 221, wind: '16 km/h SE',
    source: 'Traffic Congestion', confidence: 61,
    plume: 'PBLH 600m | Wind 3m/s NW',
    sources: ['Ground Sensor (PM2.5 Spike)'],
  },
];

export default function AlertPanel({ open, onClose }) {
  return (
    <>
      {/* Backdrop — clicking it closes panel */}
      {open && (
        <div
          className="absolute inset-0 z-[600]"
          onClick={onClose}
        />
      )}

      {/* Slide-in panel */}
      <aside
        className="absolute top-0 right-0 h-full bg-white border-l border-slate-200 shadow-2xl z-[700] flex flex-col overflow-hidden"
        style={{
          width: 'var(--panel-width)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform var(--transition-panel)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="font-semibold text-slate-900">Real-time Event Feed</h2>
            <p className="text-xs text-slate-500 mt-0.5">{MOCK_EVENTS.length} active alerts</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-600 bg-red-50 border border-red-100 px-2 py-1 rounded-full animate-pulse">
              {MOCK_EVENTS.filter(e => e.severity === 'CRITICAL').length} critical
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable event list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {MOCK_EVENTS.map(event => (
            <AlertCard key={event.id} event={event} />
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 shrink-0">
          <button className="w-full py-2 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition">
            View full alert history →
          </button>
        </div>
      </aside>
    </>
  );
}
