// DashboardPage — the main Command Center view
// Full-bleed map + floating KPIs + slide-in AlertPanel triggered from sidebar
// Uses DashboardLayout which provides Topbar

import { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import MapView from '../components/MapView';
import FloatingSidebar from '../components/FloatingSidebar';

export default function DashboardPage({ activeNode, setActiveNode, initialPanel }) {
  const [alertPanelOpen, setAlertPanelOpen] = useState(initialPanel === 'alerts');
  const [measureMode, setMeasureMode] = useState(false);

  useEffect(() => {
    if (initialPanel === 'alerts') setAlertPanelOpen(true);
    else setAlertPanelOpen(false);
  }, [initialPanel]);

  return (
    <DashboardLayout alertCount={3} activeNode={activeNode} setActiveNode={setActiveNode}>
      {/* MapView fills 100% of the content area */}
      <MapView
        activeNode={activeNode}
        alertPanelOpen={alertPanelOpen}
        onAlertPanelClose={() => setAlertPanelOpen(false)}
        measureMode={measureMode}
      />

      <FloatingSidebar activeNode={activeNode} setActiveNode={setActiveNode} measureMode={measureMode} setMeasureMode={setMeasureMode} />

      {/* Alert panel trigger — positioned at top-4 right-4, ABOVE the Layers control at top-16 */}
      {!alertPanelOpen && (
        <button
          onClick={() => setAlertPanelOpen(true)}
          className="absolute top-4 right-4 z-[510] flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold transition-all hover:scale-105"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
        >
          <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
          Alerts
        </button>
      )}
    </DashboardLayout>
  );
}
