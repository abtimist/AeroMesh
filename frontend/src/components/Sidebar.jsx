// Sidebar — desktop command center, icon-only 72px
// NO camera/report link — that's mobile only
// Desktop nav: Dashboard, Map, Alerts, History, Settings

import { useLocation, Link } from 'react-router-dom';
import { LayoutDashboard, Map, AlertTriangle, Clock, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/'        },
  { icon: Map,             label: 'Map',       to: '/map'     },
  { icon: AlertTriangle,   label: 'Alerts',    to: '/alerts', badge: 3 },
  { icon: Clock,           label: 'History',   to: '/history' },
];

export default function Sidebar() {
  const { pathname } = useLocation();

  return (
    <nav
      className="flex flex-col h-full shrink-0 z-40 transition-colors"
      style={{
        width: 'var(--sidebar-width)',
        background: 'var(--color-sidebar-bg)',
        borderRight: '1px solid var(--color-border)',
      }}
    >
      <div className="flex-1 flex flex-col gap-1 py-3 px-2">
        {NAV_ITEMS.map(({ icon: Icon, label, to, badge }) => {
          const active = pathname === to || (to !== '/' && pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className="sidebar-nav-item relative flex items-center justify-center rounded-xl py-3 transition-all duration-150"
              style={{
                background: active ? 'var(--color-primary-tint)' : 'transparent',
                color: active ? 'var(--color-primary)' : 'var(--color-text-disabled)',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-blue-600 rounded-r-full" />
              )}
              <div className="relative">
                <Icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.75} />
                {badge && !active && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-sm">
                    {badge}
                  </span>
                )}
              </div>
              <span className="sidebar-tooltip">{label}</span>
            </Link>
          );
        })}
      </div>

      {/* Settings pinned bottom */}
      <div className="px-2 pb-3">
        <Link
          to="/settings"
          className="sidebar-nav-item relative flex items-center justify-center rounded-xl py-3 transition-all duration-150"
          style={{ color: 'var(--color-text-disabled)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          <Settings className="w-5 h-5" strokeWidth={1.75} />
          <span className="sidebar-tooltip">Settings</span>
        </Link>
      </div>
    </nav>
  );
}
