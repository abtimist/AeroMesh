import { X } from 'lucide-react';
import AlertCard from './AlertCard';

const MOCK_EVENTS = [
  {
    id: '#EV-9942', severity: 'CRITICAL', location: 'Delhi (Okhla Industrial Area)',
    time: '14:32', pm25: 452, aqi: 480, wind: '12 km/h NW',
    source: 'Industrial Emission Spike', confidence: 94,
    plume: 'PBLH 1100m | Wind 3m/s NW',
    sources: ['Continuous Emission Monitoring System (CEMS)', 'Ground Sensor (AQI 480)', 'Satellite: Sentinel-5P NO2'],
  },
  {
    id: '#EV-9941', severity: 'HIGH', location: 'Haryana (Panipat)',
    time: '13:15', pm25: 215, aqi: 265, wind: '18 km/h NW',
    source: 'Agricultural Stubble Burning', confidence: 88,
    plume: 'PBLH 850m | Wind 5m/s SE',
    sources: ['NASA FIRMS (VIIRS)', 'Laya CV (Drone Photo)'],
  },
  {
    id: '#EV-9940', severity: 'CRITICAL', location: 'Ghaziabad (Loni)',
    time: '12:45', pm25: 380, aqi: 420, wind: '10 km/h W',
    source: 'Illegal Brick Kiln Activity', confidence: 91,
    plume: 'PBLH 1200m | Wind 2.5m/s E',
    sources: ['Citizen App (Geotagged Photo)', 'Ground Sensor Anomaly'],
  },
  {
    id: '#EV-9939', severity: 'MEDIUM', location: 'Delhi (Anand Vihar)',
    time: '11:30', pm25: 145, aqi: 198, wind: '15 km/h NW',
    source: 'Heavy Traffic Congestion', confidence: 75,
    plume: 'PBLH 900m | Wind 4m/s NW',
    sources: ['Traffic API Integration', 'Ground Sensor (PM10 Spike)'],
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
        className="absolute top-0 right-0 h-full shadow-2xl z-[700] flex flex-col overflow-hidden alert-panel"
        style={{
          width: 'var(--panel-width)',
          background: 'var(--color-panel-bg)',
          borderLeft: '1px solid var(--color-border)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <h2 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Real-time Event Feed</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{MOCK_EVENTS.length} active alerts</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-600 bg-red-50 border border-red-100 px-2 py-1 rounded-full animate-pulse dark:bg-red-950 dark:border-red-900 dark:text-red-400">
              {MOCK_EVENTS.filter(e => e.severity === 'CRITICAL').length} critical
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition"
              style={{ color: 'var(--color-text-disabled)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-text-secondary)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-disabled)' }}
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
        <div className="px-5 py-3 shrink-0" style={{ borderTop: '1px solid var(--color-border)' }}>
          <button
            className="w-full py-2 text-xs font-medium rounded-lg transition"
            style={{ color: 'var(--color-primary)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-primary-tint)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            View full alert history →
          </button>
        </div>
      </aside>
    </>
  );
}
