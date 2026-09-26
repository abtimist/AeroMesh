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
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={onClose}
      />

      {/* Centered Modal */}
      <div 
        className={`fixed inset-0 z-[1000] flex items-center justify-center pointer-events-none p-4 ${open ? '' : 'hidden'}`}
      >
        <div 
          className={`pointer-events-auto w-full max-w-lg bg-gray-900/90 backdrop-blur-xl border border-gray-700/50 shadow-2xl overflow-hidden transition-all duration-300 ease-out transform rounded-[16px] ${open ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-700/50 bg-gradient-to-r from-gray-800/50 to-gray-900/50 shrink-0">
            <div>
              <h2 className="font-semibold text-white">Real-time Event Feed</h2>
              <p className="text-xs mt-0.5 text-gray-400">
                {events.length} active event{events.length !== 1 ? 's' : ''} detected
              </p>
            </div>
            <div className="flex items-center gap-3">
              {criticalCount > 0 && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-red-400 bg-red-950/50 border border-red-900/50 px-3 py-1.5 rounded-full animate-pulse">
                  {criticalCount} critical
                </span>
              )}
            </div>
          </div>

          {/* Scrollable event list */}
          <div className="overflow-y-auto p-6 space-y-4 max-h-[60vh] custom-scrollbar">
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <AlertTriangle className="w-12 h-12 mb-4 text-gray-600" />
                <p className="text-base font-medium text-gray-300">No active events</p>
                <p className="text-sm mt-1 text-gray-500">Events will appear here when detected.</p>
              </div>
            ) : (
              events.map(event => (
                <EventCard key={event.id} event={event} />
              ))
            )}
          </div>

          {/* Footer with Pill Button */}
          <div className="px-6 py-5 border-t border-gray-700/50 bg-gray-900/50 flex flex-col gap-3">
            <button
              onClick={onClose}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-6 rounded-full transition-colors duration-200 shadow-lg shadow-blue-500/20"
              style={{ minHeight: '40px' }}
            >
              Close Feed
            </button>
            <button
              className="w-full py-2 text-xs font-medium rounded-full transition text-blue-400 hover:bg-gray-800/80"
            >
              View full alert history →
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
