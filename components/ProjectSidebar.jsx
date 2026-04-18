'use client';
import { useState, useEffect } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';

const NAVY = '#021048';
const W = 220;

// Australian FY: ends 30 June, so March 2026 → FY2026
function currentFY() {
  const now = new Date();
  return now.getMonth() < 6 ? now.getFullYear() : now.getFullYear() + 1;
}

// Simple icon components (inline SVG-like spans)
const ICONS = {
  dashboard:    '◫',
  workspace:    '⬡',
  details:      '☰',
  activities:   '◉',
  costs:        '◎',
  pack:         '▤',
  timeline:     '◷',
  team:         '⊡',
  knowledge:    '▧',
  records:      '⬢',
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

  const isActive = (key) => isMain && currentView === key;

  const NavBtn = ({ label, viewKey, icon }) => {
    const active = isActive(viewKey);
    return (
      <button
        onClick={() => go(viewKey)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          width: '100%', textAlign: 'left',
          padding: '9px 20px', fontSize: 13,
          fontWeight: active ? 600 : 400,
          color: active ? 'white' : 'rgba(255,255,255,0.55)',
          background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
          border: 'none',
          borderLeft: `3px solid ${active ? 'white' : 'transparent'}`,
          cursor: 'pointer', fontFamily: 'inherit',
          transition: 'all 0.12s',
          letterSpacing: '0.01em',
        }}
        onMouseEnter={e => {
          if (!active) {
            e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            e.currentTarget.style.color = 'rgba(255,255,255,0.55)';
            e.currentTarget.style.background = 'transparent';
          }
        }}
      >
        <span style={{ fontSize: 14, width: 16, textAlign: 'center', opacity: active ? 1 : 0.5 }}>
          {icon}
        </span>
        {label}
      </button>
    );
  };

  const initials = (projectName || 'P')
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase())
    .join('');

  const body = (
    <div style={{ width: W, display: 'flex', flexDirection: 'column', height: '100%', background: NAVY }}>

      {/* Project identity */}
      <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8,
          backgroundColor: 'rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: 13, fontWeight: 700,
          flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 600, color: 'white',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {projectName || 'Your project'}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
            FY{currentFY()} · R&D claim
          </div>
        </div>
      </div>

      {/* Progress */}
      {total > 0 && (
        <div style={{
          padding: '0 20px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          marginBottom: 6,
        }}>
          <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
            {stepperData.map((step, i) => (
              <button
                key={i}
                onClick={() => goStep(step)}
                title={step.title}
                style={{
                  flex: 1, height: 3, borderRadius: 2,
                  background: step.complete ? '#16a34a' : 'rgba(255,255,255,0.12)',
                  border: 'none', padding: 0, cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              />
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
            {done === total
              ? 'All steps complete'
              : `${done} of ${total} steps complete`}
          </div>
          {nextStep && (
            <button
              onClick={() => goStep(nextStep)}
              style={{
                display: 'block', marginTop: 4, fontSize: 11,
                color: 'rgba(255,255,255,0.6)', background: 'none', border: 'none',
                cursor: 'pointer', padding: 0, textAlign: 'left',
                fontFamily: 'inherit', fontWeight: 500,
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'white'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
            >
              Next: {nextStep.title} →
            </button>
          )}
        </div>
      )}

      {/* Nav */}
      <nav style={{ padding: '4px 0', flex: 1, overflowY: 'auto' }}>
        <NavBtn label="Dashboard"       viewKey="dashboard"  icon={ICONS.dashboard} />
        <NavBtn label="Workspace"       viewKey="workspace"  icon={ICONS.workspace} />
        <NavBtn label="Project Details"  viewKey="details"    icon={ICONS.details} />
        <NavBtn label="Activities"       viewKey="activities" icon={ICONS.activities} />
        <NavBtn label="Costs"            viewKey="costs"      icon={ICONS.costs} />
        <NavBtn label="Claim Pack"       viewKey="pack-link"  icon={ICONS.pack} />

        <div style={{ margin: '8px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }} />

        <NavBtn label="Evidence"        viewKey="timeline"   icon={ICONS.timeline} />
        <NavBtn label="Project Team"    viewKey="team"       icon={ICONS.team} />
        <NavBtn label="Documents"       viewKey="knowledge"  icon={ICONS.knowledge} />
        <NavBtn label="Integrations"    viewKey="records"    icon={ICONS.records} />
      </nav>
    </div>
  );

  // Claim Pack link override — it's an <a> to a separate page
  // We override the NavBtn click for 'pack-link' in go()
  const originalGo = go;
  const goWithPackOverride = (key) => {
    if (key === 'pack-link') {
      router.push(`/p/${token}/pack`);
      if (isMobile) setMobileOpen(false);
      return;
    }
    originalGo(key);
  };

  // Re-wrap NavBtn to use the override
  const NavBtnWrapped = ({ label, viewKey, icon }) => {
    const active = viewKey === 'pack-link'
      ? pathname === `/p/${token}/pack`
      : isActive(viewKey);
    return (
      <button
        onClick={() => goWithPackOverride(viewKey)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          width: '100%', textAlign: 'left',
          padding: '9px 20px', fontSize: 13,
          fontWeight: active ? 600 : 400,
          color: active ? 'white' : 'rgba(255,255,255,0.55)',
          background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
          border: 'none',
          borderLeft: `3px solid ${active ? 'white' : 'transparent'}`,
          cursor: 'pointer', fontFamily: 'inherit',
          transition: 'all 0.12s',
          letterSpacing: '0.01em',
        }}
        onMouseEnter={e => {
          if (!active) {
            e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            e.currentTarget.style.color = 'rgba(255,255,255,0.55)';
            e.currentTarget.style.background = 'transparent';
          }
        }}
      >
        <span style={{ fontSize: 14, width: 16, textAlign: 'center', opacity: active ? 1 : 0.5 }}>
          {icon}
        </span>
        {label}
      </button>
    );
  };

  const bodyFinal = (
    <div style={{ width: W, display: 'flex', flexDirection: 'column', height: '100%', background: NAVY }}>

      {/* Project identity */}
      <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8,
          backgroundColor: 'rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: 13, fontWeight: 700,
          flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: 14, fontWeight: 600, color: 'white',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {projectName || 'Your project'}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
            FY{currentFY()} · R&D claim
          </div>
        </div>
      </div>

      {/* Progress */}
      {total > 0 && (
        <div style={{
          padding: '0 20px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          marginBottom: 6,
        }}>
          <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
            {stepperData.map((step, i) => (
              <button
                key={i}
                onClick={() => goStep(step)}
                title={step.title}
                style={{
                  flex: 1, height: 3, borderRadius: 2,
                  background: step.complete ? '#16a34a' : 'rgba(255,255,255,0.12)',
                  border: 'none', padding: 0, cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              />
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
            {done === total
              ? 'All steps complete'
              : `${done} of ${total} steps complete`}
          </div>
          {nextStep && (
            <button
              onClick={() => goStep(nextStep)}
              style={{
                display: 'block', marginTop: 4, fontSize: 11,
                color: 'rgba(255,255,255,0.6)', background: 'none', border: 'none',
                cursor: 'pointer', padding: 0, textAlign: 'left',
                fontFamily: 'inherit', fontWeight: 500,
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'white'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
            >
              Next: {nextStep.title} →
            </button>
          )}
        </div>
      )}

      {/* Nav */}
      <nav style={{ padding: '4px 0', flex: 1, overflowY: 'auto' }}>
        <NavBtnWrapped label="Dashboard"       viewKey="dashboard"  icon={ICONS.dashboard} />
        <NavBtnWrapped label="Workspace"       viewKey="workspace"  icon={ICONS.workspace} />
        <NavBtnWrapped label="Project Details"  viewKey="details"    icon={ICONS.details} />
        <NavBtnWrapped label="Activities"       viewKey="activities" icon={ICONS.activities} />
        <NavBtnWrapped label="Costs"            viewKey="costs"      icon={ICONS.costs} />
        <NavBtnWrapped label="Claim Pack"       viewKey="pack-link"  icon={ICONS.pack} />

        <div style={{ margin: '8px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }} />

        <NavBtnWrapped label="Evidence"        viewKey="timeline"   icon={ICONS.timeline} />
        <NavBtnWrapped label="Project Team"    viewKey="team"       icon={ICONS.team} />
        <NavBtnWrapped label="Documents"       viewKey="knowledge"  icon={ICONS.knowledge} />
        <NavBtnWrapped label="Integrations"    viewKey="records"    icon={ICONS.records} />
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
              background: NAVY,
              overflowY: 'auto',
            }}>
              {bodyFinal}
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
      backgroundColor: NAVY,
      height: 'calc(100vh - 56px)',
      position: 'sticky', top: 56,
      overflowY: 'auto',
      display: 'flex', flexDirection: 'column',
    }}>
      {bodyFinal}
    </aside>
  );
}
