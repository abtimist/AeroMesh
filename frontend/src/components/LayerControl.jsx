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
      <div
        className="rounded-xl shadow-md overflow-hidden transition-colors"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        {/* Toggle button */}
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 px-3 py-2.5 text-xs font-medium transition w-full"
          style={{
            color: open ? 'var(--color-primary)' : 'var(--color-text-primary)',
            background: open ? 'var(--color-primary-tint)' : 'transparent',
          }}
          onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
          onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent'; }}
        >
          <Layers className="w-4 h-4" />
          Layers
        </button>

        {/* Layer toggles */}
        {open && (
          <div className="p-2 space-y-1" style={{ borderTop: '1px solid var(--color-border)' }}>
            {LAYERS.map(({ key, label, color }) => {
              const active = activeLayers?.[key] !== false; // default on
              return (
                <button
                  key={key}
                  onClick={() => onToggle(key)}
                  className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-lg text-xs font-medium transition"
                  style={{
                    color: active ? 'var(--color-text-primary)' : 'var(--color-text-disabled)',
                    background: active ? 'var(--color-surface-hover)' : 'transparent',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 border-2"
                    style={{
                      backgroundColor: active ? color : 'transparent',
                      borderColor: color,
                    }}
                  />
                  {label}
                  <span className="ml-auto text-[9px] font-bold" style={{ color: active ? 'var(--color-primary)' : 'var(--color-text-disabled)' }}>
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
