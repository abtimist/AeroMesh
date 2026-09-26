import { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-velocity/dist/leaflet-velocity.js';
import 'leaflet-velocity/dist/leaflet-velocity.css';

export default function WindVelocityLayer() {
  const map = useMap();
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/data/wind-global.json')
      .then(response => response.json())
      .then(json => setData(json))
      .catch(err => console.error("Failed to fetch wind data", err));
  }, []);

  useEffect(() => {
    if (!data) return;

    const velocityLayer = L.velocityLayer({
      displayValues: false,
      displayOptions: {
        velocityType: 'Global Wind',
        position: 'bottomleft',
        emptyString: 'No wind data'
      },
      data: data,
      maxVelocity: 15,
      colorScale: ["rgba(255,255,255,0.7)", "rgba(255,255,255,0.9)", "#ffffff"],
      lineWidth: 2,
      velocityScale: 0.005, // arbitrary default
      particleAge: 90,
      particleMultiplier: 1/800, // lower multiplier = fewer particles
    });

    velocityLayer.addTo(map);

    return () => {
      velocityLayer.remove();
    };
  }, [map, data]);

  return null;
}
