import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { createWindRenderer } from '../windRenderer';

export default function WindVelocityLayer({ data }) {
  const map = useMap();
  useEffect(() => {
    if (!data?.grids?.length) return;
    return createWindRenderer(map, data);
  }, [map, data]);
  return null;
}
