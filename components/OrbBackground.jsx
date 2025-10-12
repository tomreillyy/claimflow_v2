'use client';
import { useEffect, useRef } from 'react';

export function OrbBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let time = 0;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Orb configuration - increased opacity for visibility
    const orbs = [
      { x: 0.2, y: 0.3, radius: 300, color: 'rgba(0, 122, 204, 0.3)', speedX: 0.0003, speedY: 0.0002 },
      { x: 0.8, y: 0.6, radius: 280, color: 'rgba(0, 212, 255, 0.25)', speedX: -0.0002, speedY: 0.0003 },
      { x: 0.5, y: 0.5, radius: 260, color: 'rgba(102, 126, 234, 0.2)', speedX: 0.0002, speedY: -0.0002 }
    ];

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      time += 1;

      orbs.forEach((orb, index) => {
        // Calculate animated position
        const x = (orb.x + Math.sin(time * orb.speedX + index) * 0.1) * canvas.width;
        const y = (orb.y + Math.cos(time * orb.speedY + index) * 0.1) * canvas.height;

        // Create radial gradient
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, orb.radius);
        gradient.addColorStop(0, orb.color);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        // Draw orb
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
        filter: 'blur(80px)'
      }}
    />
  );
}
