import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css'

// ─── Page Placeholders ───────────────────────────────────────────────────────
// These will be replaced with real components as we build each day.
// Day 5 will build out the full Command Center and Citizen Portal.

import MapComponent from './components/MapComponent'

function DashboardPage() {
  return (
    <div className="flex flex-col h-full min-h-screen bg-slate-50 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 mb-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-medium text-blue-700">System Online</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">AeroMesh Command Center</h1>
          <p className="text-sm text-slate-500">Real-time fusion of ground sensors, satellites, and citizen reports.</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-red-600 uppercase tracking-widest">Active Alerts: 3</p>
          <a href="/report" className="text-xs text-blue-600 hover:underline">Go to Mobile Portal →</a>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MapComponent />
        </div>
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Latest Plume Forecasts</h3>
          <div className="space-y-4">
            <div className="p-3 border border-red-200 bg-red-50 rounded-lg">
              <div className="flex justify-between">
                <span className="text-xs font-bold text-red-700">#CRITICAL</span>
                <span className="text-xs text-slate-500">2 min ago</span>
              </div>
              <p className="text-sm font-medium text-slate-800 mt-1">Biomass Burning, Delhi</p>
              <p className="text-xs text-slate-600 mt-1">PBLH: 1200m | Wind: 5m/s ESE</p>
            </div>
          </div>
        </div>
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
