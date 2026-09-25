import StatCard from './StatCard';
import { AlertTriangle, Wind, MonitorDot, Factory } from 'lucide-react';

export default function KPIStrip({ stats }) {
  const {
    activeEvents = 4,
    pm25Peak = 452,
    wind = '12 km/h NW',
    stationsOnline = 142,
  } = stats || {};

  return (
    <div className="absolute top-4 left-4 z-[500] flex flex-col sm:flex-row gap-3 pointer-events-auto">
      <StatCard
        icon={AlertTriangle}
        label="Active Events"
        value={activeEvents}
        trend="2 this hour"
        trendUp
        iconColor="text-red-400"
      />
      <StatCard
        icon={Factory}
        label="PM2.5 Peak (Okhla)"
        value={`${pm25Peak} µg/m³`}
        trend="↑ from 380"
        trendUp
        iconColor="text-orange-400"
      />
      <StatCard
        icon={Wind}
        label="Prevailing Wind"
        value={wind}
        iconColor="text-blue-400"
      />
      <StatCard
        icon={MonitorDot}
        label="Sensors Online"
        value={stationsOnline}
        trend="3 offline"
        trendUp={false}
        iconColor="text-green-500"
      />
    </div>
  );
}
