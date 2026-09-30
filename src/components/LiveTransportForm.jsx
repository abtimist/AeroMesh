import { useState } from 'react';
import { fetchJSON } from '../api';
import { Wind, Route, Download, Play, RefreshCw, CheckCircle2, AlertCircle, Compass, Layers } from 'lucide-react';

export default function LiveTransportForm({ eventId, eventCoordinates }) {
  const [duration, setDuration] = useState(6);
  const [releaseMinutes, setReleaseMinutes] = useState(60);
  const [diffusivity, setDiffusivity] = useState(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [run, setRun] = useState(null);

  async function calculateTransport(e) {
    if (e) e.preventDefault();
    setBusy(true);
    setError('');

    try {
      const payload = {
        duration_hours: Number(duration),
        release_duration_minutes: Number(releaseMinutes),
        diffusivity_m2_s: Number(diffusivity),
        lat: eventCoordinates?.lat,
        lon: eventCoordinates?.lon,
      };

      const result = await fetchJSON(`/api/dispersion/events/${eventId}/transport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setRun(result);
    } catch (err) {
      setError(err.message || 'Failed to calculate atmospheric dispersion trajectory.');
    } finally {
      setBusy(false);
    }
  }

  function downloadGeoJSON() {
    if (!run) return;
    const geojson = {
      type: 'FeatureCollection',
      properties: {
        simulation_id: run.id,
        event_id: eventId,
        model: run.model,
        meteorology: run.meteorology,
        downwind_reach_km: run.downwind_reach_km,
        affected_area_km2: run.affected_area_km2,
      },
      features: (run.waypoints || []).map(wp => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [wp.lon, wp.lat],
        },
        properties: {
          hour: wp.hour,
          time: wp.time,
          downwind_km: wp.downwind_km,
          lateral_spread_km: wp.lateral_spread_km,
          est_pm25_ug_m3: wp.est_pm25,
        },
      })),
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trajectory-${run.id}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* Simulation Controls Card */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Route className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Atmospheric Transport & Plume Trajectory</h4>
              <p className="text-xs text-slate-400">NOAA HYSPLIT kinematic forward dispersion using live GFS boundary winds</p>
            </div>
          </div>
        </div>

        {/* Duration Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 block">Forecast Duration</label>
          <div className="grid grid-cols-4 gap-2">
            {[3, 6, 12, 24].map(hours => (
              <button
                key={hours}
                type="button"
                onClick={() => setDuration(hours)}
                className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                  duration === hours
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-white/5'
                }`}
              >
                {hours} Hours
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Settings Toggle */}
        <details className="text-xs text-slate-400">
          <summary className="cursor-pointer hover:text-slate-200 transition-colors">
            Advanced meteorological assumptions (Diffusivity & Release Rate)
          </summary>
          <div className="grid grid-cols-2 gap-3 pt-3">
            <div>
              <label className="block mb-1 text-slate-300">Continuous Release (min)</label>
              <input
                type="number"
                value={releaseMinutes}
                onChange={e => setReleaseMinutes(Number(e.target.value))}
                min="10"
                max="1440"
                step="10"
                className="w-full rounded-xl bg-slate-950 border border-white/10 px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block mb-1 text-slate-300">Horizontal Diffusivity (m²/s)</label>
              <input
                type="number"
                value={diffusivity}
                onChange={e => setDiffusivity(Number(e.target.value))}
                min="10"
                max="1000"
                step="10"
                className="w-full rounded-xl bg-slate-950 border border-white/10 px-3 py-1.5 text-xs text-white"
              />
            </div>
          </div>
        </details>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Prominent Action Button */}
        <button
          type="button"
          onClick={calculateTransport}
          disabled={busy}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-sm shadow-xl shadow-cyan-900/30 hover:shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          {busy ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Calculating Live Atmospheric Trajectory…</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Calculate Transport Trajectory</span>
            </>
          )}
        </button>
      </div>

      {/* Simulation Results Display */}
      {run && (
        <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/90 p-4 space-y-4 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Transport Simulation Ready
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">ID: {run.id}</span>
          </div>

          {/* Key Trajectory Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-950/80 p-3 rounded-xl border border-white/5 space-y-1">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Wind className="w-3.5 h-3.5 text-cyan-400" /> Live Wind
              </div>
              <div className="text-sm font-bold text-white">
                {run.meteorology?.wind_speed_kmh} km/h
              </div>
              <div className="text-[10px] text-cyan-300">
                from {run.meteorology?.wind_direction_cardinal} ({run.meteorology?.wind_direction_deg}°)
              </div>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-white/5 space-y-1">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-blue-400" /> Downwind Reach
              </div>
              <div className="text-sm font-bold text-white">
                {run.downwind_reach_km} km
              </div>
              <div className="text-[10px] text-slate-400">
                over {run.duration_hours}h projection
              </div>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-white/5 space-y-1">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-amber-400" /> Dispersal Cone
              </div>
              <div className="text-sm font-bold text-white">
                {run.affected_area_km2} km²
              </div>
              <div className="text-[10px] text-slate-400">
                plume footprint
              </div>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-white/5 space-y-1">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Route className="w-3.5 h-3.5 text-purple-400" /> Boundary Layer
              </div>
              <div className="text-sm font-bold text-white">
                {run.meteorology?.boundary_layer_height_m} m
              </div>
              <div className="text-[10px] text-slate-400">
                mixing altitude
              </div>
            </div>
          </div>

          {/* Waypoints List */}
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-slate-300">Hourly Kinematic Trajectory Points:</h5>
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 text-xs">
              {(run.waypoints || []).map(wp => (
                <div
                  key={wp.hour}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-white/5 text-slate-300"
                >
                  <span className="font-semibold text-cyan-400">+{wp.hour}h ({new Date(wp.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
                  <span>📍 {wp.lat.toFixed(3)}°, {wp.lon.toFixed(3)}°</span>
                  <span className="text-slate-400">{wp.downwind_km} km downwind</span>
                  <span className="font-semibold text-amber-300">~{wp.est_pm25} µg/m³ PM2.5</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions: Download GeoJSON */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={downloadGeoJSON}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Download Trajectory GeoJSON
            </button>
            <span className="text-[10px] text-slate-500">GFS NOAA 0.25° Assimilated Wind</span>
          </div>
        </div>
      )}
    </div>
  );
}
