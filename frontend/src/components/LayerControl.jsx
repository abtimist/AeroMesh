import { useState, useEffect } from 'react';
import { Layers, Activity, Cloud, Flame, Wind, Route } from 'lucide-react';
import { useTheme } from '../hooks';

const LAYERS = [
  { key: 'sensors',    label: 'Sensors',    icon: Activity, shortcut: 'S', color: '#00e400' },
  { key: 'plumes',     label: 'Plumes',     icon: Cloud,    shortcut: 'P', color: '#ff0000' },
  { key: 'fire',       label: 'Fire Spots', icon: Flame,    shortcut: 'F', color: '#ff4500' },
  { key: 'wind',       label: 'Wind',       icon: Wind,     shortcut: 'W', color: '#60a5fa' },
  { key: 'corridors',  label: 'Corridors',  icon: Route,    shortcut: 'C', color: '#f59e0b' },
];

export default function LayerControl({ activeLayers, onToggle }) {
  const [open, setOpen] = useState(false);
  const { dark } = useTheme();

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      const key = e.key.toUpperCase();
      const layer = LAYERS.find(l => l.shortcut === key);
      if (layer) {
        onToggle(layer.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggle]);

  return (
    <div className="absolute top-16 right-4 z-[500]">
      <div
        className="rounded-xl overflow-hidden backdrop-blur-md transition-all duration-300"
        style={{ 
          background: dark ? 'rgba(15, 15, 20, 0.75)' : 'rgba(255, 255, 255, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Toggle button */}
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 px-4 py-3 text-sm font-semibold transition w-full"
          style={{
            color: dark ? '#e8f0fe' : '#0f172a',
            borderBottom: open ? '1px solid rgba(255, 255, 255, 0.05)' : 'none'
          }}
        >
          <Layers className="w-5 h-5 opacity-80" />
          Map Overlays
        </button>

        {/* Layer toggles */}
        {open && (
          <div className="p-2 space-y-1">
            {LAYERS.map(({ key, label, icon: Icon, shortcut, color }) => {
              const active = activeLayers?.[key] !== false;
              return (
                <button
                  key={key}
                  onClick={() => onToggle(key)}
                  className="flex items-center w-full px-3 py-2.5 rounded-lg text-sm transition-colors duration-150"
                  style={{
                    color: active ? (dark ? '#ffffff' : '#0f172a') : (dark ? '#64748b' : '#94a3b8'),
                    background: active ? (dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)') : 'transparent',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = dark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0,0,0,0.02)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <Icon 
                    className="w-4 h-4 shrink-0 mr-3" 
                    style={{ color: active ? color : 'currentColor', opacity: active ? 1 : 0.5 }} 
                  />
                  <span className="font-medium mr-4">{label}</span>
                  <div 
                    className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm border"
                    style={{
                      color: dark ? '#cbd5e1' : '#475569',
                      background: dark ? 'rgba(0, 0, 0, 0.3)' : '#f1f5f9',
                      borderColor: dark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0'
                    }}
                  >
                    {shortcut}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
