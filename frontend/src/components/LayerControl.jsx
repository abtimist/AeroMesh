// LayerControl — floating map layer toggles (top-right of map)
// Toggles: Sensors, Plumes, Fire Hotspots, Wind Vectors, Corridors

import { useState } from 'react';
import { Layers } from 'lucide-react';

const LAYERS = [
  { key: 'sensors',    label: 'Sensors',      color: '#00e400' },
  { key: 'plumes',     label: 'Plumes',       color: '#ff0000' },
  { key: 'fire',       label: 'Fire Spots',   color: '#ff4500' },
  { key: 'wind',       label: 'Wind',         color: '#60a5fa' },
  { key: 'corridors',  label: 'Corridors',    color: '#f59e0b' },
];

export default function LayerControl({ activeLayers, onToggle }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute top-4 right-4 z-[500]">
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-slate-200 overflow-hidden">
        {/* Toggle button */}
        <button
          onClick={() => setOpen(v => !v)}
          className={`flex items-center gap-2 px-3 py-2.5 text-xs font-medium transition w-full
            ${open ? 'text-blue-600 bg-blue-50' : 'text-slate-700 hover:bg-slate-50'}`}
        >
          <Layers className="w-4 h-4" />
          Layers
        </button>

        {/* Layer toggles */}
        {open && (
          <div className="border-t border-slate-100 p-2 space-y-1">
            {LAYERS.map(({ key, label, color }) => {
              const active = activeLayers?.[key] !== false; // default on
              return (
                <button
                  key={key}
                  onClick={() => onToggle(key)}
                  className={`flex items-center gap-2.5 w-full px-2 py-1.5 rounded-lg text-xs font-medium transition
                    ${active ? 'bg-slate-50 text-slate-700' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 border-2"
                    style={{
                      backgroundColor: active ? color : 'transparent',
                      borderColor: color,
                    }}
                  />
                  {label}
                  <span className={`ml-auto text-[9px] font-bold ${active ? 'text-blue-600' : 'text-slate-300'}`}>
                    {active ? 'ON' : 'OFF'}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
