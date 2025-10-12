'use client';
import { useEffect, useRef } from 'react';

export function HeroVectorField({ density = 22, color = '#e5e7eb' }) {
  const canvasRef = useRef(null);
  const raf = useRef(0);
  const pointer = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const { clientWidth, clientHeight } = canvas.parentElement || canvas;
      canvas.width = clientWidth * dpr;
      canvas.height = clientHeight * dpr;
      canvas.style.width = clientWidth + 'px';
      canvas.style.height = clientHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement || canvas);

    const onPointer = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      pointer.current.x = Math.max(0, Math.min(1, x));
      pointer.current.y = Math.max(0, Math.min(1, y));
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    let t0 = performance.now();
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const noise = (x, y, t) => {
      return Math.sin(x * 1.3 + t * 0.0017) * 0.5 + Math.cos(y * 1.7 + t * 0.0013) * 0.5;
    };

    const draw = (now) => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const cols = Math.max(12, Math.floor((canvas.clientWidth || width) / density));
      const rows = Math.max(6, Math.floor((canvas.clientHeight || height) / density));
      const gapX = (canvas.clientWidth || width) / cols;
      const gapY = (canvas.clientHeight || height) / rows;

      const p = pointer.current;

      for (let iy = 0; iy <= rows; iy++) {
        for (let ix = 0; ix <= cols; ix++) {
          const x = ix * gapX + gapX * 0.5;
          const y = iy * gapY + gapY * 0.5;
          const nx = ix / cols;
          const ny = iy / rows;

          // base angle from slow noise
          const n = noise(ix * 0.7, iy * 0.6, now) * 0.6;
          // subtle drift in one direction + pointer parallax
          const angle = n + (nx - 0.5) * 0.1 + (ny - 0.5) * 0.1 + (p.x - 0.5) * 0.12 + (p.y - 0.5) * 0.06;

          const len = 12; // segment length in px
          const dx = Math.cos(angle) * len * 0.5;
          const dy = Math.sin(angle) * len * 0.5;

          ctx.beginPath();
          ctx.moveTo(x - dx, y - dy);
          ctx.lineTo(x + dx, y + dy);
          ctx.lineWidth = 1;
          ctx.strokeStyle = color;
          ctx.stroke();
        }
      }

      if (!prefersReduced) raf.current = requestAnimationFrame(draw);
    };

    if (!prefersReduced) raf.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf.current);
      ro.disconnect();
      window.removeEventListener('pointermove', onPointer);
    };
  }, [density, color]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none'
      }}
    />
  );
}
