// StatusBadge — AQI severity pill
// Always shows text label (never color-only — accessibility)
// Props: level = 'GOOD' | 'MODERATE' | 'USG' | 'UNHEALTHY' | 'VERY_UNHEALTHY' | 'HAZARDOUS'

const LABEL_MAP = {
  GOOD:           'Good',
  MODERATE:       'Moderate',
  USG:            'Unhealthy (Sensitive)',
  UNHEALTHY:      'Unhealthy',
  VERY_UNHEALTHY: 'Very Unhealthy',
  HAZARDOUS:      'Hazardous',
  // Crisis severity aliases
  LOW:            'Low',
  MEDIUM:         'Moderate',
  HIGH:           'Unhealthy',
  CRITICAL:       'Hazardous',
};

// Map crisis severity to AQI level for color
const SEVERITY_TO_AQI = {
  LOW:      'GOOD',
  MEDIUM:   'MODERATE',
  HIGH:     'UNHEALTHY',
  CRITICAL: 'HAZARDOUS',
};

export default function StatusBadge({ level, compact = false }) {
  const aqiLevel = SEVERITY_TO_AQI[level] || level;
  const label = LABEL_MAP[level] || level;

  return (
    <span
      data-aqi={aqiLevel}
      className={`inline-flex items-center rounded-full font-semibold leading-none
        ${compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'}`}
    >
      {compact ? level : label}
    </span>
  );
}
