import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'

import DashboardPage    from './pages/DashboardPage'
import CitizenPortalPage from './pages/CitizenPortalPage'

function NotFoundPage() {
  return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="text-center space-y-3">
        <p className="text-6xl font-bold text-slate-200">404</p>
        <p className="text-sm text-slate-500">Page not found.</p>
        <a href="/" className="text-sm text-blue-600 hover:underline">← Back to Dashboard</a>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"       element={<DashboardPage />} />
        <Route path="/report" element={<CitizenPortalPage />} />
        <Route path="*"       element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
