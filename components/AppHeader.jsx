'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { LogOut, Menu, X, HelpCircle, Settings, Compass } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { usePathname } from 'next/navigation';
import { OnboardingModal } from '@/components/OnboardingModal';
import { resetOnboarding } from '@/lib/onboarding';

export function AppHeader() {
  const { signOut, isConsultant, consultantBranding, user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    ...(isConsultant
      ? [
          { name: 'Clients', href: '/consultant' },
          { name: 'Team', href: '/consultant/team' },
        ]
      : [
          { name: 'Dashboard', href: '/dashboard' },
          { name: 'Projects', href: '/projects' },
          { name: 'Team', href: '/settings/team' },
          { name: 'Timesheets', href: '/timesheets' },
        ]),
    ...(isConsultant
      ? [
          { name: 'Find Advisor', href: '/marketplace' },
          { name: 'Profile', href: '/consultant/profile' },
          { name: 'Settings', href: '/consultant/settings' },
        ]
      : []),
  ];

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on resize
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Determine active tab based on pathname
  const getActiveTab = () => {
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname.startsWith('/marketplace')) return 'Find Advisor';
    if (pathname === '/consultant/profile') return 'Profile';
    if (pathname === '/consultant/settings') return 'Settings';
    if (pathname === '/consultant/team') return 'Team';
    if (pathname.startsWith('/consultant')) return 'Clients';
    if (isConsultant && pathname.startsWith('/p/')) return 'Clients';
    if (pathname === '/settings/team') return 'Team';
    if (pathname.startsWith('/timesheets')) return 'Timesheets';
    return 'Projects';
  };

  const activeTab = getActiveTab();

  return (
    <>
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        width: '100%',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow: '0 1px 0 rgba(0, 0, 0, 0.04)',
      }}>
        <div
          className="app-header-row"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            height: 56,
            width: '100%',
          }}
        >
          {/* Left: Logo (fixed width to align with project sidebar) */}
          <Link href={isConsultant ? '/consultant' : '/projects'} style={{
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
            flexShrink: 0,
            width: 196,
            height: '100%',
            gap: 10,
          }}>
            {consultantBranding?.logo_url ? (
              <img
                src={consultantBranding.logo_url}
                alt={consultantBranding.company_name || 'Logo'}
                style={{
                  height: 32,
                  width: 'auto',
                  objectFit: 'contain',
                }}
              />
            ) : (
              <img
                src="/claimflow-logo-full.png"
                alt="ClaimFlow"
                style={{
                  height: 38,
                  width: 'auto',
                }}
              />
            )}
            {consultantBranding?.company_name && !consultantBranding?.logo_url && (
              <span style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a' }}>
                {consultantBranding.company_name}
              </span>
            )}
            {consultantBranding && (
              <span style={{
                fontSize: 10,
                color: '#9ca3af',
                whiteSpace: 'nowrap',
              }}>
                Powered by ClaimFlow
              </span>
            )}
          </Link>

          {/* Center: Tab Navigation (desktop) */}
          <nav
            className="app-header-tabs-desktop"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 0,
              marginRight: 'auto',
              height: '100%',
            }}
          >
            {tabs.map((tab) => {
              const isActive = tab.name === activeTab;
              return (
                <Link
                  key={tab.name}
                  href={tab.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    height: '100%',
                    padding: '0 14px',
                    borderRadius: 0,
                    borderBottom: isActive ? '2px solid #021048' : '2px solid transparent',
                    fontSize: 14,
                    fontWeight: isActive ? 600 : 500,
                    textDecoration: 'none',
                    transition: 'color 0.15s ease, border-color 0.15s ease',
                    backgroundColor: 'transparent',
                    color: isActive ? '#021048' : '#64748b',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = '#0f172a';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = '#64748b';
                    }
                  }}
                >
                  {tab.name}
                </Link>
              );
            })}
          </nav>

          {/* Right: User Avatar (desktop) + Mobile Menu Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: '100%' }}>
            {/* User Avatar - Desktop */}
            <div className="app-header-user-desktop" style={{ position: 'relative', display: 'flex', alignItems: 'center' }} ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: '#021048',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'opacity 0.15s ease',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#ffffff',
                  letterSpacing: '0.02em',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                {user?.email?.charAt(0).toUpperCase() ?? '?'}
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  backgroundColor: '#fff',
                  borderRadius: 10,
                  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.04)',
                  minWidth: 160,
                  overflow: 'hidden',
                  zIndex: 100,
                }}>
                  {[
                    { label: 'Settings', icon: <Settings size={16} color="#6b7280" />, action: () => router.push('/settings/company') },
                    { label: 'Find Advisor', icon: <Compass size={16} color="#6b7280" />, action: () => router.push('/marketplace') },
                  ].map(({ label, icon, action }) => (
                    <button
                      key={label}
                      onClick={() => { setIsUserMenuOpen(false); action(); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        width: '100%', padding: '10px 14px',
                        border: 'none', borderBottom: '1px solid rgba(0,0,0,0.06)',
                        backgroundColor: 'transparent', cursor: 'pointer',
                        fontSize: 14, color: '#374151', fontFamily: 'inherit',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.04)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {icon}{label}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      resetOnboarding(user?.id);
                      setShowOnboarding(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '10px 14px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      fontSize: 14,
                      color: '#374151',
                      fontFamily: 'inherit',
                      transition: 'background-color 0.15s ease',
                      borderBottom: '1px solid rgba(0,0,0,0.06)',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.04)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <HelpCircle size={16} color="#6b7280" />
                    Walkthrough
                  </button>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      signOut();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '10px 14px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      fontSize: 14,
                      color: '#374151',
                      fontFamily: 'inherit',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.04)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <LogOut size={16} color="#6b7280" />
                    Log out
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="app-header-mobile-btn"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              style={{
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
            >
              {isMobileMenuOpen ? <X size={20} color="#6b7280" /> : <Menu size={20} color="#6b7280" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div
            className="app-header-mobile-menu"
            style={{
              borderTop: '1px solid rgba(0, 0, 0, 0.08)',
              backgroundColor: '#ffffff',
              padding: '8px 16px 16px',
            }}
          >
            {/* Mobile Tabs */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 12 }}>
              {tabs.map((tab) => {
                const isActive = tab.name === activeTab;
                return (
                  <Link
                    key={tab.name}
                    href={tab.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      fontSize: 15,
                      fontWeight: 500,
                      textDecoration: 'none',
                      backgroundColor: isActive ? '#021048' : 'transparent',
                      color: isActive ? '#fff' : '#374151',
                    }}
                  >
                    {tab.name}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Settings + Find Advisor */}
            {[
              { label: 'Settings', icon: <Settings size={18} color="#6b7280" />, href: '/settings/company' },
              { label: 'Find Advisor', icon: <Compass size={18} color="#6b7280" />, href: '/marketplace' },
            ].map(({ label, icon, href }) => (
              <Link
                key={label}
                href={href}
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '10px 14px',
                  borderRadius: 8, textDecoration: 'none',
                  fontSize: 15, fontWeight: 500, color: '#374151',
                  marginBottom: 4,
                }}
              >
                {icon}{label}
              </Link>
            ))}
            {/* Mobile Walkthrough */}
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                resetOnboarding(user?.id);
                setShowOnboarding(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '10px 14px',
                border: 'none',
                borderRadius: 8,
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontSize: 15,
                fontWeight: 500,
                color: '#374151',
                fontFamily: 'inherit',
                marginBottom: 4,
              }}
            >
              <HelpCircle size={18} color="#6b7280" />
              Walkthrough
            </button>
            {/* Mobile Logout */}
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                signOut();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '10px 14px',
                border: 'none',
                borderRadius: 8,
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                cursor: 'pointer',
                fontSize: 15,
                fontWeight: 500,
                color: '#374151',
                fontFamily: 'inherit',
              }}
            >
              <LogOut size={18} color="#6b7280" />
              Log out
            </button>
          </div>
        )}
      </header>

      {/* Spacer to offset fixed header */}
      <div className="app-header-spacer" style={{ height: 56 }} />

      {/* Responsive Styles */}
      <style jsx global>{`
        @media (max-width: 768px) {
          .app-header-user-desktop {
            display: none !important;
          }
          .app-header-tabs-desktop {
            display: none !important;
          }
          .app-header-mobile-btn {
            display: flex !important;
          }
          .app-header-row {
            padding: 0 16px !important;
            height: 52px !important;
          }
          .app-header-spacer {
            height: 52px !important;
          }
        }
      `}</style>

      {showOnboarding && (
        <OnboardingModal
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          isConsultant={isConsultant}
          userId={user?.id}
        />
      )}
    </>
  );
}
