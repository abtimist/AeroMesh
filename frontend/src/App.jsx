// App.jsx — Root router
// KEY ARCHITECTURAL DECISION:
//   - Mobile devices (< 768px) → automatically get CitizenPortalPage
//   - Desktop devices → get the Command Center (DashboardPage)
//   - There is NO camera/report link in the desktop sidebar
//   - The /report URL can still be shared directly to citizens via WhatsApp/SMS
//
// This matches the PWA design: one codebase, two completely separate experiences.

import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import { useDeviceType } from './hooks'

import DashboardPage     from './pages/DashboardPage'
import CitizenPortalPage from './pages/CitizenPortalPage'

function SmartRoot() {
  const device = useDeviceType();

  // Mobile users automatically get the citizen portal — no routing needed
  if (device === 'mobile') {
    return <CitizenPortalPage />;
  }

  // Desktop users get the full command center
  return <DashboardPage />;
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
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* / → automatically detects device and routes accordingly */}
        <Route path="/"       element={<SmartRoot />} />

        {/* /report → always citizen portal — shareable link for WhatsApp/SMS dispatch */}
        <Route path="/report" element={<CitizenPortalPage />} />

        <Route path="*"       element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
