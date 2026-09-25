import React from 'react';
import { ShieldAlert, Flame, Wind, Clock, ChevronRight } from 'lucide-react';

export default function AlertsPanel() {
  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 text-slate-200 shadow-2xl z-40 w-full lg:w-96 overflow-y-auto">
      <div className="sticky top-0 p-6 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 z-10 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            Active Alerts
          </h2>
          <p className="text-xs text-slate-400 mt-1">Multi-Source Fusion Matrix</p>
        </div>
        <div className="px-2 py-1 bg-red-500/10 border border-red-500/30 rounded-md">
          <span className="text-xs font-bold text-red-400 animate-pulse">3 CRITICAL</span>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Mock Alert 1 */}
        <AlertCard 
          id="#EV-9942"
          title="Agricultural Biomass Fire"
          location="Punjab, India"
          time="2 mins ago"
          confidence={92}
          severity="CRITICAL"
          sources={['NASA FIRMS', 'Ground Sensor (AQI 450)', 'Laya CV (Citizen Photo)']}
          plume="PBLH 1200m | Wind 5m/s ESE"
        />

        {/* Mock Alert 2 */}
        <AlertCard 
          id="#EV-9941"
          title="Industrial Emission Spike"
          location="Kanpur, India"
          time="14 mins ago"
          confidence={78}
          severity="HIGH"
          sources={['Ground Sensor (SO2 Anomaly)']}
          plume="PBLH 800m | Wind 2m/s N"
        />

        {/* Mock Alert 3 */}
        <AlertCard 
          id="#EV-9940"
          title="Forest Fire"
          location="Uttarakhand, India"
          time="45 mins ago"
          confidence={88}
          severity="CRITICAL"
          sources={['NASA FIRMS', 'Laya CV (Drone Photo)']}
          plume="PBLH 2000m | Wind 8m/s S"
        />
      </div>
    </div>
  );
}

function AlertCard({ id, title, location, time, confidence, severity, sources, plume }) {
  const isCritical = severity === 'CRITICAL';
  
  return (
    <div className={`relative p-4 rounded-2xl border ${isCritical ? 'bg-red-500/5 border-red-500/30 hover:border-red-500/50' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'} transition-colors group cursor-pointer overflow-hidden`}>
      {isCritical && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500" />
      )}
      
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${isCritical ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}>
              {severity}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">{id}</span>
          </div>
          <h3 className="font-semibold text-sm text-white">{title}</h3>
          <p className="text-xs text-slate-400">{location}</p>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Clock className="w-3 h-3" />
            {time}
          </div>
          <div className="mt-2 text-right">
            <span className="text-xs font-bold text-white">{confidence}%</span>
            <p className="text-[9px] text-slate-500 uppercase tracking-wider">Confidence</p>
          </div>
        </div>
      </div>

      <div className="space-y-2 mt-4">
        <div className="flex items-start gap-2">
          <Wind className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[11px] text-indigo-200">Dispersion Vector</p>
            <p className="text-xs text-slate-300 font-mono">{plume}</p>
          </div>
        </div>
        
        <div className="flex items-start gap-2">
          <Flame className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[11px] text-orange-200">Fusion Evidence Sources</p>
            <ul className="text-xs text-slate-300 space-y-1 mt-1">
              {sources.map((src, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-orange-400" />
                  {src}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      
      <button className="w-full mt-4 py-2 bg-slate-800/80 hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-300 transition-colors flex items-center justify-center gap-1">
        Deploy Inspectors <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
