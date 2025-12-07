'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

export function LandingHeader() {
  const { user, loading } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when resizing to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const mobileMenuVariants = {
    closed: { opacity: 0, height: 0 },
    open: { opacity: 1, height: 'auto' }
  };

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        transition: 'all 0.3s ease',
        backdropFilter: isScrolled ? 'saturate(180%) blur(20px)' : 'none',
        backgroundColor: isScrolled ? 'rgba(255, 255, 255, 0.85)' : 'transparent',
        boxShadow: isScrolled ? '0 8px 32px rgba(0, 0, 0, 0.08)' : 'none',
        borderBottom: isScrolled ? '1px solid rgba(0, 0, 0, 0.06)' : 'none'
      }}
    >
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '4px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Logo */}
        <motion.a
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            textDecoration: 'none'
          }}
          whileHover={{ scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 400, damping: 10 }}
        >
          <img
            src="/Aird__3_-removebg-preview.png"
            alt="Aird"
            style={{
              height: 80,
              width: 'auto',
              marginTop: '-10px',
              marginBottom: '-10px'
            }}
          />
        </motion.a>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex" style={{ alignItems: 'center', gap: 10 }}>
          <motion.a
            href="/demo"
            style={{
              fontSize: 14,
              color: '#64748b',
              textDecoration: 'none',
              padding: '8px 12px'
            }}
            whileHover={{ color: '#0f172a' }}
            transition={{ duration: 0.15 }}
          >
            Demo
          </motion.a>
          {loading ? (
            <div style={{ width: 90, height: 32, background: '#f3f4f6', borderRadius: 8 }} />
          ) : user ? (
            <motion.a
              href="/"
              style={{
                fontSize: 14,
                color: '#0f172a',
                textDecoration: 'none',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                background: '#fff'
              }}
              whileHover={{ scale: 1.02, backgroundColor: '#f8fafc' }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              Go to projects
            </motion.a>
          ) : (
            <>
              <motion.a
                href="/auth/login"
                style={{
                  fontSize: 14,
                  color: '#0f172a',
                  textDecoration: 'none',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  background: '#fff'
                }}
                whileHover={{ scale: 1.02, backgroundColor: '#f8fafc' }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                Sign in
              </motion.a>
              <motion.a
                href="/admin/new-project"
                style={{
                  fontSize: 14,
                  color: '#fff',
                  textDecoration: 'none',
                  padding: '10px 16px',
                  borderRadius: 8,
                  background: '#021048',
                  border: '1px solid rgba(14, 165, 233, 0.4)'
                }}
                whileHover={{ scale: 1.05, boxShadow: '0 4px 20px rgba(2, 16, 72, 0.3)' }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                Start a project
              </motion.a>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <motion.button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex lg:hidden"
          style={{
            padding: 8,
            borderRadius: 8,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: '#0f172a'
          }}
          whileTap={{ scale: 0.95 }}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </motion.button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            variants={mobileMenuVariants}
            initial="closed"
            animate="open"
            exit="closed"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
            className="lg:hidden"
          >
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid rgba(0, 0, 0, 0.06)',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)'
            }}>
              {loading ? (
                <div style={{ width: '100%', height: 40, background: '#f3f4f6', borderRadius: 8 }} />
              ) : user ? (
                <motion.a
                  href="/"
                  style={{
                    display: 'block',
                    fontSize: 14,
                    color: '#0f172a',
                    textDecoration: 'none',
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    background: '#fff',
                    textAlign: 'center'
                  }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Go to projects
                </motion.a>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <motion.a
                    href="/demo"
                    style={{
                      display: 'block',
                      fontSize: 14,
                      color: '#0f172a',
                      textDecoration: 'none',
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      background: '#fff',
                      textAlign: 'center'
                    }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Try Demo
                  </motion.a>
                  <motion.a
                    href="/auth/login"
                    style={{
                      display: 'block',
                      fontSize: 14,
                      color: '#0f172a',
                      textDecoration: 'none',
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      background: '#fff',
                      textAlign: 'center'
                    }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Sign in
                  </motion.a>
                  <motion.a
                    href="/admin/new-project"
                    style={{
                      display: 'block',
                      fontSize: 14,
                      color: '#fff',
                      textDecoration: 'none',
                      padding: '12px 16px',
                      borderRadius: 8,
                      background: '#021048',
                      border: '1px solid rgba(14, 165, 233, 0.4)',
                      textAlign: 'center'
                    }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Start a project
                  </motion.a>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
