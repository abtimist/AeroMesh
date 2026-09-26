import { useState } from 'react';
import { useTheme } from '../hooks';
import { Globe2, Map, ShieldAlert, Navigation } from 'lucide-react';

const NODES = [
  { id: 'India Node', icon: Globe2 },
  { id: 'Brazil Node', icon: Map },
  { id: 'China Node', icon: ShieldAlert },
  { id: 'South Africa Node', icon: Navigation }
];

export default function FloatingSidebar({ activeNode, setActiveNode }) {
  const { dark } = useTheme();

  return (
    <div className="absolute left-6 top-1/2 -translate-y-1/2 z-[500]">
      <div 
        className="rounded-[24px] p-2 flex flex-col gap-2 backdrop-blur-md border shadow-2xl transition-all duration-300"
        style={{
          background: dark ? 'rgba(15, 15, 20, 0.75)' : 'rgba(255, 255, 255, 0.85)',
          borderColor: dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
        }}
      >
        {NODES.map((node) => {
          const active = activeNode === node.id;
          const Icon = node.icon;
          return (
            <button
              key={node.id}
              onClick={() => setActiveNode(node.id)}
              className="relative group p-3 rounded-2xl transition-all duration-200 flex items-center justify-center"
              style={{
                background: active ? (dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') : 'transparent',
                color: active ? (dark ? '#fff' : '#000') : (dark ? '#64748b' : '#94a3b8'),
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              <Icon className="w-6 h-6" />
              
              {/* Tooltip */}
              <div className="absolute left-full ml-4 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 shadow-xl backdrop-blur-md"
                style={{
                  background: dark ? 'rgba(15, 15, 20, 0.85)' : 'rgba(255, 255, 255, 0.95)',
                  color: dark ? '#fff' : '#000',
                  border: '1px solid',
                  borderColor: dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                }}
              >
                {node.id}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
