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
      background: 'linear-gradient(180deg, #021048 0%, #0a1a5c 60%, #1a2a6c 100%)',
      padding: '140px 24px 80px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Subtle grid pattern overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
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
            color: '#fff'
          }}>
            Aird substantiates your R&D claim as you{' '}
            <span style={{
              display: 'inline',
              color: '#60a5fa',
              fontStyle: 'italic',
              opacity: isAnimating ? 0 : 1,
              transition: 'opacity 0.3s ease'
            }}>
              {verbs[currentIndex]}
            </span>
          </h1>

          <p style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: 18,
            maxWidth: 600,
            margin: '0 auto 40px',
            lineHeight: 1.7
          }}>
            AIRD captures and structures R&D evidence for engineering teams, because claims fail when documentation is missing or made too late.
          </p>

          {/* CTAs */}
          <div style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: 32
          }}>
            <a
              href="/admin/new-project"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '14px 28px',
                borderRadius: 8,
                background: '#fff',
                color: '#021048',
                fontWeight: 600,
                textDecoration: 'none',
                fontSize: 15,
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Start free trial
            </a>

            <a
              href="#how"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '14px 28px',
                borderRadius: 8,
                background: 'transparent',
                color: '#fff',
                fontWeight: 600,
                textDecoration: 'none',
                border: '1px solid rgba(255,255,255,0.3)',
                fontSize: 15,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
              }}
            >
              See how it works
            </a>
          </div>

          {/* GitHub Integration Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 20px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 100,
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="#fff"
              style={{ flexShrink: 0 }}
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <span style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.8)'
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
            marginTop: 60,
            maxWidth: 900,
            marginLeft: 'auto',
            marginRight: 'auto'
          }}
        >
          <div style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
            borderRadius: 16,
            padding: 8,
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.1) inset'
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
                alt="AIRD Dashboard"
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
