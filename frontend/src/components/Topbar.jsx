// Step 1.3 — Topbar
// h-14 (56px), bg-white, border-b border-slate-200
// Left: logo, Center: search, Right: node switcher + bell + user

import { useState } from 'react';
import { Bell, ChevronDown, Search } from 'lucide-react';

const NODES = ['India Node', 'Brazil Node', 'China Node', 'South Africa Node'];

export default function Topbar({ alertCount = 3 }) {
  const [node, setNode] = useState('India Node');
  const [nodeOpen, setNodeOpen] = useState(false);
  const [role, setRole] = useState('Admin Officer');
  const [roleOpen, setRoleOpen] = useState(false);

  const ROLES = ['Admin Officer', 'Regional Inspector', 'Citizen'];

  return (
    <header
      className="flex items-center justify-between px-4 bg-white border-b border-slate-200 shrink-0 z-50"
      style={{ height: 'var(--topbar-height)' }}
    >
      {/* ── Left: Logo ── */}
      <div className="flex items-center gap-2.5 w-[var(--sidebar-width)] shrink-0">
        {/* Wind + Leaf icon mark */}
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-sm select-none">
          A
        </div>
        <span className="font-semibold text-slate-900 text-sm tracking-tight hidden lg:block">AeroMesh</span>
      </div>

      {/* ── Center: Search ── */}
      <div className="flex-1 max-w-md mx-6 hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search locations, sensors, events…"
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
          />
        </div>
      </div>

      {/* ── Right: Controls ── */}
      <div className="flex items-center gap-3">

        {/* Hackathon Role Switcher */}
        <div className="relative hidden lg:block">
          <button
            onClick={() => setRoleOpen(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
          >
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            {role}
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
          {roleOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
              <p className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-slate-400 font-medium">View as</p>
              {ROLES.map(r => (
                <button
                  key={r}
                  onClick={() => { setRole(r); setRoleOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition ${role === r ? 'text-blue-600 font-medium' : 'text-slate-700'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Node Switcher */}
        <div className="relative">
          <button
            onClick={() => setNodeOpen(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            {node}
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
          {nodeOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
              {NODES.map(n => (
                <button
                  key={n}
                  onClick={() => { setNode(n); setNodeOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition ${node === n ? 'text-blue-600 font-medium' : 'text-slate-700'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notification Bell */}
        <button className="relative p-2 rounded-lg hover:bg-slate-100 transition text-slate-500 hover:text-slate-700">
          <Bell className="w-5 h-5" />
          {alertCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
          )}
        </button>

        {/* User Avatar */}
        <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-slate-100 transition">
          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold select-none">
            JD
          </div>
          <span className="text-sm font-medium text-slate-700 hidden lg:block">Jane D.</span>
          <ChevronDown className="w-3 h-3 text-slate-400 hidden lg:block" />
        </button>
      </div>
    </header>
  );
}
