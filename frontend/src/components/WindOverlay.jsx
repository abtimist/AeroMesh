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

    const particleCount = 1000;
    const baseSpeed = windSpeed * 0.05;
    const baseAngle = (windDirection - 90) * (Math.PI / 180);

    // Initialize particles with a trail history
    const createParticle = () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      history: [],
      life: 0,
      maxLife: Math.random() * 60 + 40,
      speedVariant: Math.random() * 0.5 + 0.8, // 0.8 to 1.3
      thickness: Math.random() * 1.2 + 0.3,
    });

    const particles = Array.from({ length: particleCount }, createParticle);

    const draw = () => {
      // Fully clear the canvas so map underneath isn't darkened
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // We use a glowing white/blue aesthetic similar to zoom.earth
      ctx.strokeStyle = 'rgba(180, 210, 255, 0.6)';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();

      particles.forEach(p => {
        // Add fake turbulence (curl) based on position so they swirl naturally
        const turbulence = Math.sin(p.x * 0.005) * Math.cos(p.y * 0.005) * 0.8;
        const currentAngle = baseAngle + turbulence;
        
        const vx = Math.cos(currentAngle) * baseSpeed * p.speedVariant;
        const vy = Math.sin(currentAngle) * baseSpeed * p.speedVariant;

        p.history.push({ x: p.x, y: p.y });
        if (p.history.length > 15) { // Trail length
          p.history.shift();
        }

        p.x += vx;
        p.y += vy;
        p.life += 1;

        // Draw trail for this particle
        if (p.history.length > 1) {
          // Opacity fades in and out based on life cycle
          const fade = Math.sin((p.life / p.maxLife) * Math.PI);
          ctx.globalAlpha = fade * 0.8;
          ctx.lineWidth = p.thickness;
          
          ctx.moveTo(p.history[0].x, p.history[0].y);
          for (let i = 1; i < p.history.length; i++) {
            ctx.lineTo(p.history[i].x, p.history[i].y);
          }
        }

        // Reset particle if it goes out of bounds or dies
        if (p.x > canvas.width || p.x < 0 || p.y > canvas.height || p.y < 0 || p.life >= p.maxLife) {
          Object.assign(p, createParticle());
        }
      });

      ctx.stroke();
      ctx.globalAlpha = 1.0; // Reset for next frame

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
        mixBlendMode: 'screen' // Makes the glowing trails pop over dark maps
      }}
    />
  );
};

export default WindOverlay;
