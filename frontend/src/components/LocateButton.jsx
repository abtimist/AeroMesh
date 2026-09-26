import { useState } from 'react';
import { useMap } from 'react-leaflet';
import { Crosshair, Loader2 } from 'lucide-react';
import { useTheme } from '../hooks';

export default function LocateButton() {
  const map = useMap();
  const { dark } = useTheme();
  const [loading, setLoading] = useState(false);

  const handleLocate = () => {
    setLoading(true);
    map.locate({ setView: false, maxZoom: 14 })
      .on('locationfound', (e) => {
        setLoading(false);
        map.flyTo(e.latlng, map.getZoom(), { duration: 1.5 });
      })
      .on('locationerror', () => {
        setLoading(false);
        alert('Could not access your location. Please check browser permissions.');
      });
  };

  return (
    <div className="absolute bottom-6 left-6 z-[500] pointer-events-auto">
      <button
        onClick={handleLocate}
        disabled={loading}
        className="w-12 h-12 flex items-center justify-center rounded-full backdrop-blur-xl shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95"
        title="Locate Me"
        style={{
          background: dark ? 'rgba(15, 15, 20, 0.85)' : 'rgba(255, 255, 255, 0.95)',
          color: dark ? '#cbd5e1' : '#475569',
          border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`
        }}
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Crosshair className="w-5 h-5" />}
      </button>
    </div>
  );
}
