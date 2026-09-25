// Step 1.4 — Sidebar (rebuild)
// 72px wide, icon-only, white background, tooltip on hover
// Active = blue-50 bg + blue-600 icon. Inactive = slate-400 icon.

import { useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard, Map, AlertTriangle,
  Camera, Clock, Settings
} from 'lucide-react';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',   to: '/'        },
  { icon: Map,             label: 'Map',          to: '/map'     },
  { icon: AlertTriangle,   label: 'Alerts',       to: '/alerts', badge: 3 },
  { icon: Camera,          label: 'Report',       to: '/report'  },
  { icon: Clock,           label: 'History',      to: '/history' },
];

export default function Sidebar() {
  const { pathname } = useLocation();

  return (
    <nav
      className="flex flex-col h-full bg-white border-r border-slate-200 shrink-0 z-40"
      style={{ width: 'var(--sidebar-width)' }}
    >
      {/* Nav items */}
      <div className="flex-1 flex flex-col gap-1 py-3 px-2">
        {NAV_ITEMS.map(({ icon: Icon, label, to, badge }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`sidebar-nav-item relative flex items-center justify-center rounded-xl py-3 transition-all duration-150
                ${active
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                }`}
            >
              {/* Active left bar */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-blue-600 rounded-r-full" />
              )}

              <div className="relative">
                <Icon className="w-5 h-5" strokeWidth={active ? 2 : 1.75} />
                {badge && !active && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </div>

              {/* Tooltip */}
              <span className="sidebar-tooltip">{label}</span>
            </Link>
          );
        })}
      </div>

      {/* Settings — pinned to bottom */}
      <div className="px-2 pb-3">
        <Link
          to="/settings"
          className="sidebar-nav-item relative flex items-center justify-center rounded-xl py-3 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all duration-150"
        >
          <Settings className="w-5 h-5" strokeWidth={1.75} />
          <span className="sidebar-tooltip">Settings</span>
        </Link>
      </div>
    </nav>
  );
}
