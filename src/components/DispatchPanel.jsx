import { useState, useEffect } from 'react';
import { fetchJSON } from '../api';
import { Send, CheckCircle2, Clock, ShieldAlert, Truck, Navigation } from 'lucide-react';

const PRESET_UNITS = [
  {
    id: 'drone-01',
    name: 'Autonomous Air Sampling Drone Squadron',
    type: 'air_sampling',
    desc: 'High-altitude vertical PM2.5/PM10 profile & boundary layer sampling',
    etaMin: 9,
    icon: Navigation,
    color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
  },
  {
    id: 'tender-04',
    name: 'Regional Fire Suppression Tender Unit 04',
    type: 'fire_response',
    desc: 'Rapid water & foam containment for active crop residue burns',
    etaMin: 18,
    icon: Truck,
    color: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
  },
  {
    id: 'inspect-02',
    name: 'Agricultural Ground Verification Team',
    type: 'inspection',
    desc: 'On-site compliance audit & field boundary inspection',
    etaMin: 24,
    icon: ShieldAlert,
    color: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
  },
];

export default function DispatchPanel({ event }) {
  const [assignments, setAssignments] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function loadAssignments() {
    try {
      const rows = await fetchJSON(`/api/citizen/events/${event.id}/assignments`);
      setAssignments(rows || []);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadAssignments();
  }, [event.id]);

  async function dispatchUnit(unit) {
    setBusy(true);
    setMessage('');
    try {
      const newAsg = await fetchJSON(`/api/citizen/events/${event.id}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_name: unit.name,
          unit_type: unit.type,
          notes: `Dispatched to thermal coordinates ${event.lat.toFixed(4)}, ${event.lon.toFixed(4)}`,
        }),
      });

      setAssignments(prev => [newAsg, ...prev]);
      setMessage(`Successfully dispatched ${unit.name} (Estimated arrival: ~${newAsg.estimated_arrival_minutes || unit.etaMin} mins)`);
    } catch (err) {
      setMessage(err.message || 'Dispatch request failed.');
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(asgId, nextStatus) {
    try {
      const updated = await fetchJSON(`/api/citizen/assignments/${asgId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, note: `Status updated to ${nextStatus}` }),
      });
      setAssignments(prev => prev.map(a => (a.id === asgId ? updated : a)));
    } catch {
      // fallback
      setAssignments(prev => prev.map(a => (a.id === asgId ? { ...a, status: nextStatus } : a)));
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-cyan-400" />
          Rapid Inter-Agency Field Dispatch
        </h4>
        <p className="text-xs text-slate-400 mt-1">
          Deploy field units, air sampling drones, or fire response tenders directly to coordinates {event.lat.toFixed(3)}°, {event.lon.toFixed(3)}°.
        </p>
      </div>

      {message && (
        <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-cyan-400" />
          <span>{message}</span>
        </div>
      )}

      {/* Available Units Grid */}
      <div className="space-y-2.5">
        <h5 className="text-xs font-semibold text-slate-300">Available Standby Units (Fast 1-Click Dispatch):</h5>
        <div className="grid gap-2.5">
          {PRESET_UNITS.map(unit => {
            const Icon = unit.icon;
            const isDispatched = assignments.some(a => a.unit_name === unit.name && a.status !== 'completed');

            return (
              <div
                key={unit.id}
                className="p-3.5 rounded-2xl border border-white/5 bg-slate-900/80 hover:bg-slate-900 flex items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2.5 rounded-xl border shrink-0 ${unit.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white truncate">{unit.name}</span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-500" /> ETA ~{unit.etaMin}m
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{unit.desc}</p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={busy || isDispatched}
                  onClick={() => dispatchUnit(unit)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                    isDispatched
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-900/30'
                  }`}
                >
                  {isDispatched ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Active</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Dispatch</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Assignments Tracker */}
      {assignments.length > 0 && (
        <div className="space-y-2.5 pt-2 border-t border-white/10">
          <h5 className="text-xs font-semibold text-slate-300">Active Operational Dispatches ({assignments.length}):</h5>
          <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
            {assignments.map(asg => (
              <div
                key={asg.id}
                className="p-3 rounded-2xl bg-slate-900/90 border border-white/10 flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white truncate">{asg.unit_name || asg.resource_name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {asg.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Dispatched {new Date(asg.dispatched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ETA ~{asg.estimated_arrival_minutes || 15} min
                  </p>
                </div>

                {/* Status action buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {asg.status === 'assigned' && (
                    <button
                      type="button"
                      onClick={() => updateStatus(asg.id, 'en_route')}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/20 text-[11px] font-semibold"
                    >
                      En Route
                    </button>
                  )}
                  {asg.status === 'en_route' && (
                    <button
                      type="button"
                      onClick={() => updateStatus(asg.id, 'on_scene')}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/20 text-[11px] font-semibold"
                    >
                      On Scene
                    </button>
                  )}
                  {asg.status === 'on_scene' && (
                    <button
                      type="button"
                      onClick={() => updateStatus(asg.id, 'completed')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold"
                    >
                      Complete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
