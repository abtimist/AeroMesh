import { TileLayer } from 'react-leaflet';

export default function AQHeatmapLayer() {
  // We use the real World Air Quality Index (WAQI) API for a gorgeous, live AQI tile layer.
  return (
    <TileLayer
      url="https://tiles.waqi.info/tiles/usepa-aqi/{z}/{x}/{y}.png?token=_"
      attribution="&copy; <a href='https://waqi.info/'>World Air Quality Index</a>"
      opacity={0.7}
      zIndex={400}
    />
  );
}
