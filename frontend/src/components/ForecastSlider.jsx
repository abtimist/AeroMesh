import React, { useState } from 'react';
import { Play, Pause, FastForward, Clock } from 'lucide-react';

const ForecastSlider = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hoursForward, setHoursForward] = useState(0);

  const maxHours = 24;

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
    // In a real app, this would use requestAnimationFrame to scrub the slider
  };

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[600px] z-[500]">
      <div className="bg-gray-900/90 backdrop-blur-md border border-gray-700/50 rounded-xl shadow-2xl p-4">
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-semibold text-white tracking-wide">Plume Dispersion Forecast</span>
          </div>
          <span className="text-xs font-mono text-cyan-300 bg-cyan-900/30 px-2 py-1 rounded border border-cyan-800/50">
            T + {hoursForward} HOURS
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={handlePlay}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
          </button>
          
          <div className="flex-1">
            <input 
              type="range" 
              min="0" 
              max={maxHours}
              value={hoursForward}
              onChange={(e) => setHoursForward(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-gray-500 mt-2 font-mono">
              <span>NOW</span>
              <span>+6H</span>
              <span>+12H</span>
              <span>+18H</span>
              <span>+24H</span>
            </div>
          </div>

          <button className="w-8 h-8 flex items-center justify-center rounded bg-gray-800 hover:bg-gray-700 text-gray-400 transition-colors">
            <FastForward className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};

export default ForecastSlider;
