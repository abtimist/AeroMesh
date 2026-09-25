// CitizenPortalPage — Mobile Citizen Reporting Portal (/report)
// Layout: alert banner → AQI gauge → Report button → weather mini-cards → bottom tab bar
// Following the approved mobile mockup exactly

import { Camera, Map as MapIcon, Bell, Home, Wind, Layers, Loader2, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import AQIGauge from '../components/AQIGauge';

// Mock data — in production, fetched from /api/analysis nearest sensor
const MOCK_AQI = { pm25: 198, wind: '14 km/h SE', mixingHeight: '450m' };

const AQI_BANNER_COLORS = {
  GOOD:           'bg-green-600',
  MODERATE:       'bg-yellow-500',
  USG:            'bg-orange-500',
  UNHEALTHY:      'bg-red-600',
  VERY_UNHEALTHY: 'bg-purple-700',
  HAZARDOUS:      'bg-[#7e0023]',
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
  const { pm25, wind, mixingHeight } = MOCK_AQI;
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
        // Fallback mock coordinates if user denies or it fails (Indo-Gangetic plain)
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
      // Reset input
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 max-w-md mx-auto overflow-hidden">
      {/* ── App header ── */}
      <header className="flex items-center justify-center py-4 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-blue-600 text-white flex items-center justify-center text-xs font-bold">A</div>
          <span className="font-semibold text-slate-900">AeroMesh</span>
        </div>
      </header>

      {/* ── Main scrollable content ── */}
      <div className="flex-1 overflow-y-auto">

        {/* Alert banner — color = AQI level */}
        <div className={`${bannerBg} text-white px-4 py-3 text-sm font-medium leading-snug`}>
          ⚠️ {advice}
        </div>

        {activeTab === 'home' && (
          <div className="p-4 flex flex-col gap-4">
            <h2 className="font-bold text-lg text-slate-800">Welcome, Citizen</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col items-center">
              <p className="text-sm text-slate-500 mb-2">Current AQI in your area</p>
              <AQIGauge pm25Value={pm25} />
            </div>
            {/* Weather mini-cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <Wind className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Wind</span>
                </div>
                <p className="text-lg font-bold text-slate-900">{wind}</p>
                <p className="text-xs text-slate-400 mt-0.5">Current direction</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <Layers className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Mixing Height</span>
                </div>
                <p className="text-lg font-bold text-slate-900">{mixingHeight}</p>
                <p className="text-xs text-slate-400 mt-0.5">Pollution trapped below</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'report' && (
          <>
            {/* AQI Gauge */}
            <div className="bg-white mx-4 mt-4 rounded-2xl shadow-sm border border-slate-100 p-4 flex justify-center">
              <AQIGauge pm25Value={pm25} />
            </div>

            {/* Report Button — full-width, massive, impossible to miss */}
            <div className="px-4 mt-4 relative">
              {error && <p className="text-red-500 text-xs text-center mb-2">{error}</p>}
              
              <label
                htmlFor="citizen-photo-upload"
                className={`flex flex-col items-center justify-center gap-1 w-full h-14 text-white rounded-2xl font-semibold text-base cursor-pointer transition shadow-md select-none ${
                  uploadSuccess ? 'bg-green-500 shadow-green-500/30' : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-blue-600/30'
                } ${uploading ? 'opacity-75 cursor-not-allowed' : ''}`}
              >
                {uploading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </div>
                ) : uploadSuccess ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Report Sent!
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Camera className="w-5 h-5" />
                      Report Smoke / Fire
                    </div>
                    <span className="text-xs font-normal opacity-75">Upload a geotagged photo</span>
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
          </>
        )}

        {activeTab === 'map' && (
          <div className="flex flex-col items-center justify-center p-8 text-slate-500 h-full">
            <MapIcon className="w-12 h-12 mb-4 text-slate-300" />
            <p className="font-semibold text-slate-700">Mobile Map View</p>
            <p className="text-xs text-center mt-2">A simplified map showing active reports near you would appear here.</p>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="p-4">
            <h2 className="font-bold text-lg text-slate-800 mb-4">Local Alerts</h2>
            <div className="bg-red-50 rounded-xl p-4 border border-red-100 flex flex-col gap-2">
              <span className="text-xs font-bold text-red-600 uppercase tracking-widest">Active Warning</span>
              <p className="text-sm font-medium text-slate-900">High PM2.5 levels detected near your location.</p>
              <p className="text-xs text-slate-500">Stay indoors and avoid strenuous outdoor activities.</p>
            </div>
          </div>
        )}

        {/* Bottom padding for tab bar */}
        <div className="h-6" />
      </div>

      {/* ── Bottom Tab Bar ── */}
      <nav className="h-16 bg-white border-t border-slate-200 flex items-center shrink-0">
        {[
          { icon: Home,   label: 'Home',   id: 'home' },
          { icon: MapIcon,label: 'Map',    id: 'map' },
          { icon: Camera, label: 'Report', id: 'report' },
          { icon: Bell,   label: 'Alerts', id: 'alerts' },
        ].map(({ icon: Icon, label, id }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition
              ${activeTab === id ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Icon className={`w-5 h-5 ${activeTab === id ? 'text-blue-600' : ''}`} />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
