'use client';
import { useEffect, useRef, useState } from 'react';

export function ScrollTimeline() {
  const [activeStep, setActiveStep] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const sectionRef = useRef(null);

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
      {/* Central vertical line */}
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

      {/* Timeline steps */}
      <div style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '80px',
        paddingBottom: '40px'
      }}>
        {steps.map((step, index) => {
          const isActive = activeStep >= index;
          const isLeft = index % 2 === 0;

          return (
            <div key={index} style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {/* Node circle */}
              <div style={{
                position: 'absolute',
                left: '50%',
                transform: `translateX(-50%) scale(${isActive ? 1 : 0.8})`,
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: isActive ? 'var(--brand)' : '#fff',
                border: `3px solid ${isActive ? 'var(--brand)' : 'var(--line)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 700,
                color: isActive ? '#fff' : 'var(--muted)',
                boxShadow: isActive ? '0 0 20px rgba(2,16,72,0.3)' : 'none',
                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: 2
              }}>
                {step.number}
              </div>

              {/* Content */}
              <div style={{
                position: 'relative',
                maxWidth: '320px',
                textAlign: isLeft ? 'right' : 'left',
                [isLeft ? 'marginRight' : 'marginLeft']: 'calc(50% + 60px)',
                opacity: isActive ? 1 : 0,
                transform: `translateY(${isActive ? 0 : 30}px)`,
                transition: `all 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.1}s`
              }}>
                <h3 style={{
                  margin: '0 0 12px',
                  fontSize: '22px',
                  fontWeight: 700,
                  color: 'var(--ink)'
                }}>
                  {step.title}
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '15px',
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
