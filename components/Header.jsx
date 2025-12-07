'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronDown } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

export function Header({ projectName = null, projectToken = null }) {
  const { user, signOut, loading } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isWhoDropdownOpen, setIsWhoDropdownOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  // If user is logged in OR has a project context, use the original dark header
  if (user || projectName) {
    return (
      <header style={{
        borderBottom: '1px solid var(--line)',
        background: '#021048'
      }}>
        <div style={{
          width: 'min(960px, 92vw)',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '4px 0'
        }}>
          <a href="/" style={{
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center'
          }}>
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
          </a>

          <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
            {!projectName && (
              <nav style={{display: 'flex', gap: 18, marginRight: 12}}>
                <a href="/" style={{
                  textDecoration: 'none',
                  color: '#fff',
                  fontSize: 14
                }}>Projects</a>
                <a href="/blog" style={{
                  textDecoration: 'none',
                  color: '#fff',
                  fontSize: 14
                }}>Blog</a>
                <a href="/settings/team" style={{
                  textDecoration: 'none',
                  color: '#fff',
                  fontSize: 14
                }}>Team</a>
              </nav>
            )}
            {projectName && (
              <span style={{
                fontSize: 13,
                color: 'rgba(255, 255, 255, 0.85)',
                marginRight: 12,
                fontWeight: 400
              }}>Everything here becomes contemporaneous R&D evidence</span>
            )}
            <button
              onClick={signOut}
              style={{
                padding: '8px 14px',
                backgroundColor: 'transparent',
                color: '#fff',
                borderRadius: '12px',
                fontSize: 14,
                fontWeight: 500,
                border: '1px solid #fff',
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
    );
  }

  // Floating glassy pill navbar for landing page
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      display: 'flex',
      justifyContent: 'center',
      padding: isScrolled ? '12px 16px' : '20px 16px',
      transition: 'padding 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
      pointerEvents: 'none'
    }}>
      <motion.header
        initial={{ y: -100, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{
          pointerEvents: 'auto',
          borderRadius: 9999,
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          backgroundColor: isScrolled
            ? 'rgba(2, 16, 72, 0.85)'
            : 'rgba(2, 16, 72, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: isScrolled
            ? '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05) inset'
            : '0 12px 48px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset, 0 0 60px rgba(96, 165, 250, 0.15)',
          padding: isScrolled ? '10px 32px' : '14px 48px',
          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          width: 'auto',
          maxWidth: '92vw'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: isScrolled ? 32 : 48,
          transition: 'gap 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          {/* Logo */}
          <motion.a
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              textDecoration: 'none',
              flexShrink: 0
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <img
              src="/Aird__3_-removebg-preview.png"
              alt="Aird"
              style={{
                height: isScrolled ? 36 : 48,
                width: 'auto',
                transition: 'height 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
          </motion.a>

          {/* Desktop Navigation */}
          <nav
            className="desktop-nav"
            style={{
              alignItems: 'center',
              display: 'flex',
              gap: isScrolled ? 24 : 36,
              transition: 'gap 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <motion.a
              href="/#how"
              style={{
                textDecoration: 'none',
                color: 'rgba(255, 255, 255, 0.85)',
                fontWeight: 500,
                fontSize: isScrolled ? 13 : 14,
                transition: 'font-size 0.5s cubic-bezier(0.4, 0, 0.2, 1), color 0.15s ease',
                whiteSpace: 'nowrap'
              }}
              whileHover={{ color: '#fff' }}
            >
              How it works
            </motion.a>
            {/* Who it's for dropdown */}
            <div
              style={{ position: 'relative' }}
              onMouseEnter={() => setIsWhoDropdownOpen(true)}
              onMouseLeave={() => setIsWhoDropdownOpen(false)}
            >
              <motion.button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'rgba(255, 255, 255, 0.85)',
                  fontWeight: 500,
                  fontSize: isScrolled ? 13 : 14,
                  transition: 'font-size 0.5s cubic-bezier(0.4, 0, 0.2, 1), color 0.15s ease',
                  whiteSpace: 'nowrap',
                  fontFamily: 'inherit',
                  padding: 0
                }}
                whileHover={{ color: '#fff' }}
              >
                Who it's for
                <motion.span
                  animate={{ rotate: isWhoDropdownOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ display: 'flex', alignItems: 'center' }}
                >
                  <ChevronDown size={16} />
                </motion.span>
              </motion.button>

              <AnimatePresence>
                {isWhoDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      marginTop: 12,
                      width: 340,
                      borderRadius: 16,
                      backgroundColor: '#021048',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      boxShadow: '0 16px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
                      padding: 8,
                      overflow: 'hidden',
                      zIndex: 100
                    }}
                  >
                    <a
                      href="/#roles"
                      style={{
                        display: 'block',
                        padding: '14px 16px',
                        borderRadius: 12,
                        textDecoration: 'none',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: 14,
                        marginBottom: 4
                      }}>
                        R&D & Engineering Teams
                      </div>
                      <div style={{
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontSize: 13,
                        lineHeight: 1.4
                      }}>
                        Capture engineering work as compliant R&D evidence - automatically.
                      </div>
                    </a>
                    <a
                      href="/advisors"
                      style={{
                        display: 'block',
                        padding: '14px 16px',
                        borderRadius: 12,
                        textDecoration: 'none',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: 14,
                        marginBottom: 4
                      }}>
                        R&D Advisors & Accountants
                      </div>
                      <div style={{
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontSize: 13,
                        lineHeight: 1.4
                      }}>
                        Collect client evidence, review timelines, and export claim packs faster.
                      </div>
                    </a>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <motion.a
              href="/pricing"
              style={{
                textDecoration: 'none',
                color: 'rgba(255, 255, 255, 0.85)',
                fontWeight: 500,
                fontSize: isScrolled ? 13 : 14,
                transition: 'font-size 0.5s cubic-bezier(0.4, 0, 0.2, 1), color 0.15s ease',
                whiteSpace: 'nowrap'
              }}
              whileHover={{ color: '#fff' }}
            >
              Pricing
            </motion.a>
            <motion.a
              href="/blog"
              style={{
                textDecoration: 'none',
                color: 'rgba(255, 255, 255, 0.85)',
                fontWeight: 500,
                fontSize: isScrolled ? 13 : 14,
                transition: 'font-size 0.5s cubic-bezier(0.4, 0, 0.2, 1), color 0.15s ease',
                whiteSpace: 'nowrap'
              }}
              whileHover={{ color: '#fff' }}
            >
              Blog
            </motion.a>
            <motion.a
              href="/auth/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                borderRadius: 9999,
                background: '#fff',
                color: '#021048',
                fontWeight: 600,
                textDecoration: 'none',
                padding: isScrolled ? '8px 18px' : '10px 24px',
                fontSize: isScrolled ? 13 : 14,
                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
              whileHover={{ scale: 1.05, boxShadow: '0 4px 20px rgba(255, 255, 255, 0.25)' }}
              whileTap={{ scale: 0.98 }}
            >
              Get started
            </motion.a>
          </nav>

          {/* Mobile Hamburger Button */}
          <motion.button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="mobile-menu-btn"
            style={{
              padding: 8,
              borderRadius: 8,
              border: 'none',
              background: 'rgba(255, 255, 255, 0.1)',
              cursor: 'pointer',
              color: '#fff',
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            whileHover={{ background: 'rgba(255, 255, 255, 0.2)' }}
            whileTap={{ scale: 0.95 }}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </motion.button>
        </div>
      </motion.header>

      {/* Mobile Menu Dropdown - rendered outside the pill */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              top: '100%',
              left: 16,
              right: 16,
              marginTop: 8,
              pointerEvents: 'auto',
              borderRadius: 16,
              backgroundColor: '#021048',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 16px 48px rgba(0, 0, 0, 0.5)',
              padding: 8,
              overflow: 'hidden'
            }}
          >
            <a
              href="/#how"
              style={{
                display: 'block',
                fontSize: 16,
                color: 'rgba(255, 255, 255, 0.9)',
                textDecoration: 'none',
                padding: '14px 16px',
                borderRadius: 10,
                fontWeight: 500
              }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              How it works
            </a>
            <div style={{
              padding: '10px 16px',
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: 12,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Who it's for
            </div>
            <a
              href="/#roles"
              style={{
                display: 'block',
                fontSize: 15,
                color: 'rgba(255, 255, 255, 0.9)',
                textDecoration: 'none',
                padding: '12px 16px 4px',
                borderRadius: 10,
                fontWeight: 500
              }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              R&D & Engineering Teams
            </a>
            <div style={{
              fontSize: 13,
              color: 'rgba(255, 255, 255, 0.5)',
              padding: '0 16px 12px',
              lineHeight: 1.4
            }}>
              Capture engineering work as compliant R&D evidence - automatically.
            </div>
            <a
              href="/advisors"
              style={{
                display: 'block',
                fontSize: 15,
                color: 'rgba(255, 255, 255, 0.9)',
                textDecoration: 'none',
                padding: '12px 16px 4px',
                borderRadius: 10,
                fontWeight: 500
              }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              R&D Advisors & Accountants
            </a>
            <div style={{
              fontSize: 13,
              color: 'rgba(255, 255, 255, 0.5)',
              padding: '0 16px 12px',
              lineHeight: 1.4,
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              marginBottom: 8
            }}>
              Collect client evidence, review timelines, and export claim packs faster.
            </div>
            <a
              href="/pricing"
              style={{
                display: 'block',
                fontSize: 16,
                color: 'rgba(255, 255, 255, 0.9)',
                textDecoration: 'none',
                padding: '14px 16px',
                borderRadius: 10,
                fontWeight: 500
              }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Pricing
            </a>
            <a
              href="/blog"
              style={{
                display: 'block',
                fontSize: 16,
                color: 'rgba(255, 255, 255, 0.9)',
                textDecoration: 'none',
                padding: '14px 16px',
                borderRadius: 10,
                fontWeight: 500
              }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Blog
            </a>
            <div style={{ padding: '8px 8px 4px' }}>
              <a
                href="/auth/login"
                style={{
                  display: 'block',
                  fontSize: 16,
                  color: '#021048',
                  textDecoration: 'none',
                  padding: '14px 16px',
                  borderRadius: 10,
                  background: '#fff',
                  textAlign: 'center',
                  fontWeight: 600
                }}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Get started
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Responsive styles */}
      <style jsx global>{`
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-menu-btn {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
}
