// Topbar — desktop command center header
// Has dark/light mode toggle, node switcher, role switcher, notifications, user profile

import { useState } from 'react';
import { Bell, ChevronDown, Search, Sun, Moon } from 'lucide-react';

const NODES = ['India Node', 'Brazil Node', 'China Node', 'South Africa Node'];
const ROLES = ['Admin Officer', 'Regional Inspector', 'Citizen'];

export default function Topbar({ alertCount = 3, dark, onToggleDark }) {
  const [node, setNode] = useState('India Node');
  const [nodeOpen, setNodeOpen] = useState(false);
  const [role, setRole] = useState('Admin Officer');
  const [roleOpen, setRoleOpen] = useState(false);

  const surface = 'var(--color-topbar-bg)';
  const border  = 'var(--color-border)';
  const text    = 'var(--color-text-primary)';
  const muted   = 'var(--color-text-secondary)';
  const inputBg = 'var(--color-input-bg)';

  return (
    <header
      className="flex items-center justify-between px-4 shrink-0 z-50"
      style={{
        height: 'var(--topbar-height)',
        background: surface,
        borderBottom: `1px solid ${border}`,
      }}
    >
      {/* ── Logo ── */}
      <div className="flex items-center gap-2.5 shrink-0" style={{ width: 'var(--sidebar-width)' }}>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-sm select-none shadow-sm">
          A
        </div>
        <span className="font-semibold text-sm tracking-tight hidden lg:block" style={{ color: text }}>
          AeroMesh
        </span>
      </div>

      {/* ── Search ── */}
      <div className="flex-1 max-w-sm mx-6 hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: muted }} />
          <input
            type="search"
            placeholder="Search locations, sensors, events…"
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition"
            style={{
              background: inputBg,
              border: `1px solid ${border}`,
              color: text,
            }}
          />
        </div>
      </div>

      {/* ── Right controls ── */}
      <div className="flex items-center gap-2">

        {/* Role switcher — for hackathon judges */}
        <div className="relative hidden lg:block">
          <button
            onClick={() => setRoleOpen(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition"
            style={{ background: inputBg, border: `1px solid ${border}`, color: muted }}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            {role}
            <ChevronDown className="w-3 h-3" style={{ color: muted }} />
          </button>
          {roleOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-48 rounded-xl shadow-xl py-1 z-50 border"
              style={{ background: surface, borderColor: border }}
            >
              <p className="px-3 py-1.5 text-[10px] uppercase tracking-widest font-medium" style={{ color: muted }}>
                View as
              </p>
              {ROLES.map(r => (
                <button
                  key={r}
                  onClick={() => { setRole(r); setRoleOpen(false); }}
                  className="w-full text-left px-3 py-2 text-sm transition hover:bg-blue-50"
                  style={{ color: role === r ? '#2563eb' : text, fontWeight: role === r ? 600 : 400 }}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Node switcher */}
        <div className="relative">
          <button
            onClick={() => setNodeOpen(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition"
            style={{ background: inputBg, border: `1px solid ${border}`, color: text }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            {node}
            <ChevronDown className="w-3 h-3" style={{ color: muted }} />
          </button>
          {nodeOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-52 rounded-xl shadow-xl py-1 z-50 border"
              style={{ background: surface, borderColor: border }}
            >
              {NODES.map(n => (
                <button
                  key={n}
                  onClick={() => { setNode(n); setNodeOpen(false); }}
                  className="w-full text-left px-3 py-2 text-sm transition"
                  style={{
                    color: node === n ? '#2563eb' : text,
                    fontWeight: node === n ? 600 : 400,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dark/Light toggle */}
        <button
          onClick={onToggleDark}
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-2 rounded-lg transition"
          style={{ color: muted }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notification bell */}
        <button
          className="relative p-2 rounded-lg transition"
          style={{ color: muted }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <Bell className="w-5 h-5" />
          {alertCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2"
              style={{ '--tw-ring-color': surface }} />
          )}
        </button>

        {/* User avatar */}
        <button
          className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg transition"
          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold select-none">
            JD
          </div>
          <span className="text-sm font-medium hidden lg:block" style={{ color: text }}>Jane D.</span>
          <ChevronDown className="w-3 h-3 hidden lg:block" style={{ color: muted }} />
        </button>
      </div>
    </header>
  );
}
