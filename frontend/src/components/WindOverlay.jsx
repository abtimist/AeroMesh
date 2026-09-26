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

    const particleCount = 120;
    const angleRad = (windDirection - 90) * (Math.PI / 180);
    const speed = windSpeed * 0.04;

    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      len: Math.random() * 8 + 4,
      opacity: Math.random() * 0.25 + 0.05,
      life: Math.random() * 80,
      maxLife: Math.random() * 80 + 40,
    }));

    const draw = () => {
      // Clear fully — no semi-transparent fill that darkens the map
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 1;

      particles.forEach(p => {
        const fade = Math.sin((p.life / p.maxLife) * Math.PI);
        ctx.beginPath();
        ctx.strokeStyle = `rgba(96, 165, 250, ${p.opacity * fade})`;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + Math.cos(angleRad) * p.len, p.y + Math.sin(angleRad) * p.len);
        ctx.stroke();

        p.x += Math.cos(angleRad) * speed;
        p.y += Math.sin(angleRad) * speed;
        p.life += 1;

        if (p.x > canvas.width || p.x < 0 || p.y > canvas.height || p.y < 0 || p.life >= p.maxLife) {
          p.x = Math.random() * canvas.width;
          p.y = Math.random() * canvas.height;
          p.life = 0;
          p.maxLife = Math.random() * 80 + 40;
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
        zIndex: 400,
      }}
    />
  );
};

export default WindOverlay;
