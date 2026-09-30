import { TileLayer } from 'react-leaflet';

export default function AQHeatmapLayer() {
  return (
    <TileLayer
      url="/api/waqi-tiles/{z}/{x}/{y}.png"
      attribution="&copy; <a href='https://waqi.info/'>World Air Quality Index</a>"
      opacity={0.65}
      zIndex={400}
    />
  );
}
