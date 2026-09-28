export default function AQLegend({ isVisible }) {
  if (!isVisible) return null;
  
  const levels = [
    { label: 'Good', color: '#22c55e', range: '0-50' },
    { label: 'Moderate', color: '#eab308', range: '51-100' },
    { label: 'Unhealthy (Sens.)', color: '#f97316', range: '101-150' },
    { label: 'Unhealthy', color: '#ef4444', range: '151-200' },
    { label: 'Very Unhealthy', color: '#a855f7', range: '201+' }
  ];

  return (
    <div className="absolute bottom-6 right-6 z-[1000] p-4 rounded-2xl backdrop-blur-md shadow-2xl border transition-all"
         style={{ background: 'rgba(15, 15, 20, 0.85)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
      <h4 className="text-xs font-semibold mb-3 text-white">US AQI Forecast</h4>
      <div className="flex flex-col gap-2 text-xs">
        {levels.map(level => (
          <div key={level.label} className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full" style={{ background: level.color }} />
            <span className="text-gray-300 w-28">{level.label}</span>
            <span className="text-gray-400 font-mono text-right flex-1">{level.range}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
