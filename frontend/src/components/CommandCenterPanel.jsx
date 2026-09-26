import { useState, useEffect } from 'react';
import { useTheme } from '../hooks';
import { ChevronRight, ChevronLeft, Activity } from 'lucide-react';

const NODE_CONFIG = {
  'India Node':        { center: [22.5, 78.5] },
  'Brazil Node':       { center: [-14.0, -51.0] },
  'China Node':        { center: [35.0, 105.0] },
  'South Africa Node': { center: [-29.0, 25.0] },
};

export default function CommandCenterPanel({ activeNode }) {
  const { dark } = useTheme();
  const [isOpen, setIsOpen] = useState(true);
  const [weatherData, setWeatherData] = useState(null);
  const [airQuality, setAirQuality] = useState(null);
  const [sensors, setSensors] = useState([]);
  const [events, setEvents] = useState([]);
  
  const currentConfig = NODE_CONFIG[activeNode] || NODE_CONFIG['India Node'];

  useEffect(() => {
    let mounted = true;
    const fetchMeteo = async () => {
      try {
        const [lat, lon] = currentConfig.center;
        
        // Fetch Weather
        const wxRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relative_humidity_2m`);
        if (wxRes.ok && mounted) {
          const wx = await wxRes.json();
          if (wx.current_weather) {
            setWeatherData({
              temp: wx.current_weather.temperature,
              windSpeed: wx.current_weather.windspeed,
              windDir: wx.current_weather.winddirection,
              humidity: wx.hourly?.relative_humidity_2m?.[0] || '--'
            });
          }
        }

        // Fetch Air Quality
        const aqRes = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide`);
        if (aqRes.ok && mounted) {
          const aq = await aqRes.json();
          if (aq.current) {
            setAirQuality(aq.current);
          }
        }
        
        // Fetch Sensors and Events
        const [sensorRes, eventRes] = await Promise.all([
          fetch('http://localhost:8000/api/data/sensors').catch(() => null),
          fetch('http://localhost:8000/api/data/events').catch(() => null)
        ]);
        if (sensorRes?.ok && mounted) {
          const allSensors = await sensorRes.json();
          setSensors(allSensors.filter(s => isPointInNode(s.lat, s.lon)));
        }
        if (eventRes?.ok && mounted) {
          const allEvents = await eventRes.json();
          setEvents(allEvents.filter(e => isPointInNode(e.lat, e.lon)));
        }
      } catch (e) {
        console.error("Failed to fetch data for panel", e);
      }
    };

    fetchMeteo();
    const intv = setInterval(fetchMeteo, 10000);
    return () => {
      mounted = false;
      clearInterval(intv);
    };
  }, [currentConfig.center]);

  // Filter rendering to only show nodes in current active region
  const isPointInNode = (lat, lon) => {
    if (!lat || !lon) return false;
    const [centerLat, centerLon] = currentConfig.center;
    let dLon = Math.abs(lon - centerLon);
    if (dLon > 180) dLon = 360 - dLon;
    const dist = Math.sqrt(Math.pow(lat - centerLat, 2) + Math.pow(dLon, 2));
    return dist < 35;
  };

  // Derived stats
  const activeFires = events.filter(e => e.event_type === 'biomass_burning').length;
  const maxAQI = sensors.length > 0 ? Math.max(...sensors.map(s => s.pm25 || 0)) : (airQuality?.pm2_5 || 0);

  const formatDir = (deg) => {
    if (deg >= 337.5 || deg < 22.5) return 'N';
    if (deg >= 22.5 && deg < 67.5) return 'NE';
    if (deg >= 67.5 && deg < 112.5) return 'E';
    if (deg >= 112.5 && deg < 157.5) return 'SE';
    if (deg >= 157.5 && deg < 202.5) return 'S';
    if (deg >= 202.5 && deg < 247.5) return 'SW';
    if (deg >= 247.5 && deg < 292.5) return 'W';
    if (deg >= 292.5 && deg < 337.5) return 'NW';
    return '';
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="absolute top-24 right-4 z-[1000] p-3 rounded-2xl shadow-xl backdrop-blur-md transition-all hover:scale-105 flex items-center justify-center"
        style={{
          background: dark ? 'rgba(15, 15, 20, 0.85)' : 'rgba(255, 255, 255, 0.95)',
          borderColor: dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          borderWidth: '1px'
        }}
      >
        <Activity className="w-5 h-5 text-emerald-500" />
        <ChevronLeft className="w-4 h-4 ml-1 opacity-70" />
      </button>
    );
  }

  return (
    <div 
      className="absolute top-24 right-4 z-[1000] w-64 rounded-[24px] border shadow-2xl p-4 flex flex-col gap-4 backdrop-blur-md transition-all"
      style={{
        background: dark ? 'rgba(15, 15, 20, 0.85)' : 'rgba(255, 255, 255, 0.95)',
        borderColor: dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
        color: dark ? '#cbd5e1' : '#334155'
      }}
    >
      {/* HEADER W/ COLLAPSE */}
      <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
        <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-500 flex items-center gap-1">
          <Activity className="w-3 h-3" />
          {activeNode}
        </h2>
        <button onClick={() => setIsOpen(false)} className="opacity-50 hover:opacity-100 transition-opacity">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* SYSTEM STATUS */}
      <div className="border-b pb-3" style={{ borderColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
        <div className="text-2xl font-bold text-emerald-500 mb-1 leading-none mt-1">Active</div>
        <div className="text-xs opacity-70 font-mono">System Online</div>
      </div>

      {/* AQI MONITOR */}
      <div className="border-b pb-3" style={{ borderColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
        <h3 className="text-xs font-bold uppercase tracking-wider mb-2">AQI Monitor</h3>
        <div className="text-xs mb-1 opacity-70">Sensor Data</div>
        <div className="text-sm font-medium mb-1"><span className="text-yellow-500">{sensors.length}</span> Active Sensors</div>
        <div className="text-sm font-medium">Max AQI: <span className="text-orange-500">{maxAQI.toFixed(1)} PM2.5</span></div>
      </div>

      {/* FIRE REPORTS */}
      <div className="border-b pb-3" style={{ borderColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
        <h3 className="text-xs font-bold uppercase tracking-wider mb-2">Fire Reports</h3>
        <div className="flex justify-between items-center mb-1 text-sm">
          <span>Active Fires:</span>
          <span className="font-bold">{activeFires}</span>
        </div>
        <div className="flex justify-between items-center mb-2 text-sm">
          <span>Total Hotspots:</span>
          <span className="font-bold text-orange-400">{events.length}</span>
        </div>
        {activeFires > 0 && <div className="text-xs font-bold text-red-500 uppercase tracking-wider">High Alert</div>}
      </div>

      {/* WEATHER */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider mb-2">Weather</h3>
        {weatherData ? (
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between">
              <span className="opacity-70">Temp:</span>
              <span className="font-medium">{weatherData.temp}°C</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-70">Humidity:</span>
              <span className="font-medium">{weatherData.humidity}%</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-70">Wind:</span>
              <span className="font-medium">{formatDir(weatherData.windDir)} {Math.round(weatherData.windSpeed)}km/h</span>
            </div>
          </div>
        ) : (
          <div className="text-xs opacity-50 animate-pulse">Loading Open-Meteo...</div>
        )}
      </div>

    </div>
  );
}
