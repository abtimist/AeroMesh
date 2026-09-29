import StatusBadge from './StatusBadge';
import DispatchPanel from './DispatchPanel';

// Retained for callers that use the compact card instead of the map drawer.
export default function AlertCard({ event }) {
  if (!event) return <p className="text-sm text-slate-400">No event selected.</p>;
  return <details className="rounded-xl border border-slate-700 p-4 space-y-3">
    <summary className="cursor-pointer">
      Event #{event.id} <StatusBadge level={event.severity} compact />
      <span className="block text-sm">{event.location || `${event.lat}, ${event.lon}`}</span>
    </summary>
    <p className="text-sm">{event.event_type?.replaceAll('_', ' ') || 'Event type unavailable'}</p>
    <p className="text-xs">{event.detected_at ? new Date(event.detected_at).toLocaleString() : 'Time unavailable'} · {event.source || 'Source unavailable'}</p>
    <DispatchPanel key={event.id} event={event} />
  </details>;
}
