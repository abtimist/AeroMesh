import { X, AlertTriangle, Clock } from 'lucide-react';

const SEVERITY_COLORS = {
  CRITICAL: { bg: 'bg-red-50 dark:bg-red-950/50', border: 'border-red-200 dark:border-red-900', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
  HIGH:     { bg: 'bg-orange-50 dark:bg-orange-950/50', border: 'border-orange-200 dark:border-orange-900', text: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
  MEDIUM:   { bg: 'bg-yellow-50 dark:bg-yellow-950/50', border: 'border-yellow-200 dark:border-yellow-900', text: 'text-yellow-700 dark:text-yellow-400', dot: 'bg-yellow-500' },
  LOW:      { bg: 'bg-blue-50 dark:bg-blue-950/50', border: 'border-blue-200 dark:border-blue-900', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
};

function EventCard({ event }) {
  const sev = SEVERITY_COLORS[event.severity] || SEVERITY_COLORS.MEDIUM;
  const detected = event.detected_at ? new Date(event.detected_at) : new Date();
  const ago = Math.round((Date.now() - detected.getTime()) / 60000);
  const agoStr = ago < 60 ? `${ago}m ago` : `${Math.round(ago / 60)}h ago`;

  return (
    <div className={`${sev.bg} ${sev.border} border rounded-xl p-4 transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${sev.dot} animate-pulse`} />
          <span className={`text-[10px] font-bold uppercase tracking-widest ${sev.text}`}>{event.severity}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--color-text-disabled)' }}>
          <Clock className="w-3 h-3" />
          {agoStr}
        </div>
      </div>
      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
        Event #{event.id}: {event.event_type?.replace(/_/g, ' ')}
      </p>
      <p className="text-xs mb-2" style={{ color: 'var(--color-text-secondary)' }}>
        Lat: {event.lat?.toFixed(4)}, Lon: {event.lon?.toFixed(4)}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-disabled)' }}>
          Confidence: {event.confidence?.toFixed(1)}%
        </span>
        {event.plume_polygon && (
          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
            PLUME ACTIVE
          </span>
        )}
      </div>
    </div>
  );
}

export default function AlertPanel({ open, onClose, events = [] }) {
  const criticalCount = events.filter(e => e.severity === 'CRITICAL').length;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="absolute inset-0 z-[600]" onClick={onClose} />
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
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              {events.length} active event{events.length !== 1 ? 's' : ''} detected
            </p>
          </div>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-red-600 bg-red-50 border border-red-100 px-2 py-1 rounded-full animate-pulse dark:bg-red-950 dark:border-red-900 dark:text-red-400">
                {criticalCount} critical
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition"
              style={{ color: 'var(--color-text-disabled)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable event list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <AlertTriangle className="w-10 h-10 mb-3" style={{ color: 'var(--color-text-disabled)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>No active events</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-disabled)' }}>Events will appear here when detected.</p>
            </div>
          ) : (
            events.map(event => (
              <EventCard key={event.id} event={event} />
            ))
          )}
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
