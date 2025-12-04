'use client';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

function TiltCard({ children, delay = 0 }) {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMousePosition({ x, y });
  };

  const rotateX = isHovered ? (mousePosition.y - 0.5) * -10 : 0;
  const rotateY = isHovered ? (mousePosition.x - 0.5) * 10 : 0;

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.4, 0, 0.2, 1] }}
      style={{ perspective: '1000px', flex: '1 1 280px', maxWidth: '320px' }}
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
          y: isHovered ? -6 : 0,
          boxShadow: isHovered
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.4)'
            : '0 10px 30px -10px rgba(0, 0, 0, 0.2)'
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: '28px 24px',
          cursor: 'default',
          transformStyle: 'preserve-3d',
          position: 'relative',
          height: '100%'
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
      description: 'Skip the admin. Capture work as it happens and move faster on funding.'
    },
    {
      title: 'For product & R&D',
      description: 'Turn every update into traceable, compliant documentation.'
    },
    {
      title: 'For finance & advisors',
      description: 'Access organized, audit-ready data without chasing threads.'
    }
  ];

  return (
    <div ref={sectionRef} style={{ position: 'relative' }}>
      {inView && (
        <div style={{
          display: 'flex',
          gap: 20,
          justifyContent: 'center',
          alignItems: 'stretch',
          flexWrap: 'wrap'
        }}>
          {roles.map((role, index) => (
            <TiltCard key={index} delay={index * 0.1}>
              <h3 style={{
                margin: '0 0 10px',
                fontSize: 17,
                fontWeight: 600,
                color: 'var(--ink)'
              }}>
                {role.title}
              </h3>
              <p style={{
                margin: 0,
                fontSize: 15,
                lineHeight: 1.6,
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
