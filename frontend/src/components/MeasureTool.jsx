import { useState, useEffect } from 'react';
import { useMap, useMapEvents, Polyline, CircleMarker, Tooltip } from 'react-leaflet';

export default function MeasureTool({ isActive }) {
  const map = useMap();
  const [points, setPoints] = useState([]);

  // Clear points when tool is deactivated
  useEffect(() => {
    if (!isActive) {
      setPoints([]);
      map.getContainer().style.cursor = '';
    } else {
      map.getContainer().style.cursor = 'crosshair';
    }
  }, [isActive, map]);

  useMapEvents({
    click(e) {
      if (!isActive) return;
      setPoints(prev => [...prev, e.latlng]);
    }
  });

  // Calculate distances
  const getDistanceText = (latlng1, latlng2) => {
    const distanceMeters = latlng1.distanceTo(latlng2);
    if (distanceMeters > 10000) {
      return `${(distanceMeters / 1000).toFixed(1)} km`;
    }
    return `${distanceMeters.toFixed(0)} m`;
  };

  if (!isActive && points.length === 0) return null;

  return (
    <>
      {points.length > 1 && (
        <Polyline positions={points} pathOptions={{ color: '#3b82f6', weight: 3, dashArray: '8 8' }} />
      )}
      
      {points.map((p, index) => {
        const dist = index > 0 ? getDistanceText(points[index - 1], p) : 'Start';
        
        return (
          <CircleMarker
            key={`measure-${index}`}
            center={p}
            radius={5}
            pathOptions={{ fillColor: '#ffffff', fillOpacity: 1, color: '#3b82f6', weight: 2 }}
          >
            <Tooltip permanent direction="right" offset={[5, 0]} className="measure-tooltip font-bold text-blue-900 bg-white/90 border-blue-200">
              {dist}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}
