import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useState, lazy, Suspense } from 'react';
import './index.css';
import { useDeviceType } from './hooks';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
import CitizenPortalPage from './pages/CitizenPortalPage';

function SmartRoot({ activeNode, setActiveNode, initialPanel }) {
  const device = useDeviceType();

  // Mobile users automatically get the citizen portal — no routing needed
  if (device === 'mobile') {
    return <CitizenPortalPage />;
  }

  // Desktop users get the full command center
  return <DashboardPage activeNode={activeNode} setActiveNode={setActiveNode} initialPanel={initialPanel} />;
}

function NotFoundPage() {
  return (
    <div className="flex items-center justify-center h-screen" style={{ background: 'var(--color-page-bg)' }}>
      <div className="text-center space-y-3">
        <p className="text-6xl font-bold" style={{ color: 'var(--color-border-strong)' }}>404</p>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Page not found.</p>
        <a href="/" className="text-sm text-blue-600 hover:underline">← Back to Dashboard</a>
      </div>
    </div>
  );
}

export default function App() {
  const [activeNode, setActiveNode] = useState('India Node');

  return (
    <BrowserRouter>
      <Suspense fallback={<div className="p-8">Loading AeroMesh…</div>}><Routes>
        <Route path="/"       element={<LandingPage />} />
        
        {/* Map dashboard routes */}
        <Route path="/alerts" element={<DashboardPage activeNode={activeNode} setActiveNode={setActiveNode} initialPanel="alerts" />} />
        <Route path="/map"    element={<DashboardPage activeNode={activeNode} setActiveNode={setActiveNode} initialPanel="none" />} />
        <Route path="/history" element={<DashboardPage activeNode={activeNode} setActiveNode={setActiveNode} initialPanel="history" />} />

        {/* /report → always citizen portal — shareable link for WhatsApp/SMS dispatch */}
        <Route path="/report" element={<CitizenPortalPage />} />

        <Route path="*"       element={<NotFoundPage />} />
      </Routes></Suspense>
    </BrowserRouter>
  );
}
