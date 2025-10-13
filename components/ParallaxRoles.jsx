'use client';
import { useEffect, useRef, useState } from 'react';

export function ParallaxRoles() {
  const [scrollY, setScrollY] = useState(0);
  const [inView, setInView] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;

      const rect = sectionRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Check if section is in view
      const isInView = rect.top < viewportHeight && rect.bottom > 0;
      setInView(isInView);

      // Calculate parallax offset
      if (isInView) {
        const sectionMiddle = rect.top + rect.height / 2;
        const offset = (viewportHeight / 2 - sectionMiddle) * 0.15;
        setScrollY(offset);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const roles = [
    {
      title: 'For founders',
      description: 'Skip the admin. Capture work as it happens and move faster on funding.',
      delay: 0
    },
    {
      title: 'For product & R&D',
      description: 'Turn every update into traceable, compliant documentation.',
      delay: 0.1
    },
    {
      title: 'For finance & advisors',
      description: 'Access organized, audit-ready data without chasing threads.',
      delay: 0.2
    }
  ];

  return (
    <div ref={sectionRef} style={{ position: 'relative' }}>
      <div style={{
        display: 'flex',
        gap: 48,
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'flex-start',
        flexWrap: 'wrap'
      }}>
        {roles.map((role, index) => {
          const parallaxOffset = scrollY * (index === 1 ? 1.2 : index === 0 ? 0.8 : 1);

          return (
            <div
              key={index}
              style={{
                position: 'relative',
                transform: `translateY(${parallaxOffset}px)`,
                opacity: inView ? 1 : 0,
                transition: `opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1) ${role.delay}s`,
                textAlign: 'center',
                flex: '1 1 280px',
                maxWidth: '320px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
            >
              {/* Icon */}
              <div style={{
                marginBottom: '20px',
                transform: inView ? 'scale(1)' : 'scale(0.8)',
                opacity: inView ? 1 : 0,
                transition: `all 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${role.delay + 0.2}s`
              }}>
                {index === 0 && (
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                )}
                {index === 1 && (
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                  </svg>
                )}
                {index === 2 && (
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="20" x2="12" y2="10"/>
                    <line x1="18" y1="20" x2="18" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="16"/>
                  </svg>
                )}
              </div>

              {/* Title */}
              <h3 style={{
                margin: '0 0 12px',
                fontSize: '20px',
                fontWeight: 700,
                color: 'var(--ink)'
              }}>
                {role.title}
              </h3>

              {/* Description */}
              <p style={{
                margin: 0,
                fontSize: '15px',
                lineHeight: 1.7,
                color: 'var(--muted)'
              }}>
                {role.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Floating background accents */}
      <div style={{
        position: 'absolute',
        top: '20%',
        right: '10%',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(2,16,72,0.02) 0%, transparent 70%)',
        transform: `translateY(${-scrollY * 0.5}px)`,
        pointerEvents: 'none',
        zIndex: -1
      }} />

      <div style={{
        position: 'absolute',
        bottom: '10%',
        left: '5%',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(2,16,72,0.015) 0%, transparent 70%)',
        transform: `translateY(${-scrollY * 0.3}px)`,
        pointerEvents: 'none',
        zIndex: -1
      }} />
    </div>
  );
}
