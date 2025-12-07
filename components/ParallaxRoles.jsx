'use client';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

function TiltCard({ children, delay = 0 }) {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });
  const [isMobile, setIsMobile] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMouseMove = (e) => {
    if (!cardRef.current || isMobile) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMousePosition({ x, y });
  };

  const rotateX = isHovered && !isMobile ? (mousePosition.y - 0.5) * -10 : 0;
  const rotateY = isHovered && !isMobile ? (mousePosition.x - 0.5) * 10 : 0;

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.4, 0, 0.2, 1] }}
      style={{ perspective: '1000px', flex: '1 1 260px', maxWidth: isMobile ? '100%' : '300px', width: '100%' }}
    >
      <motion.div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setMousePosition({ x: 0.5, y: 0.5 });
        }}
        onMouseMove={handleMouseMove}
        animate={{
          rotateX,
          rotateY,
          y: isHovered ? -4 : 0,
          boxShadow: isHovered
            ? '0 12px 24px -4px rgba(0, 0, 0, 0.15)'
            : '0 4px 12px -2px rgba(0, 0, 0, 0.08)'
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        style={{
          background: '#fff',
          borderRadius: 8,
          padding: '20px 18px',
          cursor: 'default',
          transformStyle: 'preserve-3d',
          position: 'relative',
          height: '100%',
          border: '1px solid rgba(0, 0, 0, 0.06)'
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export function ParallaxRoles() {
  const [inView, setInView] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const roles = [
    {
      title: 'For founders',
      description: 'Skip the admin. Capture work as it happens and move faster on funding.',
      image: '/shutterstock_2504642529.jpg'
    },
    {
      title: 'For product & R&D',
      description: 'Turn every update into traceable, compliant documentation.',
      image: '/shutterstock_2561893449.jpg'
    },
    {
      title: 'For finance & advisors',
      description: 'Access organized, audit-ready data without chasing threads.',
      image: '/pexels-divinetechygirl-1181690.jpg'
    }
  ];

  return (
    <div ref={sectionRef} style={{ position: 'relative', padding: '0 8px' }}>
      {inView && (
        <div style={{
          display: 'flex',
          gap: 16,
          justifyContent: 'center',
          alignItems: 'stretch',
          flexWrap: 'wrap'
        }}>
          {roles.map((role, index) => (
            <TiltCard key={index} delay={index * 0.1}>
              {role.image && (
                <div style={{
                  marginBottom: 14,
                  borderRadius: 6,
                  overflow: 'hidden',
                  aspectRatio: '4/3'
                }}>
                  <img
                    src={role.image}
                    alt={role.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                </div>
              )}
              <h3 style={{
                margin: '0 0 8px',
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--ink)'
              }}>
                {role.title}
              </h3>
              <p style={{
                margin: 0,
                fontSize: 14,
                lineHeight: 1.5,
                color: 'var(--muted)'
              }}>
                {role.description}
              </p>
            </TiltCard>
          ))}
        </div>
      )}
    </div>
  );
}
