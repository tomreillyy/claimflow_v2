'use client';
import React, { useState, useEffect } from 'react';

export function Hero() {
  const verbs = ['build', 'tinker', 'innovate', 'experiment', 'launch', 'scale', 'invent', 'discover', 'ship', 'transform'];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % verbs.length);
        setIsAnimating(false);
      }, 300);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

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
          Aird substantiates your R&D claim as you{' '}
          <span style={{
            display: 'inline-block',
            position: 'relative',
            minWidth: '200px',
            textAlign: 'left',
            overflow: 'hidden'
          }}>
            <span style={{
              display: 'inline-block',
              transform: isAnimating ? 'translateX(-20px)' : 'translateX(0)',
              opacity: isAnimating ? 0 : 1,
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              color: 'var(--brand)',
              fontStyle: 'italic'
            }}>
              {verbs[currentIndex]}
            </span>
          </span>
        </h1>

        <p style={{
          color: 'var(--muted)',
          fontSize: 17,
          maxWidth: 680,
          marginBottom: 26,
          lineHeight: 1.6
        }}>
          Aird turns your everyday chaos into claimable R&D proof — automatically capturing everything from code commits and scattered notes to team conversations, and turning it into compliant, claim-ready evidence. Purpose-built for Australia's R&D Tax Incentive.
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
