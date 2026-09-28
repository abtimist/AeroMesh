import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-velocity/dist/leaflet-velocity.js';
import 'leaflet-velocity/dist/leaflet-velocity.css';

// The vendor canvas can clear its frame handle before a queued draw executes.
// Guard the callback itself, including callbacks already bound by requestAnimFrame.
const SafeCanvasLayer = L.CanvasLayer.extend({
  drawLayer() {
    if (this._map && this._canvas) return L.CanvasLayer.prototype.drawLayer.call(this);
  },
  _onLayerDidMove() {
    if (this._map && this._canvas) return L.CanvasLayer.prototype._onLayerDidMove.call(this);
  },
});
L.canvasLayer = options => new SafeCanvasLayer(options);

export default function WindVelocityLayer({ data }) {
  const map = useMap();
  useEffect(() => {
    if (!data) return;
    const layer = L.velocityLayer({
      displayValues: false, data, maxVelocity: 25,
      colorScale: ['rgba(210,235,255,0.7)', '#ffffff'],
      lineWidth: 1.5, velocityScale: 0.005, particleAge: 70, particleMultiplier: 1 / 1200,
    });
    // leaflet-velocity schedules canvas work without cancelling it on removal.
    // Defer attachment past StrictMode's probe and clean up its pending work.
    const mount = setTimeout(() => layer.addTo(map), 0);
    return () => {
      clearTimeout(mount);
      if (!map.hasLayer(layer)) return;
      const canvas = layer._canvasLayer;
      if (canvas) {
        L.Util.cancelAnimFrame(canvas._frame);
        // The plugin's zero-delay callback looks this method up at invocation.
        canvas._onLayerDidMove = () => {};
      }
      if (layer._windy) {
        map.off('dragstart zoomstart', layer._windy.stop);
      }
      map.off('dragend zoomend', layer._clearAndRestart);
      map.off('resize', layer._clearWind);
      layer.remove();
    };
  }, [map, data]);

  // Use a second effect to immediately remove the stop listeners so it keeps animating during pan
  useEffect(() => {
    if (!data) return;
    const timer = setTimeout(() => {
      let l;
      map.eachLayer(L => { if (L._windy) l = L; });
      if (l && l._windy) {
        map.off('dragstart zoomstart', l._windy.stop);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [map, data]);

  return null;
}
