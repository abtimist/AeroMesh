import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';

/**
 * WindOverlay — renders animated wind particles on a Leaflet map canvas.
 * Only draws within the visible map bounds. Transparent background (no dark fill).
 */
const WindOverlay = ({ isVisible, windSpeed = 15, windDirection = 145 }) => {
  const canvasRef = useRef(null);
  const map = useMap();

  useEffect(() => {
    if (!isVisible || !canvasRef.current || !map) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resize = () => {
      const container = map.getContainer();
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    resize();
    map.on('resize', resize);
    
    const particleCount = 200; 
    const baseAngle = (windDirection - 90) * (Math.PI / 180);

    const createParticle = () => {
      const bounds = map.getBounds();
      return {
        lat: bounds.getSouth() + Math.random() * (bounds.getNorth() - bounds.getSouth()),
        lng: bounds.getWest() + Math.random() * (bounds.getEast() - bounds.getWest()),
        history: [],
        life: 0,
        maxLife: Math.random() * 100 + 80, // live longer
        speedVariant: Math.random() * 0.8 + 0.6,
        thickness: Math.random() * 2.0 + 1.0,
      };
    };

    const particles = Array.from({ length: particleCount }, createParticle);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Dynamically calculate speed based on zoom so it always looks consistent
      const currentZoom = map.getZoom();
      const zoomScale = Math.pow(2, 10 - currentZoom);
      const dynamicBaseSpeed = windSpeed * 0.0003 * zoomScale; 

      particles.forEach(p => {
        // Project current pos for turbulence math
        const startPoint = map.latLngToContainerPoint([p.lat, p.lng]);
        const turbulence = Math.sin(startPoint.x * 0.005) * Math.cos(startPoint.y * 0.005) * 0.8;
        const currentAngle = baseAngle + turbulence;
        
        // Push current geographic position to history
        p.history.push({ lat: p.lat, lng: p.lng });
        if (p.history.length > 40) {
          p.history.shift();
        }

        // Update Geographic position
        p.lat += Math.sin(currentAngle) * dynamicBaseSpeed * p.speedVariant * -1; 
        p.lng += Math.cos(currentAngle) * dynamicBaseSpeed * p.speedVariant;

        p.life += 1;

        if (p.history.length > 1) {
          ctx.beginPath();
          const fade = Math.sin((p.life / p.maxLife) * Math.PI);
          ctx.lineWidth = p.thickness;
          ctx.strokeStyle = `rgba(186, 230, 253, ${fade * 0.9})`;
          
          const firstPt = map.latLngToContainerPoint([p.history[0].lat, p.history[0].lng]);
          ctx.moveTo(firstPt.x, firstPt.y);
          
          for (let i = 1; i < p.history.length; i++) {
            const pt = map.latLngToContainerPoint([p.history[i].lat, p.history[i].lng]);
            ctx.lineTo(pt.x, pt.y);
          }
          ctx.stroke();
        }

        // Reset if dies or leaves visible screen bounds
        const currentPt = map.latLngToContainerPoint([p.lat, p.lng]);
        if (currentPt.x > canvas.width + 50 || currentPt.x < -50 || currentPt.y > canvas.height + 50 || currentPt.y < -50 || p.life >= p.maxLife) {
          Object.assign(p, createParticle());
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      map.off('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isVisible, windSpeed, windDirection, map]);

  if (!isVisible) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 400
        // Removed mixBlendMode to prevent lag and extreme brightness
      }}
    />
  );
};

export default WindOverlay;
