'use client';
import { useState, useEffect } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';

const NAVY = '#021048';
const W_EXPANDED = 210;
const W_COLLAPSED = 52;

function currentFY() {
  const now = new Date();
  return now.getMonth() < 6 ? now.getFullYear() : now.getFullYear() + 1;
}

const NAV_ICONS = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  workspace: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="3" x2="12" y2="21" />
    </svg>
  ),
  details: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="14" y2="18" />
    </svg>
  ),
  activities: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  ),
  costs: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v10M9 10h6M9 14h4" />
    </svg>
  ),
  pack: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="14" y2="17" />
    </svg>
  ),
  timeline: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  team: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  knowledge: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" /><polyline points="13 2 13 9 20 9" />
    </svg>
  ),
  records: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="18" rx="2" /><line x1="8" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="16" y2="21" /><line x1="2" y1="9" x2="22" y2="9" /><line x1="2" y1="15" x2="22" y2="15" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
  collapse: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" />
    </svg>
  ),
  expand: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" />
    </svg>
  ),
};

export default function ProjectSidebar({ token, projectName, stepperData = [] }) {
  const searchParams = useSearchParams();
  const pathname    = usePathname();
  const router      = useRouter();

  const [isMobile,   setIsMobile]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed,  setCollapsed]  = useState(false);

  const currentView = searchParams.get('view') || 'dashboard';
  const isMain      = pathname === `/p/${token}`;
  const W = collapsed ? W_COLLAPSED : W_EXPANDED;

  useEffect(() => {
    const check = () => {
      const m = window.innerWidth < 768;
      setIsMobile(m);
      if (m) setMobileOpen(false);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const go = (key) => {
    if (key === 'pack-link') {
      router.push(`/p/${token}/pack`);
      if (isMobile) setMobileOpen(false);
      return;
    }
    const p = new URLSearchParams(searchParams.toString());
    key === 'dashboard' ? p.delete('view') : p.set('view', key);
    const qs = p.toString();
    router.push(`/p/${token}${qs ? '?' + qs : ''}`, { scroll: false });
    if (isMobile) setMobileOpen(false);
  };

  const goStep = (step) => {
    if (step.navigateTo?.href)  router.push(step.navigateTo.href);
    else if (step.navigateTo?.view) go(step.navigateTo.view);
  };

  const done     = stepperData.filter(s => s.complete).length;
  const total    = stepperData.length;

  const isActiveKey = (key) => {
    if (key === 'pack-link') return pathname === `/p/${token}/pack`;
    return isMain && currentView === key;
  };

  const NavItem = ({ label, viewKey, icon }) => {
    const active = isActiveKey(viewKey);
    return (
      <button
        onClick={() => go(viewKey)}
        title={collapsed ? label : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          width: collapsed ? 36 : '100%', height: 36,
          textAlign: 'left',
          padding: collapsed ? 0 : '0 14px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          fontSize: 13,
          fontWeight: active ? 600 : 400,
          color: active ? '#111827' : '#6b7280',
          background: active ? '#f3f4f6' : 'transparent',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer', fontFamily: 'inherit',
          transition: 'all 0.12s',
          margin: collapsed ? '1px auto' : '1px 8px',
        }}
        onMouseEnter={e => {
          if (!active) {
            e.currentTarget.style.color = '#111827';
            e.currentTarget.style.background = '#f9fafb';
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            e.currentTarget.style.color = '#6b7280';
            e.currentTarget.style.background = 'transparent';
          }
        }}
      >
        <span style={{ color: active ? '#374151' : '#9ca3af', display: 'flex', flexShrink: 0 }}>
          {icon}
        </span>
        {!collapsed && label}
      </button>
    );
  };

  const sidebar = (
    <div style={{
      width: W, display: 'flex', flexDirection: 'column', height: '100%',
      background: 'white', borderRight: '1px solid #f0f0f0', overflowX: 'hidden',
      transition: 'width 0.15s ease',
    }}>

      {/* Project identity */}
      <div style={{
        padding: collapsed ? '12px 8px 10px' : '12px 16px 10px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, minHeight: 44,
      }}>
        {!collapsed && (
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontSize: 14, fontWeight: 700, color: '#111827',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {projectName || 'Your project'}
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
              FY{currentFY()} · R&D claim
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            border: 'none', background: 'none', cursor: 'pointer',
            color: '#9ca3af', display: 'flex', padding: 4, borderRadius: 4,
            flexShrink: 0,
            margin: collapsed ? '0 auto' : 0,
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#374151'}
          onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}
        >
          {collapsed ? NAV_ICONS.expand : NAV_ICONS.collapse}
        </button>
      </div>

      {/* Progress — hidden when collapsed */}
      {!collapsed && total > 0 && (
        <div style={{
          padding: '8px 16px',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
            {stepperData.map((step, i) => (
              <button
                key={i}
                onClick={() => goStep(step)}
                title={step.title}
                style={{
                  flex: 1, height: 3, borderRadius: 2,
                  background: step.complete ? '#16a34a' : '#e5e7eb',
                  border: 'none', padding: 0, cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              />
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>
            {done === total
              ? 'All steps complete'
              : `${done} of ${total} steps`}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={{ padding: '4px 0', flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <NavItem label="Dashboard"       viewKey="dashboard"  icon={NAV_ICONS.dashboard} />
        <NavItem label="Workspace"       viewKey="workspace"  icon={NAV_ICONS.workspace} />
        <NavItem label="Project Details"  viewKey="details"    icon={NAV_ICONS.details} />
        <NavItem label="Activities"       viewKey="activities" icon={NAV_ICONS.activities} />

        <div style={{ margin: collapsed ? '6px 8px' : '6px 14px', borderTop: '1px solid #f0f0f0' }} />

        <NavItem label="Integrations"    viewKey="records"    icon={NAV_ICONS.records} />

        <div style={{ margin: collapsed ? '6px 8px' : '6px 14px', borderTop: '1px solid #f0f0f0' }} />

        <NavItem label="Settings"        viewKey="settings"   icon={NAV_ICONS.settings} />
      </nav>
    </div>
  );

  /* ── Mobile ── */
  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setMobileOpen(o => !o)}
          style={{
            position: 'fixed', top: 64,
            left: mobileOpen ? W_EXPANDED + 8 : 8,
            zIndex: 40, width: 32, height: 32, borderRadius: '50%',
            border: '1px solid #e5e5e5', backgroundColor: 'white',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            transition: 'left 0.2s ease', fontSize: 14,
          }}
        >
          {mobileOpen ? '×' : '☰'}
        </button>
        {mobileOpen && (
          <>
            <aside style={{
              position: 'fixed', top: 56, left: 0, zIndex: 35,
              width: W_EXPANDED, height: 'calc(100vh - 56px)',
              background: 'white',
              overflowY: 'auto',
            }}>
              {sidebar}
            </aside>
            <div
              onClick={() => setMobileOpen(false)}
              style={{
                position: 'fixed', inset: 0, top: 56,
                background: 'rgba(0,0,0,0.3)', zIndex: 30,
              }}
            />
          </>
        )}
      </>
    );
  }

  /* ── Desktop ── */
  return (
    <aside style={{
      width: W, minWidth: W, flexShrink: 0,
      backgroundColor: 'white',
      borderRight: '1px solid #f0f0f0',
      height: 'calc(100vh - 56px)',
      position: 'sticky', top: 56,
      overflowY: 'auto', overflowX: 'hidden',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.15s ease, min-width 0.15s ease',
    }}>
      {sidebar}
    </aside>
  );
}
