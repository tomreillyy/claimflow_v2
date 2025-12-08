'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, User, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { usePathname } from 'next/navigation';

const tabs = [
  { name: 'Dashboard', href: '/' },
  { name: 'Projects', href: '/projects' },
  { name: 'Team', href: '/settings/team' },
];

export function AppHeader() {
  const { signOut } = useAuth();
  const pathname = usePathname();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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
    if (pathname === '/' || pathname === '/dashboard') return 'Dashboard';
    if (pathname === '/projects' || pathname.startsWith('/p/')) return 'Projects';
    if (pathname === '/settings/team') return 'Team';
    return 'Dashboard';
  };

  const activeTab = getActiveTab();

  return (
    <>
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        width: '100%',
        backgroundColor: '#fff',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      }}>
        {/* Row 1 */}
        <div
          className="app-header-row1"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 24px',
            maxWidth: '1400px',
            margin: '0 auto',
            width: '100%',
          }}
        >
          {/* Left: Logo */}
          <a href="/" style={{
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
            flexShrink: 0,
          }}>
            <img
              src="/aird-logo-blue.png"
              alt="Aird"
              style={{
                height: 36,
                width: 'auto',
              }}
            />
          </a>

          {/* Center: Search Bar (hidden on mobile) */}
          <div
            className="app-header-search"
            style={{
              flex: 1,
              maxWidth: '480px',
              margin: '0 48px',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#f3f4f6',
              borderRadius: '9999px',
              padding: '8px 14px',
              transition: 'all 0.2s ease',
              border: '1px solid transparent',
            }}
            onFocus={(e) => {
              e.currentTarget.style.backgroundColor = '#fff';
              e.currentTarget.style.borderColor = '#d1d5db';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(2, 16, 72, 0.08)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.boxShadow = 'none';
            }}
            >
              <Search size={18} color="#9ca3af" style={{ marginRight: 10, flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  flex: 1,
                  fontSize: 14,
                  color: '#1f2937',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          </div>

          {/* Right: User Avatar (desktop) + Mobile Menu Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* User Avatar - Desktop */}
            <div className="app-header-user-desktop" style={{ position: 'relative' }} ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  backgroundColor: '#f3f4f6',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
              >
                <User size={18} color="#6b7280" />
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  backgroundColor: '#fff',
                  borderRadius: 12,
                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                  minWidth: 160,
                  overflow: 'hidden',
                  zIndex: 100,
                }}>
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
                      padding: '12px 16px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      fontSize: 14,
                      color: '#374151',
                      fontFamily: 'inherit',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
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
                width: 40,
                height: 40,
                borderRadius: 8,
                backgroundColor: '#f3f4f6',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {isMobileMenuOpen ? <X size={20} color="#6b7280" /> : <Menu size={20} color="#6b7280" />}
            </button>
          </div>
        </div>

        {/* Divider (hidden on mobile when menu closed) */}
        <div
          className="app-header-divider"
          style={{
            height: 1,
            backgroundColor: '#f3f4f6',
            margin: '0 24px',
          }}
        />

        {/* Row 2: Tab Navigation (desktop) */}
        <div
          className="app-header-tabs-desktop"
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '6px 24px 8px',
          }}
        >
          <nav style={{
            display: 'flex',
            gap: 8,
          }}>
            {tabs.map((tab) => {
              const isActive = tab.name === activeTab;
              return (
                <a
                  key={tab.name}
                  href={tab.href}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '9999px',
                    fontSize: 13,
                    fontWeight: 500,
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                    backgroundColor: isActive ? '#021048' : 'transparent',
                    color: isActive ? '#fff' : '#6b7280',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                      e.currentTarget.style.color = '#1f2937';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#6b7280';
                    }
                  }}
                >
                  {tab.name}
                </a>
              );
            })}
          </nav>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div
            className="app-header-mobile-menu"
            style={{
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#fff',
              padding: '8px 16px 16px',
            }}
          >
            {/* Mobile Search */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#f3f4f6',
              borderRadius: '9999px',
              padding: '10px 16px',
              marginBottom: 12,
            }}>
              <Search size={18} color="#9ca3af" style={{ marginRight: 10, flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  flex: 1,
                  fontSize: 14,
                  color: '#1f2937',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Mobile Tabs */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
              {tabs.map((tab) => {
                const isActive = tab.name === activeTab;
                return (
                  <a
                    key={tab.name}
                    href={tab.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 10,
                      fontSize: 15,
                      fontWeight: 500,
                      textDecoration: 'none',
                      backgroundColor: isActive ? '#021048' : 'transparent',
                      color: isActive ? '#fff' : '#374151',
                    }}
                  >
                    {tab.name}
                  </a>
                );
              })}
            </nav>

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
                padding: '12px 16px',
                border: 'none',
                borderRadius: 10,
                backgroundColor: '#f3f4f6',
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

      {/* Responsive Styles */}
      <style jsx global>{`
        @media (max-width: 768px) {
          .app-header-search {
            display: none !important;
          }
          .app-header-user-desktop {
            display: none !important;
          }
          .app-header-mobile-btn {
            display: flex !important;
          }
          .app-header-tabs-desktop {
            display: none !important;
          }
          .app-header-divider {
            display: none !important;
          }
          .app-header-row1 {
            padding: 12px 16px !important;
          }
        }
      `}</style>
    </>
  );
}
