'use client';
import { useEffect, useRef, useState } from 'react';

export function IntegrationsSection() {
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

      // Progress from 0 to 1 as section enters viewport
      const progress = Math.max(0, Math.min(1,
        (viewportHeight - sectionTop) / (viewportHeight * 0.5)
      ));

      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Calculate grayscale and opacity based on scroll
  const grayscale = 1 - scrollProgress * 0.7; // Goes from 1 to 0.3
  const opacity = 0.5 + scrollProgress * 0.5; // Goes from 0.5 to 1

  return (
    <section
      ref={sectionRef}
      style={{
        padding: '60px 24px',
        borderTop: '1px solid var(--line)',
        background: 'var(--bg)'
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
        <p style={{
          color: 'var(--muted)',
          fontSize: 13,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 24,
          opacity: scrollProgress,
          transform: `translateY(${(1 - scrollProgress) * 10}px)`,
          transition: 'opacity 0.3s ease, transform 0.3s ease'
        }}>
          Integrates with
        </p>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 48,
          flexWrap: 'wrap'
        }}>
          {/* GitHub */}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              textDecoration: 'none',
              color: '#24292e',
              filter: `grayscale(${grayscale})`,
              opacity: opacity,
              transform: `translateY(${(1 - scrollProgress) * 20}px)`,
              transition: 'filter 0.4s ease, opacity 0.4s ease, transform 0.4s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = 'grayscale(0)';
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.transform = 'translateY(0) scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = `grayscale(${grayscale})`;
              e.currentTarget.style.opacity = String(opacity);
              e.currentTarget.style.transform = `translateY(${(1 - scrollProgress) * 20}px) scale(1)`;
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <span style={{ fontWeight: 600, fontSize: 15 }}>GitHub</span>
          </a>

          {/* Placeholder for future integrations */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: 'var(--muted)',
            opacity: scrollProgress * 0.3,
            fontSize: 15,
            fontWeight: 600,
            transform: `translateY(${(1 - scrollProgress) * 20}px)`,
            transition: 'opacity 0.4s ease, transform 0.4s ease'
          }}>
            More coming soon
          </div>
        </div>
      </div>
    </section>
  );
}
