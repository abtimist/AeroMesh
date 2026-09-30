import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Route, X, Edit3 } from 'lucide-react';

export default function ForecastSlider({
  forecast,
  times = [],
  selectedAt,
  onChange,
  loading,
  error,
  _dispersionStatus,
  plumeCount = 0,
  selectedFireSpotsCount = 0,
  onEditSpots,
  onClose,
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1); // 1 = 1x, 2 = 2x, 3 = 3x
  const index = Math.max(0, times.indexOf(selectedAt));

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying || times.length < 2) return;

    // Speeds: 1x = 1600ms, 2x = 800ms, 3x = 400ms per step
    const intervalMs = speed === 3 ? 400 : speed === 2 ? 800 : 1600;

    const timer = setInterval(() => {
      const nextIdx = (index + 1) % times.length;
      onChange(times[nextIdx]);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, speed, index, times, onChange]);

  const togglePlay = () => {
    if (times.length < 2) return;
    setIsPlaying(prev => !prev);
  };

  const handleStepBack = () => {
    setIsPlaying(false);
    if (times.length < 2) return;
    const prevIdx = index > 0 ? index - 1 : times.length - 1;
    onChange(times[prevIdx]);
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    if (times.length < 2) return;
    const nextIdx = (index + 1) % times.length;
    onChange(times[nextIdx]);
  };

  const handleReset = () => {
    setIsPlaying(false);
    if (times.length > 0) onChange(times[0]);
  };

  const formatTimeLabel = (iso) => {
    if (!iso) return 'Pending telemetry';
    const d = new Date(iso);
    return d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  };

  const progressPercent = times.length > 1 ? (index / (times.length - 1)) * 100 : 0;

  return (
    <section
      aria-label="Forecast timeline"
      className="absolute bottom-6 left-20 right-4 sm:right-auto sm:w-[500px] z-[500] rounded-2xl bg-gray-950/95 text-gray-200 border border-cyan-500/40 p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
    >
      {/* Header with Title, Spots Count, and Action Controls */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-lg bg-cyan-500/20 text-cyan-400">
            <Route className="w-4 h-4" />
          </span>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-200">
              Transport Forecast Timeline
            </h2>
            <div className="flex items-center gap-1.5 text-[11px] text-cyan-300 font-medium">
              <span>{selectedFireSpotsCount} fire spot{selectedFireSpotsCount !== 1 ? 's' : ''} modeled</span>
              <span className="text-gray-600">·</span>
              <span>{plumeCount} plume contour{plumeCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onEditSpots && (
            <button
              onClick={onEditSpots}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-300 text-[11px] font-medium transition-colors border border-gray-700 hover:text-white"
              title="Change fire spot selection"
            >
              <Edit3 className="w-3 h-3" />
              <span>Change Spots</span>
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              title="Exit transport scenario"
              aria-label="Exit transport scenario"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Playback Controls & Speed Selector Bar */}
      <div className="flex items-center justify-between mt-3 mb-2 px-1">
        {/* Play/Pause & Step Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/80 transition-colors"
            title="Reset to initial interval"
            aria-label="Reset to start"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleStepBack}
            disabled={times.length < 2}
            className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/80 disabled:opacity-40 transition-colors"
            title="Previous interval"
            aria-label="Previous step"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            disabled={times.length < 2}
            className={`flex items-center justify-center w-8 h-8 rounded-full transition-all shadow-md ${
              isPlaying
                ? 'bg-amber-400 hover:bg-amber-300 text-gray-950 ring-2 ring-amber-400/40'
                : 'bg-cyan-500 hover:bg-cyan-400 text-gray-950 ring-2 ring-cyan-500/40 hover:scale-105'
            }`}
            title={isPlaying ? 'Pause forecast simulation' : 'Play forecast timeline'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 ml-0.5 fill-current" />}
          </button>

          <button
            onClick={handleStepForward}
            disabled={times.length < 2}
            className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/80 disabled:opacity-40 transition-colors"
            title="Next interval"
            aria-label="Next step"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Multiplier Buttons (1x, 2x, 3x) */}
        <div className="flex items-center bg-gray-900 border border-gray-800 rounded-xl p-0.5">
          {[1, 2, 3].map(multiplier => (
            <button
              key={multiplier}
              onClick={() => setSpeed(multiplier)}
              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
                speed === multiplier
                  ? 'bg-cyan-500 text-gray-950 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {multiplier}x
            </button>
          ))}
        </div>

        {/* Current Valid Time Stamp */}
        <div className="text-right">
          <time className="text-xs font-mono font-semibold text-cyan-300 tracking-tight block">
            {formatTimeLabel(selectedAt)}
          </time>
          <span className="text-[10px] text-gray-400">
            Step {index + 1} of {Math.max(1, times.length)}
          </span>
        </div>
      </div>

      {/* Progress Track & Range Slider */}
      <div className="relative my-2.5 px-1">
        <input
          aria-label="Forecast valid time"
          type="range"
          className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
          min="0"
          max={Math.max(0, times.length - 1)}
          step="1"
          value={index}
          disabled={times.length < 2}
          onChange={e => {
            setIsPlaying(false);
            onChange(times[Number(e.target.value)]);
          }}
        />
        {/* Subtle timeline progress highlight */}
        <div
          className="absolute left-1 top-2.5 h-1.5 bg-cyan-500 rounded-l-lg pointer-events-none transition-all duration-150"
          style={{ width: `calc(${progressPercent}% * 0.98)` }}
        />
      </div>

      {/* Contextual Status Notes */}
      <div className="text-[11px] space-y-1 text-gray-400 px-1 pt-1 border-t border-gray-800/80">
        {loading || forecast?.status === 'loading' ? (
          <p className="text-cyan-300 animate-pulse">Running boundary-layer dispersion model…</p>
        ) : null}
        {error || forecast?.status === 'unavailable' ? (
          <p className="text-amber-300">Forecast unavailable{error ? `: ${error}` : '. Provider did not return data.'}</p>
        ) : null}
        {plumeCount > 0 ? (
          <p className="text-gray-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
            Simulating downwind plume drift for selected spots using NOAA GFS winds.
          </p>
        ) : (
          <p className="text-gray-400">No active plumes computed for this interval.</p>
        )}
      </div>
    </section>
  );
}
