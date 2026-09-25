// DashboardPage — the main Command Center view
// Full-bleed map + floating KPIs + slide-in AlertPanel triggered from sidebar
// Uses DashboardLayout which provides Topbar + Sidebar

import { useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import MapView from '../components/MapView';

export default function DashboardPage() {
  const [alertPanelOpen, setAlertPanelOpen] = useState(true); // open by default for demo

  return (
    <DashboardLayout alertCount={3}>
      {/* MapView fills 100% of the content area */}
      <MapView
        alertPanelOpen={alertPanelOpen}
        onAlertPanelClose={() => setAlertPanelOpen(false)}
      />

      {/* Alert panel trigger — clicking Alerts in sidebar should open this */}
      {/* Shortcut button for demo purposes */}
      {!alertPanelOpen && (
        <button
          onClick={() => setAlertPanelOpen(true)}
          className="absolute top-4 right-4 z-[500] flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-xl shadow-md text-sm font-medium text-slate-700 hover:bg-white transition"
        >
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          3 Alerts
        </button>
      )}
    </DashboardLayout>
  );
}
