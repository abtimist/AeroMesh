import React, { useState, useEffect } from 'react';
import { Brain, Cpu, Waves, Wind, Layers, Satellite, ShieldCheck, Activity } from 'lucide-react';

const AIEvidencePanel = ({ event, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Small delay for slide-in animation
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  if (!event) return null;

  return (
    <div 
      className={`fixed top-20 right-6 w-96 bg-gray-900/90 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden transition-all duration-500 ease-out z-[1000] transform ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-12 opacity-0'}`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 px-6 py-4 border-b border-gray-700/50 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
            <Brain className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white tracking-wide text-sm">LAYA DECISION ENGINE</h3>
            <p className="text-xs text-blue-300/80 font-mono">ID: {event.event_id}</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-full p-1.5 transition-colors"
        >
          &times;
        </button>
      </div>

      <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
        
        {/* Core Decision */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
          <div className="flex justify-between items-end mb-2">
            <span className="text-sm text-gray-400 font-medium">Final Calibrated Score</span>
            <span className="text-2xl font-bold text-emerald-400 font-mono">{event.confidence_score?.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-900 rounded-full h-2 mt-2 border border-gray-700 overflow-hidden">
            <div className="bg-emerald-500 h-2 rounded-full relative" style={{ width: `${event.confidence_score}%` }}>
               <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-300">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Threshold cleared. Automated Alert Dispatched.</span>
          </div>
        </div>

        {/* Evidence Matrix */}
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4" /> Evidence Matrix
          </h4>
          <div className="space-y-3">
            
            <div className="bg-gray-800/40 p-3 rounded-lg border border-gray-700/30">
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2 text-sm text-gray-200">
                  <Activity className="w-4 h-4 text-orange-400" />
                  Ground Sensor Anomaly
                </div>
                <span className="text-xs text-orange-400 font-mono">+30%</span>
              </div>
              <p className="text-xs text-gray-500">PM2.5 deviation +112% vs historical baseline (TimescaleDB).</p>
            </div>

            <div className="bg-gray-800/40 p-3 rounded-lg border border-gray-700/30">
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2 text-sm text-gray-200">
                  <Satellite className="w-4 h-4 text-red-400" />
                  NASA FIRMS Hotspot
                </div>
                <span className="text-xs text-red-400 font-mono">+25%</span>
              </div>
              <p className="text-xs text-gray-500">VIIRS 375m thermal anomaly detected 4.2km away.</p>
            </div>

            <div className="bg-gray-800/40 p-3 rounded-lg border border-gray-700/30">
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2 text-sm text-gray-200">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  Citizen CV (MobileNetV3)
                </div>
                <span className="text-xs text-purple-400 font-mono">+20%</span>
              </div>
              <p className="text-xs text-gray-500">Zero-shot inference matched 'thick smoke' signature.</p>
            </div>
          </div>
        </div>

        {/* Plume Physics */}
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Waves className="w-4 h-4" /> Gaussian Plume Parameters
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800/40 p-3 rounded-lg border border-gray-700/30 flex flex-col justify-between">
              <span className="text-xs text-gray-500">Wind Vector (10m)</span>
              <div className="flex items-center gap-2 mt-1">
                <Wind className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-semibold text-gray-200">18 km/h</span>
              </div>
            </div>
            <div className="bg-gray-800/40 p-3 rounded-lg border border-gray-700/30 flex flex-col justify-between">
              <span className="text-xs text-gray-500">PBLH Height</span>
              <div className="flex items-center gap-2 mt-1">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-semibold text-gray-200">1,200m</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AIEvidencePanel;
