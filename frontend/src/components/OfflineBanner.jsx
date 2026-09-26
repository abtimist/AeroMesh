import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="absolute top-0 left-0 right-0 z-[2000] flex justify-center mt-2 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-2 bg-yellow-500/90 backdrop-blur-md text-yellow-950 px-4 py-2 rounded-full shadow-lg border border-yellow-400/50">
        <WifiOff className="w-4 h-4 animate-pulse" />
        <span className="text-xs font-bold uppercase tracking-wider">Offline Mode</span>
        <span className="text-xs font-medium opacity-80 hidden sm:inline ml-2 border-l border-yellow-900/20 pl-2">
          Displaying cached map data
        </span>
      </div>
    </div>
  );
}
