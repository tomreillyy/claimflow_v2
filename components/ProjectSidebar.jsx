'use client';
import { useState, useEffect } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';

const NAVY = '#021048';
const W = 210;

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
};

export default function ProjectSidebar({ token, projectName, stepperData = [] }) {
  const searchParams = useSearchParams();
  const pathname    = usePathname();
  const router      = useRouter();

  const [isMobile,   setIsMobile]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentView = searchParams.get('view') || 'dashboard';
  const isMain      = pathname === `/p/${token}`;

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
  const nextStep = stepperData.find(s => !s.complete);

  const isActiveKey = (key) => {
    if (key === 'pack-link') return pathname === `/p/${token}/pack`;
    return isMain && currentView === key;
  };

  const initials = (projectName || 'P')
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase())
    .join('');

  const NavItem = ({ label, viewKey, icon }) => {
    const active = isActiveKey(viewKey);
    return (
      <button
        onClick={() => go(viewKey)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          width: '100%', textAlign: 'left',
          padding: '7px 14px', fontSize: 13,
          fontWeight: active ? 600 : 400,
          color: active ? '#111827' : '#6b7280',
          background: active ? '#f3f4f6' : 'transparent',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer', fontFamily: 'inherit',
          transition: 'all 0.12s',
          margin: '1px 8px',
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
        {label}
      </button>
    );
  };

  const sidebar = (
    <div style={{
      width: W, display: 'flex', flexDirection: 'column', height: '100%',
      background: 'white', borderRight: '1px solid #f0f0f0',
    }}>

      {/* Project identity */}
      <div style={{
        padding: '12px 16px 10px', display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid #f0f0f0',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          backgroundColor: NAVY,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: 12, fontWeight: 700,
          flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: '#111827',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {projectName || 'Your project'}
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>
            FY{currentFY()} · R&D claim
          </div>
        </div>
      </div>

      {/* Progress */}
      {total > 0 && (
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
      <nav style={{ padding: '4px 0', flex: 1, overflowY: 'auto' }}>
        <NavItem label="Dashboard"       viewKey="dashboard"  icon={NAV_ICONS.dashboard} />
        <NavItem label="Workspace"       viewKey="workspace"  icon={NAV_ICONS.workspace} />
        <NavItem label="Project Details"  viewKey="details"    icon={NAV_ICONS.details} />
        <NavItem label="Activities"       viewKey="activities" icon={NAV_ICONS.activities} />
        <NavItem label="Costs"            viewKey="costs"      icon={NAV_ICONS.costs} />
        <NavItem label="Claim Pack"       viewKey="pack-link"  icon={NAV_ICONS.pack} />

        <div style={{ margin: '6px 14px', borderTop: '1px solid #f0f0f0' }} />

        <NavItem label="Evidence"        viewKey="timeline"   icon={NAV_ICONS.timeline} />
        <NavItem label="Project Team"    viewKey="team"       icon={NAV_ICONS.team} />
        <NavItem label="Documents"       viewKey="knowledge"  icon={NAV_ICONS.knowledge} />
        <NavItem label="Integrations"    viewKey="records"    icon={NAV_ICONS.records} />
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
            left: mobileOpen ? W + 8 : 8,
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
              width: W, height: 'calc(100vh - 56px)',
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
      overflowY: 'auto',
      display: 'flex', flexDirection: 'column',
    }}>
      {sidebar}
    </aside>
  );
}
