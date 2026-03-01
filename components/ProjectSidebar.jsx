'use client';
import { useState, useEffect } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, BarChart3, DollarSign, BookOpen, Users, FileText, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import ClaimStepper from './ClaimStepper';

const SIDEBAR_WIDTH = 220;

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'timeline', label: 'Evidence Timeline', icon: BarChart3 },
  { key: 'costs', label: 'Costs', icon: DollarSign },
  { key: 'knowledge', label: 'Knowledge', icon: BookOpen },
  { key: 'jira', label: 'Jira Records', icon: Search },
  { key: 'team', label: 'Team', icon: Users },
];

export default function ProjectSidebar({ token, projectName, stepperData }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const currentView = searchParams.get('view') || 'dashboard';
  const isMainPage = pathname === `/p/${token}`;

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setCollapsed(true);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleNavClick = (key) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === 'dashboard') {
      params.delete('view');
    } else {
      params.set('view', key);
    }
    const queryString = params.toString();
    router.push(`/p/${token}${queryString ? '?' + queryString : ''}`, { scroll: false });
    if (isMobile) setCollapsed(true);
  };

  return (
    <>
      {/* Mobile toggle button */}
      {isMobile && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            position: 'fixed',
            top: 64,
            left: collapsed ? 8 : SIDEBAR_WIDTH + 8,
            zIndex: 40,
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '1px solid #e5e5e5',
            backgroundColor: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            transition: 'left 0.2s ease',
          }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      )}

      <aside style={{
        width: collapsed ? 0 : SIDEBAR_WIDTH,
        minWidth: collapsed ? 0 : SIDEBAR_WIDTH,
        borderRight: collapsed ? 'none' : '1px solid #e5e5e5',
        backgroundColor: '#FAFAFA',
        transition: 'width 0.2s ease, min-width 0.2s ease',
        overflow: 'hidden',
        minHeight: 'calc(100vh - 56px)',
        position: isMobile ? 'fixed' : 'relative',
        top: isMobile ? 56 : undefined,
        left: 0,
        zIndex: isMobile ? 35 : undefined,
      }}>
        <div style={{ padding: '16px 0', width: SIDEBAR_WIDTH }}>
          {/* Project name */}
          {projectName && (
            <div style={{
              padding: '0 16px 12px',
              fontSize: 13,
              fontWeight: 600,
              color: '#1a1a1a',
              borderBottom: '1px solid #e5e5e5',
              marginBottom: 8,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {projectName}
            </div>
          )}

          {/* Claim Progress Stepper */}
          {stepperData && stepperData.length > 0 && (
            <div style={{ borderBottom: '1px solid #e5e5e5', marginBottom: 8 }}>
              <ClaimStepper
                steps={stepperData}
                token={token}
                onNavigate={(nav) => {
                  if (nav.href) {
                    router.push(nav.href);
                  } else if (nav.view) {
                    handleNavClick(nav.view);
                    if (nav.scrollTo) {
                      setTimeout(() => {
                        document.getElementById(nav.scrollTo)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }, 150);
                    }
                  }
                }}
              />
            </div>
          )}

          {/* Nav items */}
          <nav>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = isMainPage && currentView === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => handleNavClick(item.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: isActive ? '#021048' : 'transparent',
                    color: isActive ? '#fff' : '#374151',
                    fontSize: 14,
                    fontWeight: 500,
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease, color 0.15s ease',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <Icon size={16} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Claim Pack link */}
          <div style={{
            borderTop: '1px solid #e5e5e5',
            marginTop: 16,
            paddingTop: 8,
          }}>
            <a
              href={`/p/${token}/pack`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 16px',
                fontSize: 13,
                color: '#6b7280',
                textDecoration: 'none',
                fontWeight: 500,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <FileText size={16} />
              Claim Pack
            </a>
          </div>

          {/* Desktop collapse toggle */}
          {!isMobile && (
            <div style={{
              borderTop: '1px solid #e5e5e5',
              marginTop: 16,
              paddingTop: 8,
            }}>
              <button
                onClick={() => setCollapsed(!collapsed)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 16px',
                  border: 'none',
                  background: 'transparent',
                  color: '#9ca3af',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <ChevronLeft size={14} />
                Collapse
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Desktop collapsed state: thin strip with expand button */}
      {!isMobile && collapsed && (
        <div style={{
          width: 40,
          minWidth: 40,
          borderRight: '1px solid #e5e5e5',
          backgroundColor: '#FAFAFA',
          minHeight: 'calc(100vh - 56px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 12,
        }}>
          <button
            onClick={() => setCollapsed(false)}
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              border: '1px solid #e5e5e5',
              backgroundColor: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Expand sidebar"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Mobile overlay */}
      {isMobile && !collapsed && (
        <div
          onClick={() => setCollapsed(true)}
          style={{
            position: 'fixed',
            top: 56,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
            zIndex: 30,
          }}
        />
      )}
    </>
  );
}
