'use client';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

export function ScrollTimeline() {
  const [activeStep, setActiveStep] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;

      const section = sectionRef.current;
      const rect = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Calculate when section is in view
      const sectionTop = rect.top;
      const sectionHeight = rect.height;
      const sectionMiddle = sectionTop + sectionHeight / 2;

      // Progress based on section position in viewport
      const progress = Math.max(0, Math.min(1,
        (viewportHeight - sectionMiddle + sectionHeight / 2) / (viewportHeight + sectionHeight / 2)
      ));

      setScrollProgress(progress);

      // Update active step based on scroll progress
      if (progress < 0.33) {
        setActiveStep(0);
      } else if (progress < 0.66) {
        setActiveStep(1);
      } else {
        setActiveStep(2);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const steps = [
    {
      number: '1',
      title: 'You keep building',
      description: 'Each project gets a unique email address. Forward updates, upload files, sync your GitHub repo, or let commits and notes flow in. AIRD captures the work as it happens.'
    },
    {
      number: '2',
      title: 'AIRD makes sense of it all',
      description: 'AIRD uses specialised AI to classify each R&D item against the required criteria, including categories and activities. Everything is recorded in a clear chronological evidence trail.'
    },
    {
      number: '3',
      title: 'You export a defensible R&D claim pack',
      description: 'AIRD compiles your evidence into a structured, compliant report. The system assembles sources, timestamps, classifications, activities, and context into a clean, chronological package that aligns with R&D Tax Incentive requirements. The output is a complete, advisor-ready claim pack suitable for submission, technical review, or audit.'
    }
  ];

  return (
    <div ref={sectionRef} style={{ position: 'relative', minHeight: '400px' }}>
      {/* Central vertical line - hidden on mobile */}
      {!isMobile && (
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '0',
          width: '2px',
          height: '100%',
          background: 'var(--line)',
          transform: 'translateX(-50%)'
        }}>
          {/* Progress fill */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: `${scrollProgress * 100}%`,
            background: 'linear-gradient(to bottom, var(--brand), rgba(2,16,72,0.6))',
            transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }} />
        </div>
      )}

      {/* Timeline steps */}
      <div style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? '48px' : '80px',
        paddingBottom: '40px'
      }}>
        {steps.map((step, index) => {
          const isActive = activeStep >= index;
          const isLeft = index % 2 === 0;

          return (
            <div key={index} style={{
              position: 'relative',
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isMobile ? '20px' : '0'
            }}>
              {/* Code block for first step - on the right side (hidden on mobile) */}
              {index === 0 && !isMobile && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: isActive ? 1 : 0, x: isActive ? 0 : -20 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  style={{
                    position: 'absolute',
                    left: 'calc(50% + 60px)',
                    maxWidth: '280px',
                    width: '100%'
                  }}
                >
                  <div style={{
                    borderRadius: 12,
                    overflow: 'hidden',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
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
                        marginLeft: 'auto',
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.5)',
                        fontFamily: 'monospace'
                      }}>
                        app.js
                      </span>
                    </div>
                    {/* Code content */}
                    <pre style={{
                      margin: 0,
                      padding: '16px',
                      background: '#0f172a',
                      fontSize: '11px',
                      lineHeight: 1.6,
                      overflow: 'hidden'
                    }}>
                      <code style={{ fontFamily: 'ui-monospace, monospace' }}>
                        <span style={{ color: '#80b6f7' }}>const</span>{' '}
                        <span style={{ color: '#8be9fd' }}>insight</span>{' '}
                        <span style={{ color: '#fff' }}>=</span>{' '}
                        <span style={{ color: '#ff79c6' }}>discoverNewValue</span>
                        <span style={{ color: '#fff' }}>();</span>
                        {'\n'}
                        <span style={{ color: '#80b6f7' }}>const</span>{' '}
                        <span style={{ color: '#8be9fd' }}>system</span>{' '}
                        <span style={{ color: '#fff' }}>=</span>{' '}
                        <span style={{ color: '#ff79c6' }}>architectSolution</span>
                        <span style={{ color: '#fff' }}>(</span>
                        <span style={{ color: '#8be9fd' }}>insight</span>
                        <span style={{ color: '#fff' }}>);</span>
                        {'\n'}
                        <span style={{ color: '#80b6f7' }}>const</span>{' '}
                        <span style={{ color: '#8be9fd' }}>product</span>{' '}
                        <span style={{ color: '#fff' }}>=</span>{' '}
                        <span style={{ color: '#ff79c6' }}>refine</span>
                        <span style={{ color: '#fff' }}>(</span>
                        <span style={{ color: '#8be9fd' }}>system</span>
                        <span style={{ color: '#fff' }}>);</span>
                        {'\n\n'}
                        <span style={{ color: '#ff79c6' }}>launch</span>
                        <span style={{ color: '#fff' }}>(</span>
                        <span style={{ color: '#8be9fd' }}>product</span>
                        <span style={{ color: '#fff' }}>);</span>
                        {'\n'}
                        <span style={{ color: '#ff79c6' }}>scale</span>
                        <span style={{ color: '#fff' }}>(</span>
                        <span style={{ color: '#8be9fd' }}>product</span>
                        <span style={{ color: '#fff' }}>);</span>
                        {'\n\n'}
                        <span style={{ color: '#ff79c6' }}>build</span>
                        <span style={{ color: '#fff' }}>();</span>{' '}
                        <span style={{ color: '#6b7280' }}>// you keep building</span>
                        {'\n'}
                        <span style={{ color: '#6b7280' }}>// Aird captures the evidence</span>
                      </code>
                    </pre>
                  </div>
                </motion.div>
              )}

              {/* Dashboard image for second step - on the left side (hidden on mobile) */}
              {index === 1 && !isMobile && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: isActive ? 1 : 0, x: isActive ? 0 : 20 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  style={{
                    position: 'absolute',
                    right: 'calc(50% + 60px)',
                    maxWidth: '280px',
                    width: '100%'
                  }}
                >
                  <div style={{
                    borderRadius: 12,
                    overflow: 'hidden',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))',
                    padding: 6,
                    border: '1px solid rgba(0,0,0,0.08)'
                  }}>
                    <div style={{
                      borderRadius: 8,
                      overflow: 'hidden',
                      background: '#0f172a'
                    }}>
                      {/* Browser chrome */}
                      <div style={{
                        background: '#1e293b',
                        padding: '6px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        borderBottom: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444' }} />
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#eab308' }} />
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e' }} />
                        <span style={{
                          marginLeft: 'auto',
                          fontSize: 10,
                          color: 'rgba(255,255,255,0.5)',
                          fontFamily: 'monospace'
                        }}>
                          app.aird.com.au
                        </span>
                      </div>
                      {/* Screenshot */}
                      <img
                        src="/product-dashboard.png"
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
              )}

              {/* Claim pack image for third step - on the right side (hidden on mobile) */}
              {index === 2 && !isMobile && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: isActive ? 1 : 0, x: isActive ? 0 : -20 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  style={{
                    position: 'absolute',
                    left: 'calc(50% + 60px)',
                    maxWidth: '280px',
                    width: '100%'
                  }}
                >
                  <div style={{
                    borderRadius: 12,
                    overflow: 'hidden',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))',
                    padding: 6,
                    border: '1px solid rgba(0,0,0,0.08)'
                  }}>
                    <div style={{
                      borderRadius: 8,
                      overflow: 'hidden',
                      background: '#0f172a'
                    }}>
                      {/* Browser chrome */}
                      <div style={{
                        background: '#1e293b',
                        padding: '6px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        borderBottom: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444' }} />
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#eab308' }} />
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e' }} />
                        <span style={{
                          marginLeft: 'auto',
                          fontSize: 10,
                          color: 'rgba(255,255,255,0.5)',
                          fontFamily: 'monospace'
                        }}>
                          claim-pack.pdf
                        </span>
                      </div>
                      {/* Screenshot */}
                      <img
                        src="/claimpack.png"
                        alt="AIRD Claim Pack"
                        style={{
                          width: '100%',
                          height: 'auto',
                          display: 'block'
                        }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Node circle */}
              <div style={{
                position: isMobile ? 'relative' : 'absolute',
                left: isMobile ? 'auto' : '50%',
                transform: isMobile ? `scale(${isActive ? 1 : 0.8})` : `translateX(-50%) scale(${isActive ? 1 : 0.8})`,
                width: isMobile ? '40px' : '48px',
                height: isMobile ? '40px' : '48px',
                borderRadius: '50%',
                background: isActive ? 'var(--brand)' : '#fff',
                border: `3px solid ${isActive ? 'var(--brand)' : 'var(--line)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '18px' : '20px',
                fontWeight: 700,
                color: isActive ? '#fff' : 'var(--muted)',
                boxShadow: isActive ? '0 0 20px rgba(2,16,72,0.3)' : 'none',
                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: 2,
                flexShrink: 0
              }}>
                {step.number}
              </div>

              {/* Content */}
              <div style={{
                position: 'relative',
                maxWidth: isMobile ? '100%' : '320px',
                textAlign: isMobile ? 'center' : (isLeft ? 'right' : 'left'),
                ...(isMobile ? {} : { [isLeft ? 'marginRight' : 'marginLeft']: 'calc(50% + 60px)' }),
                opacity: isActive ? 1 : 0,
                transform: `translateY(${isActive ? 0 : 30}px)`,
                transition: `all 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.1}s`,
                padding: isMobile ? '0 16px' : '0'
              }}>
                <h3 style={{
                  margin: '0 0 12px',
                  fontSize: isMobile ? '18px' : '22px',
                  fontWeight: 700,
                  color: 'var(--ink)'
                }}>
                  {step.title}
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: isMobile ? '14px' : '15px',
                  lineHeight: 1.6,
                  color: 'var(--muted)'
                }}>
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
