// AQIGauge — SVG circular arc gauge for Mobile Citizen Portal
// 270° sweep arc, colored by AQI level
// Center: large AQI number + level label

const AQI_CONFIG = {
  GOOD:           { color: '#00e400', label: 'Good' },
  MODERATE:       { color: '#ffff00', label: 'Moderate' },
  USG:            { color: '#ff7e00', label: 'Unhealthy (Sensitive)' },
  UNHEALTHY:      { color: '#ff0000', label: 'Unhealthy' },
  VERY_UNHEALTHY: { color: '#8f3f97', label: 'Very Unhealthy' },
  HAZARDOUS:      { color: '#7e0023', label: 'Hazardous' },
};

function getAQILevel(value) {
  if (value <= 50)  return 'GOOD';
  if (value <= 100) return 'MODERATE';
  if (value <= 150) return 'USG';
  if (value <= 200) return 'UNHEALTHY';
  if (value <= 300) return 'VERY_UNHEALTHY';
  return 'HAZARDOUS';
}

export default function AQIGauge({ pm25Value = 198 }) {
  const level = getAQILevel(pm25Value);
  const { color, label } = AQI_CONFIG[level];

  // SVG arc geometry
  const cx = 120, cy = 120, r = 90;
  const startAngle = 135; // degrees
  const totalSweep = 270;

  // Clamp value to 0-500 for arc fill
  const pct = Math.min(pm25Value / 500, 1);
  const filledSweep = totalSweep * pct;

  function polarToXY(angleDeg, radius) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  }

  function arcPath(startDeg, sweepDeg, radius) {
    const start = polarToXY(startDeg, radius);
    const end   = polarToXY(startDeg + sweepDeg, radius);
    const large = sweepDeg > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${large} 1 ${end.x} ${end.y}`;
  }

  const bgPath   = arcPath(startAngle, totalSweep, r);
  const fillPath = filledSweep > 0 ? arcPath(startAngle, filledSweep, r) : null;

  // Min/max labels
  const minPt = polarToXY(startAngle, r + 16);
  const maxPt = polarToXY(startAngle + totalSweep, r + 16);

  return (
    <div className="flex flex-col items-center">
      <svg width={240} height={210} viewBox="0 0 240 210">
        {/* Background arc */}
        <path d={bgPath} fill="none" stroke="#e2e8f0" strokeWidth={16} strokeLinecap="round" />

        {/* Colored fill arc */}
        {fillPath && (
          <path d={fillPath} fill="none" stroke={color} strokeWidth={16} strokeLinecap="round" />
        )}

        {/* Min label */}
        <text x={minPt.x} y={minPt.y} textAnchor="middle" className="text-[10px]" style={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'Inter, sans-serif' }}>0</text>

        {/* Max label */}
        <text x={maxPt.x} y={maxPt.y} textAnchor="middle" style={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'Inter, sans-serif' }}>500</text>

        {/* Center: level label + value */}
        <text x={cx} y={cy - 10} textAnchor="middle" style={{ fontSize: 13, fontWeight: 500, fill: '#64748b', fontFamily: 'Inter, sans-serif' }}>
          {label.toUpperCase()}
        </text>
        <text x={cx} y={cy + 30} textAnchor="middle" style={{ fontSize: 40, fontWeight: 700, fill: '#0f172a', fontFamily: 'Inter, sans-serif' }}>
          {pm25Value}
        </text>
        <text x={cx} y={cy + 50} textAnchor="middle" style={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'Inter, sans-serif' }}>µg/m³</text>
      </svg>
    </div>
  );
}
