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
  const [inspectMode, setInspectMode] = useState(false);
  const [mapType, setMapType] = useState('satellite');
  
  // Lift layers state up so Sidebar can control overlays
  const [layers, setLayers] = useState({
    sensors: true, plumes: true, fire: true, wind: false, corridors: false,
  });
  const toggleLayer = key => setLayers(prev => ({ ...prev, [key]: !prev[key] }));

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
        inspectMode={inspectMode}
        setInspectMode={setInspectMode}
        mapType={mapType}
        layers={layers}
      />

      <FloatingSidebar 
        activeNode={activeNode} 
        setActiveNode={setActiveNode} 
        measureMode={measureMode} 
        setMeasureMode={setMeasureMode}
        inspectMode={inspectMode}
        setInspectMode={setInspectMode}
        alertPanelOpen={alertPanelOpen}
        setAlertPanelOpen={setAlertPanelOpen}
        mapType={mapType}
        setMapType={setMapType}
        layers={layers}
        toggleLayer={toggleLayer}
      />
    </DashboardLayout>
  );
}
