import React, { useEffect, useRef } from 'react';

const WindOverlay = ({ isVisible, windSpeed = 15, windDirection = 145 }) => {
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

    // Premium Particle logic (softer, shorter, fading tails like windy.com)
    const particles = [];
    const particleCount = 200; // More particles but softer
    const angleRad = (windDirection - 90) * (Math.PI / 180); 
    const speed = windSpeed * 0.05; // slower, smoother

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        len: Math.random() * 5 + 3, // Shorter lines
        opacity: Math.random() * 0.3 + 0.05,
        life: Math.random() * 100, // Lifecycle for fading
        maxLife: Math.random() * 100 + 50
      });
    }

    const draw = () => {
      // Use semi-transparent fill for trail effect
      ctx.fillStyle = 'rgba(13, 17, 23, 0.15)'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 1.0;

      particles.forEach(p => {
        // Fade in/out based on life
        const fade = Math.sin((p.life / p.maxLife) * Math.PI);
        const currentOpacity = p.opacity * fade;
        
        ctx.beginPath();
        ctx.strokeStyle = `rgba(165, 243, 252, ${currentOpacity})`; // Cyan-200
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + Math.cos(angleRad) * p.len, p.y + Math.sin(angleRad) * p.len);
        ctx.stroke();

        // Move
        p.x += Math.cos(angleRad) * speed;
        p.y += Math.sin(angleRad) * speed;
        p.life += 1;

        // Reset if offscreen or dead
        if (p.x > canvas.width || p.x < 0 || p.y > canvas.height || p.y < 0 || p.life >= p.maxLife) {
          p.x = Math.random() * canvas.width;
          p.y = Math.random() * canvas.height;
          p.life = 0;
          p.maxLife = Math.random() * 100 + 50;
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
      className="absolute inset-0 pointer-events-none z-[400] opacity-80 mix-blend-screen"
    />
  );
};

export default WindOverlay;
