'use client';
import { useEffect, useRef, useState } from 'react';

export function EvidenceSprintRail({ events = [] }) {
  const railRef = useRef(null);
  const frame = useRef(0);
  const pos = useRef(0);
  const vel = useRef(0);
  const isDown = useRef(false);
  const startX = useRef(0);
  const startPos = useRef(0);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;

    const onDown = (e) => {
      isDown.current = true;
      startX.current = (e.touches ? e.touches[0].clientX : e.clientX);
      startPos.current = el.scrollLeft;
    };
    const onMove = (e) => {
      if (!isDown.current) return;
      const x = (e.touches ? e.touches[0].clientX : e.clientX);
      const dx = startX.current - x;
      el.scrollLeft = startPos.current + dx;
      vel.current = dx;
    };
    const onUp = () => {
      isDown.current = false;
      // inertia
      cancelAnimationFrame(frame.current);
      const decay = () => {
        if (Math.abs(vel.current) < 0.1) { vel.current = 0; snapToCard(); return; }
        el.scrollLeft += vel.current;
        vel.current *= 0.92;
        frame.current = requestAnimationFrame(decay);
      };
      frame.current = requestAnimationFrame(decay);
    };
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        const card = el.querySelector('[data-card]');
        if (!card) return;
        const w = card.clientWidth + 16; // gap
        el.scrollLeft += dir * w;
        setTimeout(snapToCard, 120);
      }
    };

    const snapToCard = () => {
      const card = el.querySelector('[data-card]');
      if (!card) return;
      const w = card.clientWidth + 16; // gap
      const idx = Math.round(el.scrollLeft / w);
      const target = idx * w;
      const start = el.scrollLeft;
      const delta = target - start;
      const duration = 220;
      let t0 = performance.now();
      const ease = (t) => t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t;
      const step = (now) => {
        const p = Math.min(1, (now - t0) / duration);
        el.scrollLeft = start + delta * ease(p);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    el.addEventListener('mousedown', onDown);
    el.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    el.addEventListener('touchstart', onDown, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp);
    window.addEventListener('keydown', onKey);

    return () => {
      el.removeEventListener('mousedown', onDown);
      el.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      el.removeEventListener('touchstart', onDown);
      el.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('keydown', onKey);
      cancelAnimationFrame(frame.current);
    };
  }, []);

  const sample = events.length ? events : [
    { date: 'Oct 5, 14:22', title: 'Experiment: quantization sweep', type: 'Experiment' },
    { date: 'Oct 5, 09:10', title: 'Note: HNSW recall at M=32', type: 'Note' },
    { date: 'Oct 4, 18:47', title: 'Email: customer repro steps', type: 'Email' },
    { date: 'Oct 3, 11:03', title: 'Upload: payroll_jan2025_part2.csv', type: 'Upload' },
    { date: 'Oct 2, 16:35', title: 'Observation: SIMD hotspot', type: 'Observation' },
    { date: 'Oct 1, 10:02', title: 'Evaluation: IVF vs HNSW', type: 'Evaluation' },
  ];

  return (
    <div style={{
      marginTop: 12
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12
      }}>
        <div style={{ fontSize: 14, color: '#0f172a' }}>Evidence sprint</div>
        <div style={{ fontSize: 12, color: '#475569' }}>Drag • Arrow keys • Snap</div>
      </div>
      <div
        ref={railRef}
        style={{
          display: 'grid',
          gridAutoFlow: 'column',
          gridAutoColumns: 'minmax(280px, 320px)',
          gap: 16,
          overflowX: 'auto',
          paddingBottom: 6,
          scrollbarWidth: 'none'
        }}
      >
        {sample.map((ev, i) => (
          <div
            data-card
            key={i}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 0,
              padding: 16,
              background: '#fff',
              boxShadow: '0 0 0 rgba(0,0,0,0)',
              transition: 'box-shadow 120ms ease, transform 120ms ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(2,6,23,0.06)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 0 0 rgba(0,0,0,0)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: 8
            }}>
              <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, color: '#475569' }}>{ev.date}</div>
              <div style={{ fontSize: 11, color: '#0284c7', border: '1px solid rgba(2,132,199,0.3)', padding: '1px 6px' }}>{ev.type}</div>
            </div>
            <div style={{ fontSize: 15, color: '#0f172a' }}>{ev.title}</div>
            <div style={{ marginTop: 12, height: 1, background: '#e5e7eb' }} />
            <div style={{ marginTop: 10, fontSize: 12, color: '#64748b' }}>Auto‑linked from email, notes, and uploads</div>
          </div>
        ))}
      </div>
    </div>
  );
}
