import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css'

// ─── Page Placeholders ───────────────────────────────────────────────────────
// These will be replaced with real components as we build each day.
// Day 5 will build out the full Command Center and Citizen Portal.

function DashboardPage() {
  return (
    <div className="flex items-center justify-center h-full min-h-screen bg-slate-50">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-xs font-medium text-blue-700">System Online</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">AeroMesh Command Center</h1>
        <p className="text-sm text-slate-500">Scaffolding complete. Dashboard UI coming Day 5.</p>
      </div>
    </div>
  )
}

function CitizenPortalPage() {
  return (
    <div className="flex items-center justify-center h-full min-h-screen bg-slate-50">
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-semibold text-slate-900">Citizen Reporting Portal</h1>
        <p className="text-sm text-slate-500">Mobile photo upload & GPS reporting. Coming Day 5.</p>
      </div>
    </div>
  )
}

function NotFoundPage() {
  return (
    <div className="flex items-center justify-center h-full min-h-screen bg-slate-50">
      <div className="text-center space-y-3">
        <p className="text-5xl font-bold text-slate-200">404</p>
        <p className="text-sm text-slate-500">Page not found.</p>
        <a href="/" className="text-sm text-blue-600 hover:underline">← Back to Dashboard</a>
      </div>
    </div>
  )
}

// ─── Root App with Routing ────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/report" element={<CitizenPortalPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
