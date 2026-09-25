import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css'

// ─── Page Placeholders ───────────────────────────────────────────────────────
// These will be replaced with real components as we build each day.
// Day 5 will build out the full Command Center and Citizen Portal.

import MapComponent from './components/MapComponent'
import Sidebar from './components/Sidebar'
import AlertsPanel from './components/AlertsPanel'

function DashboardPage() {
  return (
    <div className="flex h-screen w-full bg-slate-950 overflow-hidden font-sans">
      <Sidebar />
      <AlertsPanel />
      
      {/* Main Map Area */}
      <main className="flex-1 relative h-full flex flex-col">
        {/* Top Header Overlay */}
        <header className="absolute top-0 left-0 w-full p-6 z-[1000] pointer-events-none flex justify-between items-start">
          <div className="pointer-events-auto bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-slate-700/50 shadow-2xl">
            <h1 className="text-2xl font-bold text-white tracking-tight">Global Threat Map</h1>
            <p className="text-sm text-slate-400">Live fusion of NASA FIRMS, OpenAQ & Citizen CV</p>
          </div>
          
          <div className="pointer-events-auto flex items-center gap-3">
            <div className="px-4 py-2 bg-indigo-500/20 border border-indigo-500/50 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/20 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-xs font-bold text-indigo-300">Laya AI Engine: ACTIVE</span>
            </div>
          </div>
        </header>

        {/* The Map spans the entire remaining area */}
        <div className="w-full h-full">
          <MapComponent />
        </div>
      </main>
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
