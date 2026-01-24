'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Hero() {
  const verbs = ['build', 'innovate', 'experiment', 'research', 'ship'];
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
      background: '#ffffff',
      padding: 'clamp(100px, 20vw, 160px) 16px clamp(48px, 10vw, 80px)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Subtle grid pattern overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        pointerEvents: 'none'
      }} />

      <div style={{
        maxWidth: 800,
        margin: '0 auto',
        position: 'relative',
        zIndex: 1,
        textAlign: 'center'
      }}>
        {/* Centered Text Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 56px)',
            margin: '0 0 24px',
            lineHeight: 1.1,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: '#0f172a'
          }}>
            ClaimFlow substantiates your R&D claim as you{' '}
            <span style={{
              display: 'inline-block',
              width: '4.5em',
              textAlign: 'left'
            }}>
              <span style={{
                display: 'inline',
                color: '#60a5fa',
                fontStyle: 'italic',
                opacity: isAnimating ? 0 : 1,
                transition: 'opacity 0.3s ease'
              }}>
                {verbs[currentIndex]}
              </span>
            </span>
          </h1>

          <p style={{
            color: '#64748b',
            fontSize: 'clamp(15px, 3.5vw, 18px)',
            maxWidth: 600,
            margin: '0 auto clamp(24px, 6vw, 40px)',
            lineHeight: 1.7,
            padding: '0 8px'
          }}>
            ClaimFlow captures and structures R&D evidence for engineering teams, because claims fail when documentation is missing or made too late.
          </p>

          {/* CTAs */}
          <div style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: 24,
            padding: '0 8px'
          }}>
            <a
              href="/auth/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: 'clamp(12px, 3vw, 14px) clamp(20px, 5vw, 28px)',
                borderRadius: 8,
                background: '#021048',
                color: '#fff',
                fontWeight: 600,
                textDecoration: 'none',
                fontSize: 'clamp(14px, 3vw, 15px)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(2,16,72,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Start free trial
            </a>

            <a
              href="/demo"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: 'clamp(12px, 3vw, 14px) clamp(20px, 5vw, 28px)',
                borderRadius: 8,
                background: 'transparent',
                color: '#0f172a',
                fontWeight: 600,
                textDecoration: 'none',
                border: '1px solid #e2e8f0',
                fontSize: 'clamp(14px, 3vw, 15px)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.borderColor = '#cbd5e1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              Try demo
            </a>
          </div>

          {/* GitHub Integration Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 20px',
            background: '#f8fafc',
            borderRadius: 100,
            border: '1px solid #e2e8f0'
          }}>
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="#0f172a"
              style={{ flexShrink: 0 }}
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <span style={{
              fontSize: 14,
              color: '#64748b'
            }}>
              Integrates with GitHub
            </span>
          </div>
        </motion.div>

        {/* Product Screenshot - Below Text */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            marginTop: 'clamp(32px, 8vw, 60px)',
            maxWidth: 900,
            marginLeft: 'auto',
            marginRight: 'auto',
            padding: '0 8px'
          }}
        >
          <div style={{
            background: 'linear-gradient(145deg, #f8fafc, #f1f5f9)',
            borderRadius: 16,
            padding: 8,
            border: '1px solid #e2e8f0',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
          }}>
            <div style={{
              background: '#0f172a',
              borderRadius: 10,
              overflow: 'hidden'
            }}>
              {/* Browser chrome */}
              <div style={{
                background: '#1e293b',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                borderBottom: '1px solid rgba(255,255,255,0.1)'
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#eab308' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                <span style={{
                  marginLeft: 12,
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.5)',
                  fontFamily: 'monospace'
                }}>
                  app.aird.com.au
                </span>
              </div>
              {/* Screenshot */}
              <img
                src="/product-events.png"
                alt="ClaimFlow Dashboard"
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block'
                }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
