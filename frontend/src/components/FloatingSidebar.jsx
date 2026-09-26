import { useState } from 'react';
import { useTheme } from '../hooks';
import { Globe2, Map, ShieldAlert, Ruler, Layers as LayersIcon, Activity, Cloud, Flame, Wind, Route, Target } from 'lucide-react';

const NODES = ['India Node', 'Brazil Node', 'China Node', 'South Africa Node'];

const LAYERS = [
  { key: 'sensors',    label: 'Sensors',    icon: Activity, shortcut: 'S', color: '#22c55e' },
  { key: 'plumes',     label: 'Plumes',     icon: Cloud,    shortcut: 'P', color: '#ef4444' },
  { key: 'fire',       label: 'Fire Spots', icon: Flame,    shortcut: 'F', color: '#f97316' },
  { key: 'wind',       label: 'Wind',       icon: Wind,     shortcut: 'W', color: '#60a5fa' },
];

export default function FloatingSidebar({ 
  activeNode, setActiveNode, 
  measureMode, setMeasureMode,
  inspectMode, setInspectMode,
  alertPanelOpen, setAlertPanelOpen,
  mapType, setMapType,
  layers, toggleLayer
}) {
  const { dark } = useTheme();
  const [nodeMenuOpen, setNodeMenuOpen] = useState(false);
  const [mapOverlayOpen, setMapOverlayOpen] = useState(false);

  const buttonStyle = (active) => ({
    background: active ? (dark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)') : 'transparent',
    color: active ? '#3b82f6' : (dark ? '#64748b' : '#94a3b8'),
  });

  return (
    <div className="absolute left-6 top-1/2 -translate-y-1/2 z-[500] flex items-start gap-4">
      {/* Main Toolbar */}
      <div 
        className="rounded-[24px] p-2 flex flex-col gap-2 backdrop-blur-md border shadow-2xl transition-all duration-300"
        style={{
          background: dark ? 'rgba(15, 15, 20, 0.75)' : 'rgba(255, 255, 255, 0.85)',
          borderColor: dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
        }}
      >
        {/* Globe - Node Selector */}
        <button
          onClick={() => { setNodeMenuOpen(!nodeMenuOpen); setMapOverlayOpen(false); }}
          className="relative group p-3 rounded-2xl transition-all duration-200 flex items-center justify-center"
          style={buttonStyle(nodeMenuOpen)}
          onMouseEnter={e => { if (!nodeMenuOpen) e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'; }}
          onMouseLeave={e => { if (!nodeMenuOpen) e.currentTarget.style.background = 'transparent'; }}
        >
          <Globe2 className="w-6 h-6" />
          <div className="absolute left-full ml-4 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 shadow-xl backdrop-blur-md"
            style={{
              background: dark ? 'rgba(15, 15, 20, 0.85)' : 'rgba(255, 255, 255, 0.95)',
              color: dark ? '#fff' : '#000',
              border: '1px solid',
              borderColor: dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
            }}
          >
            Select Region
          </div>
        </button>

        {/* Map - Layer Overlays */}
        <button
          onClick={() => { setMapOverlayOpen(!mapOverlayOpen); setNodeMenuOpen(false); }}
          className="relative group p-3 rounded-2xl transition-all duration-200 flex items-center justify-center"
          style={buttonStyle(mapOverlayOpen)}
          onMouseEnter={e => { if (!mapOverlayOpen) e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'; }}
          onMouseLeave={e => { if (!mapOverlayOpen) e.currentTarget.style.background = 'transparent'; }}
        >
          <LayersIcon className="w-6 h-6" />
          <div className="absolute left-full ml-4 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 shadow-xl backdrop-blur-md"
            style={{
              background: dark ? 'rgba(15, 15, 20, 0.85)' : 'rgba(255, 255, 255, 0.95)',
              color: dark ? '#fff' : '#000',
              border: '1px solid',
              borderColor: dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
            }}
          >
            Map Overlays
          </div>
        </button>

        {/* Alert - Alert Panel */}
        <button
          onClick={() => setAlertPanelOpen(!alertPanelOpen)}
          className="relative group p-3 rounded-2xl transition-all duration-200 flex items-center justify-center"
          style={buttonStyle(alertPanelOpen)}
          onMouseEnter={e => { if (!alertPanelOpen) e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'; }}
          onMouseLeave={e => { if (!alertPanelOpen) e.currentTarget.style.background = 'transparent'; }}
        >
          <ShieldAlert className="w-6 h-6" />
          <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <div className="absolute left-full ml-4 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 shadow-xl backdrop-blur-md"
            style={{
              background: dark ? 'rgba(15, 15, 20, 0.85)' : 'rgba(255, 255, 255, 0.95)',
              color: dark ? '#fff' : '#000',
              border: '1px solid',
              borderColor: dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
            }}
          >
            Alerts
          </div>
        </button>

        <div className="w-full h-px bg-gray-500/20 my-1" />
        
        {/* Inspect Tool */}
        <button
          onClick={() => { setInspectMode(!inspectMode); setMeasureMode(false); setNodeMenuOpen(false); setMapOverlayOpen(false); }}
          className="relative group p-3 rounded-2xl transition-all duration-200 flex items-center justify-center"
          style={buttonStyle(inspectMode)}
          onMouseEnter={e => { if (!inspectMode) e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'; }}
          onMouseLeave={e => { if (!inspectMode) e.currentTarget.style.background = 'transparent'; }}
        >
          <Target className="w-6 h-6" />
          <div className="absolute left-full ml-4 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 shadow-xl backdrop-blur-md"
            style={{
              background: dark ? 'rgba(15, 15, 20, 0.85)' : 'rgba(255, 255, 255, 0.95)',
              color: dark ? '#fff' : '#000',
              border: '1px solid',
              borderColor: dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
            }}
          >
            Inspect Location Weather
          </div>
        </button>

        {/* Measure Tool */}
        <button
          onClick={() => { setMeasureMode(!measureMode); setInspectMode(false); setNodeMenuOpen(false); setMapOverlayOpen(false); }}
          className="relative group p-3 rounded-2xl transition-all duration-200 flex items-center justify-center"
          style={buttonStyle(measureMode)}
          onMouseEnter={e => { if (!measureMode) e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'; }}
          onMouseLeave={e => { if (!measureMode) e.currentTarget.style.background = 'transparent'; }}
        >
          <Ruler className="w-6 h-6" />
          <div className="absolute left-full ml-4 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 shadow-xl backdrop-blur-md"
            style={{
              background: dark ? 'rgba(15, 15, 20, 0.85)' : 'rgba(255, 255, 255, 0.95)',
              color: dark ? '#fff' : '#000',
              border: '1px solid',
              borderColor: dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
            }}
          >
            Measure Distance
          </div>
        </button>
      </div>

      {/* Node Selection Submenu */}
      {nodeMenuOpen && (
        <div 
          className="rounded-[24px] p-4 flex flex-col gap-2 backdrop-blur-xl border shadow-2xl transition-all duration-300"
          style={{
            background: dark ? 'rgba(15, 15, 20, 0.85)' : 'rgba(255, 255, 255, 0.95)',
            borderColor: dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          }}
        >
          <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: dark ? '#94a3b8' : '#64748b' }}>Select Region</h3>
          {NODES.map(node => (
            <button
              key={node}
              onClick={() => { setActiveNode(node); setNodeMenuOpen(false); }}
              className="text-left px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
              style={{
                background: activeNode === node ? (dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') : 'transparent',
                color: activeNode === node ? (dark ? '#fff' : '#000') : (dark ? '#94a3b8' : '#64748b'),
              }}
            >
              {node}
            </button>
          ))}
        </div>
      )}

      {/* Map Overlays Submenu */}
      {mapOverlayOpen && (
        <div 
          className="rounded-[24px] p-4 flex flex-col gap-2 backdrop-blur-xl border shadow-2xl transition-all duration-300 min-w-[200px]"
          style={{
            background: dark ? 'rgba(15, 15, 20, 0.85)' : 'rgba(255, 255, 255, 0.95)',
            borderColor: dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          }}
        >
          <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: dark ? '#94a3b8' : '#64748b' }}>Map Overlays</h3>
          {LAYERS.map(({ key, label, icon: Icon, color }) => {
            const active = layers?.[key] !== false;
            return (
              <button
                key={key}
                onClick={() => toggleLayer(key)}
                className="flex items-center w-full px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
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
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
