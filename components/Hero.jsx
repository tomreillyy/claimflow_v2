'use client';
import React from 'react';

export function Hero() {
  return (
    <section style={{
      padding: '96px 24px 60px',
      textAlign: 'left'
    }}>
      <div style={{
        maxWidth: 960,
        margin: '0 auto'
      }}>
        <h1 style={{
          fontSize: 'clamp(28px, 4.8vw, 46px)',
          margin: '0 0 12px',
          lineHeight: 1.1,
          fontWeight: 800,
          letterSpacing: '-0.02em'
        }}>
          Your R&D proof, captured in <span className="highlight">real‑time</span>.
        </h1>

        <p style={{
          color: 'var(--muted)',
          fontSize: 17,
          maxWidth: 600,
          marginBottom: 26,
          lineHeight: 1.6
        }}>
          Aird helps founders and teams collect, organize, and export R&D documentation as they work — no end‑of‑year scramble, no busywork.
        </p>

        <div style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap'
        }}>
          <a
            href="/admin/new-project"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '10px 18px',
              borderRadius: 'var(--radius)',
              background: 'var(--brand)',
              color: '#fff',
              fontWeight: 600,
              textDecoration: 'none',
              border: '1px solid var(--brand)',
              fontSize: 15,
              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(2,16,72,0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Sign up free
          </a>

          <a
            href="#how"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '10px 18px',
              borderRadius: 'var(--radius)',
              background: 'transparent',
              color: 'var(--brand)',
              fontWeight: 600,
              textDecoration: 'none',
              border: '1px solid var(--brand)',
              fontSize: 15,
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(2,16,72,0.04)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Learn how
          </a>
        </div>
      </div>
    </section>
  );
}
