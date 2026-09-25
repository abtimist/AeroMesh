import React from 'react';
import { Activity, Map, Radio, ShieldAlert, Settings, CloudRainWind, ThermometerSun } from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="w-20 lg:w-64 flex flex-col h-screen bg-slate-950 border-r border-slate-800 text-slate-300 transition-all duration-300 z-50">
      <div className="h-20 flex items-center justify-center lg:justify-start lg:px-6 border-b border-slate-800">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <span className="hidden lg:block ml-3 font-bold text-lg tracking-wide text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
          AeroMesh
        </span>
      </div>

      <nav className="flex-1 py-6 flex flex-col gap-2 px-3">
        <NavItem icon={<Map />} label="Live Map" active />
        <NavItem icon={<ShieldAlert />} label="Active Crises" badge="3" />
        <NavItem icon={<Radio />} label="Sensor Network" />
        <NavItem icon={<CloudRainWind />} label="Weather Logs" />
        <NavItem icon={<ThermometerSun />} label="Laya AI Core" />
      </nav>

      <div className="p-4 border-t border-slate-800">
        <NavItem icon={<Settings />} label="Settings" />
        
        {/* User Profile Mock */}
        <div className="mt-4 flex items-center gap-3 p-2 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors hidden lg:flex">
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/50 flex items-center justify-center text-indigo-400 font-bold text-xs">
            CM
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-white">Cmdr. Mitchell</span>
            <span className="text-[10px] text-slate-500">Lead Analyst</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, active, badge }) {
  return (
    <div className={`relative flex items-center px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 group ${active ? 'bg-indigo-500/10 text-indigo-400' : 'hover:bg-slate-900 hover:text-slate-100'}`}>
      {active && (
        <div className="absolute left-0 w-1 h-6 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
      )}
      <div className={`transition-transform duration-200 group-hover:scale-110 ${active ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
        {React.cloneElement(icon, { size: 20 })}
      </div>
      <span className="hidden lg:block ml-3 text-sm font-medium">{label}</span>
      
      {badge && (
        <span className="hidden lg:flex absolute right-3 items-center justify-center w-5 h-5 rounded-md bg-red-500/20 border border-red-500/50 text-red-400 text-[10px] font-bold">
          {badge}
        </span>
      )}
    </div>
  );
}
