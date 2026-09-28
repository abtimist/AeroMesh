import { Camera, Map as MapIcon, Bell, Home, Wind, Layers, Loader2, CheckCircle2, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AQIGauge from '../components/AQIGauge';
import { Link } from 'react-router-dom';

// Mock data
const MOCK_AQI = { pm25: 198, wind: '14 km/h SE', mixingHeight: '450m' };

const AQI_BANNER_COLORS = {
  GOOD:           'from-green-500/80 to-green-600/80',
  MODERATE:       'from-yellow-500/80 to-yellow-600/80',
  USG:            'from-orange-500/80 to-orange-600/80',
  UNHEALTHY:      'from-red-500/80 to-red-600/80',
  VERY_UNHEALTHY: 'from-purple-600/80 to-purple-700/80',
  HAZARDOUS:      'from-[#7e0023]/80 to-[#5a0018]/80',
};

function getLevel(pm25) {
  if (pm25 <= 50)  return 'GOOD';
  if (pm25 <= 100) return 'MODERATE';
  if (pm25 <= 150) return 'USG';
  if (pm25 <= 200) return 'UNHEALTHY';
  if (pm25 <= 300) return 'VERY_UNHEALTHY';
  return 'HAZARDOUS';
}

const LEVEL_ADVICE = {
  GOOD: 'Air quality is good. Safe to go outside.',
  MODERATE: 'Air quality is moderate. Sensitive groups should limit outdoor activity.',
  USG: 'Unhealthy for sensitive groups. Reduce prolonged outdoor exertion.',
  UNHEALTHY: 'Air Quality: UNHEALTHY — PM2.5: {pm25} µg/m³. Stay indoors.',
  VERY_UNHEALTHY: 'Very unhealthy air. Avoid all outdoor activity.',
  HAZARDOUS: 'Hazardous air quality. Stay indoors with windows closed.',
};

export default function CitizenPortalPage() {
  const { pm25, wind } = MOCK_AQI;
  const level = getLevel(pm25);
  const bannerBg = AQI_BANNER_COLORS[level];
  const advice = LEVEL_ADVICE[level].replace('{pm25}', pm25);

  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('report');

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      // 1. Get GPS coordinates
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
      }).catch(() => {
        return { coords: { latitude: 28.522, longitude: 77.275 } };
      });

      const { latitude, longitude } = pos.coords;

      // 2. Prepare multipart form data
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('lat', latitude);
      formData.append('lon', longitude);
      formData.append('device_id', 'citizen-app-' + Math.floor(Math.random() * 1000));

      // 3. Send to backend
      const res = await fetch('http://localhost:8000/api/ingestion/report', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 4000);
    } catch (err) {
      console.error(err);
      setError('Failed to upload report. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const navItems = [
    { icon: Home,   label: 'Home',   id: 'home' },
    { icon: MapIcon,label: 'Map View',    id: 'map' },
    { icon: Camera, label: 'Report', id: 'report' },
    { icon: Bell,   label: 'Alerts', id: 'alerts' },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#0F0E0C] text-white font-['DM_Sans',sans-serif] overflow-hidden relative selection:bg-white/20 selection:text-white">
      {/* Background Abstract Map Pattern */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #ffffff 2px, transparent 2px)', backgroundSize: '32px 32px' }}></div>
        <div className="absolute top-1/4 -right-1/4 w-[800px] h-[800px] bg-blue-600 rounded-full mix-blend-screen filter blur-[120px] opacity-20"></div>
        <div className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] bg-red-600 rounded-full mix-blend-screen filter blur-[100px] opacity-10"></div>
      </div>

      {/* ── Desktop Sidebar / Mobile Top Header ── */}
      <header className="z-20 flex md:flex-col items-center justify-between md:justify-start md:w-64 p-4 md:p-6 bg-[#1A1A1A]/60 backdrop-blur-xl border-b md:border-b-0 md:border-r border-white/10 shrink-0 shadow-lg">
        <div className="flex items-center gap-3 w-full">
          <img src="/icon.png" alt="AeroMesh Logo" className="w-8 h-8 opacity-90 brightness-200 contrast-200 filter" />
          <span className="font-['Geist',sans-serif] font-bold text-xl tracking-tight hidden sm:block md:block">AeroMesh</span>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex flex-col w-full mt-10 gap-2">
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/40 mb-2 px-3">Citizen Portal</span>
          {navItems.map(({ icon: Icon, label, id }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all w-full text-left
                ${activeTab === id ? 'bg-white/10 text-white shadow-inner border border-white/5' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {label}
            </button>
          ))}
          <div className="mt-8 border-t border-white/10 pt-6">
            <Link to="/map" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all w-full">
              <ChevronRight className="w-5 h-5 shrink-0" />
              Main Dashboard
            </Link>
          </div>
        </nav>

        {/* Mobile Header elements */}
        <div className="md:hidden flex items-center gap-3">
           <Link to="/map" className="text-xs font-medium text-white/60 hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-full border border-white/10">Dashboard</Link>
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <main className="z-10 flex-1 overflow-y-auto pb-20 md:pb-0 relative flex flex-col items-center p-4 md:p-10">
        
        <div className="w-full max-w-2xl mx-auto flex flex-col gap-6 relative">
          
          <AnimatePresence mode="wait">
            {/* Home Tab */}
            {activeTab === 'home' && (
              <motion.div key="home" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col gap-6">
                
                {/* Alert Banner */}
                <div className={`bg-gradient-to-r ${bannerBg} rounded-2xl p-5 shadow-lg border border-white/20 backdrop-blur-md`}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <h3 className="font-['Geist',sans-serif] font-bold text-white text-lg mb-1">Air Quality Alert</h3>
                      <p className="text-white/90 text-sm leading-relaxed">{advice}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#1A1A1A]/40 backdrop-blur-2xl rounded-3xl shadow-xl border border-white/10 p-6 sm:p-8 flex flex-col items-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
                  <h2 className="font-['Geist',sans-serif] font-bold text-2xl text-white self-start mb-1">Current Conditions</h2>
                  <p className="text-white/50 text-sm self-start mb-8">Detected at nearest monitoring station</p>
                  
                  <div className="h-64 flex items-center justify-center w-full mb-8">
                    <AQIGauge pm25Value={pm25} />
                  </div>

                  <div className="grid grid-cols-2 gap-4 w-full">
                    <div className="bg-white/5 rounded-2xl border border-white/10 p-5 flex flex-col">
                      <div className="flex items-center gap-2 text-white/50 mb-2">
                        <Wind className="w-4 h-4" />
                        <span className="text-[11px] font-bold uppercase tracking-wider">Wind</span>
                      </div>
                      <p className="text-xl font-['Geist',sans-serif] font-bold text-white">{wind}</p>
                      <p className="text-xs text-white/40 mt-1">Surface velocity</p>
                    </div>
                    <div className="bg-white/5 rounded-2xl border border-white/10 p-5 flex flex-col">
                      <div className="flex items-center gap-2 text-white/50 mb-2">
                        <Layers className="w-4 h-4" />
                        <span className="text-[11px] font-bold uppercase tracking-wider">Humidity</span>
                      </div>
                      <p className="text-xl font-['Geist',sans-serif] font-bold text-white">42%</p>
                      <p className="text-xs text-white/40 mt-1">Relative humidity</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Report Tab */}
            {activeTab === 'report' && (
              <motion.div key="report" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col gap-6 h-full justify-center">
                <div className="text-center mb-8">
                  <h2 className="font-['Geist',sans-serif] font-bold text-3xl md:text-4xl text-white mb-3">File an Incident Report</h2>
                  <p className="text-white/60 text-base md:text-lg max-w-lg mx-auto">Spotted an illegal factory emission or agricultural fire? Upload a photo to notify authorities instantly. Your report will be geotagged.</p>
                </div>

                <div className="bg-[#1A1A1A]/40 backdrop-blur-2xl rounded-3xl shadow-xl border border-white/10 p-8 text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent pointer-events-none"></div>
                  
                  {error && <p className="text-red-400 text-sm text-center mb-4 bg-red-400/10 py-2 rounded-lg border border-red-400/20">{error}</p>}
                  
                  <label
                    htmlFor="citizen-photo-upload"
                    className={`relative z-10 flex flex-col items-center justify-center gap-4 w-full h-48 md:h-64 text-white rounded-2xl font-['Geist',sans-serif] text-xl cursor-pointer transition-all border-2 border-dashed ${
                      uploadSuccess 
                        ? 'bg-green-500/20 border-green-500/50 text-green-400' 
                        : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/40'
                    } ${uploading ? 'opacity-75 cursor-not-allowed border-blue-500/50 bg-blue-500/10' : ''}`}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
                        <span className="font-medium text-blue-400">Processing image & location...</span>
                      </>
                    ) : uploadSuccess ? (
                      <>
                        <CheckCircle2 className="w-12 h-12 text-green-400" />
                        <span className="font-medium">Report Successfully Filed!</span>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-2">
                          <Camera className="w-8 h-8 text-white" />
                        </div>
                        <span className="font-semibold">Tap to capture or upload photo</span>
                        <span className="text-sm font-normal text-white/40 font-['DM_Sans',sans-serif]">Supports JPG, PNG • Max 10MB</span>
                      </>
                    )}
                  </label>
                  <input
                    id="citizen-photo-upload"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={uploading || uploadSuccess}
                  />
                </div>
              </motion.div>
            )}

            {/* Map Tab */}
            {activeTab === 'map' && (
              <motion.div key="map" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#1A1A1A]/40 backdrop-blur-2xl rounded-3xl border border-white/10 p-12 flex flex-col items-center justify-center text-center h-[60vh]">
                <MapIcon className="w-16 h-16 mb-6 text-white/20" />
                <h3 className="font-['Geist',sans-serif] font-bold text-2xl text-white mb-2">Regional Map View</h3>
                <p className="text-white/50 text-lg max-w-sm">A simplified map showing active reports and anomalies near your location.</p>
                <Link to="/map" className="mt-8 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-medium transition-colors border border-white/10">Open Command Center</Link>
              </motion.div>
            )}

            {/* Alerts Tab */}
            {activeTab === 'alerts' && (
              <motion.div key="alerts" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col gap-4">
                <h2 className="font-['Geist',sans-serif] font-bold text-2xl text-white mb-2">Local Alerts</h2>
                <div className="bg-red-500/10 backdrop-blur-xl rounded-2xl p-5 border border-red-500/30 flex flex-col gap-3 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-red-400" />
                    <span className="text-[11px] font-bold text-red-400 uppercase tracking-widest">Active Warning • 12 mins ago</span>
                  </div>
                  <p className="text-lg font-medium text-white">High PM2.5 levels detected near your location.</p>
                  <p className="text-sm text-white/60">Stay indoors and avoid strenuous outdoor activities. Plume is expected to disperse in 4 hours.</p>
                </div>
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-white/10 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Resolved • 2 days ago</span>
                  </div>
                  <p className="text-lg font-medium text-white/80">Agricultural fire reported by citizen verified.</p>
                  <p className="text-sm text-white/40">The incident at grid 34B has been resolved by local authorities.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </main>

      {/* ── Mobile Bottom Tab Bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-20 bg-[#1A1A1A]/80 backdrop-blur-2xl border-t border-white/10 flex items-center justify-around px-2 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        {navItems.map(({ icon: Icon, label, id }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex flex-col items-center justify-center gap-1.5 transition-colors
              ${activeTab === id ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
          >
            <div className={`p-1.5 rounded-full transition-colors ${activeTab === id ? 'bg-white/10' : ''}`}>
              <Icon className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-medium tracking-wide">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
