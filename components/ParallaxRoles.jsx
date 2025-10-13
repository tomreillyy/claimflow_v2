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
      icon: '⚡',
      delay: 0
    },
    {
      title: 'For product & R&D',
      description: 'Turn every update into traceable, compliant documentation.',
      icon: '🔬',
      delay: 0.1
    },
    {
      title: 'For finance & advisors',
      description: 'Access organized, audit-ready data without chasing threads.',
      icon: '📊',
      delay: 0.2
    }
  ];

  return (
    <div ref={sectionRef} style={{ position: 'relative' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 40,
        position: 'relative'
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
                padding: '32px 24px'
              }}
            >
              {/* Animated icon */}
              <div style={{
                fontSize: '48px',
                marginBottom: '20px',
                transform: inView ? 'scale(1) rotate(0deg)' : 'scale(0.8) rotate(-10deg)',
                transition: `all 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${role.delay + 0.2}s`,
                display: 'inline-block'
              }}>
                {role.icon}
              </div>

              {/* Title with underline accent */}
              <h3 style={{
                margin: '0 0 16px',
                fontSize: '22px',
                fontWeight: 700,
                color: 'var(--ink)',
                position: 'relative',
                display: 'inline-block',
                paddingBottom: '8px'
              }}>
                {role.title}
                <span style={{
                  position: 'absolute',
                  bottom: 0,
                  left: '50%',
                  transform: `translateX(-50%) scaleX(${inView ? 1 : 0})`,
                  width: '60%',
                  height: '2px',
                  background: 'var(--brand)',
                  transition: `transform 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${role.delay + 0.3}s`,
                  transformOrigin: 'center'
                }} />
              </h3>

              {/* Description */}
              <p style={{
                margin: 0,
                fontSize: '16px',
                lineHeight: 1.7,
                color: 'var(--muted)',
                maxWidth: '300px',
                marginLeft: 'auto',
                marginRight: 'auto'
              }}>
                {role.description}
              </p>

              {/* Decorative background element */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: `translate(-50%, -50%) scale(${inView ? 1 : 0})`,
                width: '200px',
                height: '200px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(2,16,72,0.03) 0%, transparent 70%)',
                transition: `transform 0.8s cubic-bezier(0.4, 0, 0.2, 1) ${role.delay}s`,
                zIndex: -1,
                pointerEvents: 'none'
              }} />
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
