import StatCard from './StatCard';
import { AlertTriangle, Wind, MonitorDot, Factory } from 'lucide-react';

export default function KPIStrip({ stats }) {
  const {
    activeEvents = 0,
    pm25Peak = 0,
    pm25Location = '—',
    stationsOnline = 0,
  } = stats || {};

  // Derive status badges from real data
  const eventTrend = activeEvents > 0 ? `${activeEvents} active` : 'None';
  const sensorStatus = stationsOnline > 0 ? `${stationsOnline} online` : 'No data';

  return (
    <div className="absolute top-4 left-4 z-[500] flex flex-col sm:flex-row gap-3 pointer-events-auto">
      <StatCard
        icon={AlertTriangle}
        label="Active Events"
        value={activeEvents}
        trend={eventTrend}
        trendUp={activeEvents > 0}
        iconColor="text-red-400"
      />
      <StatCard
        icon={Factory}
        label={`PM2.5 Peak (${pm25Location})`}
        value={`${pm25Peak} µg/m³`}
        trend={pm25Peak > 150 ? 'UNHEALTHY' : pm25Peak > 50 ? 'MODERATE' : 'GOOD'}
        trendUp={pm25Peak > 150}
        iconColor="text-orange-400"
      />
      <StatCard
        icon={Wind}
        label="Forecast Range"
        value="T+0 → T+24h"
        iconColor="text-blue-400"
      />
      <StatCard
        icon={MonitorDot}
        label="Sensors Online"
        value={stationsOnline}
        trend={sensorStatus}
        trendUp={false}
        iconColor="text-green-500"
      />
    </div>
  );
}
