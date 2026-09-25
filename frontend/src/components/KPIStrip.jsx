// KPIStrip — 4 floating stat cards anchored to bottom-center of the map
// Uses absolute positioning to float INSIDE the map (doesn't push map up)

import StatCard from './StatCard';
import { AlertTriangle, Wind, Wifi, Activity } from 'lucide-react';

export default function KPIStrip({ stats }) {
  const {
    activeEvents = 7,
    pm25Peak = 342,
    wind = '18 km/h SE',
    stationsOnline = 124,
  } = stats || {};

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[500] flex gap-3 pointer-events-auto">
      <StatCard
        icon={AlertTriangle}
        label="Active Events"
        value={activeEvents}
        trend="3 this hour"
        trendUp
        iconColor="text-red-400"
      />
      <StatCard
        icon={Activity}
        label="PM2.5 Peak"
        value={`${pm25Peak} µg/m³`}
        trend="↑ from 298"
        trendUp
        iconColor="text-orange-400"
      />
      <StatCard
        icon={Wind}
        label="Wind"
        value={wind}
        iconColor="text-blue-400"
      />
      <StatCard
        icon={Wifi}
        label="Stations Online"
        value={stationsOnline}
        trend="2 offline"
        trendUp={false}
        iconColor="text-green-500"
      />
    </div>
  );
}
