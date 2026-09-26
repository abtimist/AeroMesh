import React, { useEffect, useRef } from 'react';

const WindOverlay = ({ isVisible, windSpeed = 18, windDirection = 145 }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!isVisible || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    
    // Resize to fit container
    const resize = () => {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Particle logic
    const particles = [];
    const particleCount = 150;
    const angleRad = (windDirection - 90) * (Math.PI / 180); // Convert compass dir to math rad
    const speed = windSpeed * 0.1; // Scale down for animation

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        len: Math.random() * 15 + 10,
        opacity: Math.random() * 0.5 + 0.1
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 1.5;

      particles.forEach(p => {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(165, 243, 252, ${p.opacity})`; // Cyan-200
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + Math.cos(angleRad) * p.len, p.y + Math.sin(angleRad) * p.len);
        ctx.stroke();

        // Move
        p.x += Math.cos(angleRad) * speed;
        p.y += Math.sin(angleRad) * speed;

        // Reset if offscreen
        if (p.x > canvas.width || p.x < 0 || p.y > canvas.height || p.y < 0) {
          p.x = Math.random() * canvas.width;
          p.y = Math.random() * canvas.height;
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isVisible, windSpeed, windDirection]);

  if (!isVisible) return null;

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 pointer-events-none z-[400] opacity-60 mix-blend-screen"
    />
  );
};

export default WindOverlay;
