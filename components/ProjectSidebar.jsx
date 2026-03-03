'use client';
import { useState, useEffect } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';

const NAVY = '#021048';
const W = 204;

// Australian FY: ends 30 June, so March 2026 → FY2026
function currentFY() {
  const now = new Date();
  return now.getMonth() < 6 ? now.getFullYear() : now.getFullYear() + 1;
}

const MORE_ITEMS = [
  { label: 'Evidence',        key: 'timeline' },
  { label: 'Project Details', key: 'details'  },
  { label: 'Team',            key: 'team'     },
  { label: 'Documents',       key: 'knowledge'},
  { label: 'Integrations',    key: 'records'  },
];

export default function ProjectSidebar({ token, projectName, stepperData = [] }) {
  const searchParams = useSearchParams();
  const pathname    = usePathname();
  const router      = useRouter();

  const [showMore,    setShowMore]    = useState(false);
  const [isMobile,    setIsMobile]    = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);

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

  // Auto-open More if the current view is a More item
  useEffect(() => {
    if (MORE_ITEMS.some(i => i.key === currentView)) setShowMore(true);
  }, [currentView]);

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

  const done      = stepperData.filter(s => s.complete).length;
  const total     = stepperData.length;
  const nextStep  = stepperData.find(s => !s.complete);
  const pct       = total ? Math.round((done / total) * 100) : 0;

  const isActive = (key) => isMain && currentView === key;

  const NavBtn = ({ label, viewKey, suffix }) => {
    const active = isActive(viewKey);
    return (
      <button
        onClick={() => go(viewKey)}
        style={{
          display: 'block', width: '100%', textAlign: 'left',
          padding: '8px 16px', fontSize: 13,
          fontWeight: active ? 600 : 400,
          color: active ? NAVY : '#374151',
          background: active ? '#eef2ff' : 'none',
          border: 'none',
          borderLeft: `3px solid ${active ? NAVY : 'transparent'}`,
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        {label}{suffix && <span style={{ marginLeft: 4, opacity: 0.5 }}>{suffix}</span>}
      </button>
    );
  };

  const body = (
    <div style={{ width: W, display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Project name */}
      <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: '#111827',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {projectName || 'Your project'}
        </div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
          FY{currentFY()} · R&D claim
        </div>
      </div>

      {/* Progress */}
      {total > 0 && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
          {/* Segmented bar */}
          <div style={{ display: 'flex', gap: 3, marginBottom: 7 }}>
            {stepperData.map((step, i) => (
              <button
                key={i}
                onClick={() => goStep(step)}
                title={step.title}
                style={{
                  flex: 1, height: 4, borderRadius: 2,
                  background: step.complete ? '#16a34a' : '#e5e7eb',
                  border: 'none', padding: 0, cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              />
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>
            {done === total
              ? 'All steps complete — ready to submit'
              : `${done} of ${total} steps complete`}
          </div>
          {nextStep && (
            <button
              onClick={() => goStep(nextStep)}
              style={{
                display: 'block', marginTop: 6, fontSize: 11,
                color: NAVY, background: 'none', border: 'none',
                cursor: 'pointer', padding: 0, textAlign: 'left',
                fontFamily: 'inherit', fontWeight: 500,
              }}
            >
              Next: {nextStep.title} →
            </button>
          )}
        </div>
      )}

      {/* Primary nav */}
      <nav style={{ padding: '6px 0', flex: 1 }}>
        <NavBtn label="Activities" viewKey="activities" />
        <NavBtn label="Costs"      viewKey="costs" />
        <a
          href={`/p/${token}/pack`}
          style={{
            display: 'block', padding: '8px 16px', fontSize: 13,
            color: '#374151', textDecoration: 'none', fontFamily: 'inherit',
            borderLeft: '3px solid transparent',
          }}
          onMouseEnter={e => e.currentTarget.style.color = NAVY}
          onMouseLeave={e => e.currentTarget.style.color = '#374151'}
        >
          Claim Pack <span style={{ opacity: 0.45 }}>↗</span>
        </a>
      </nav>

      {/* More */}
      <div style={{ borderTop: '1px solid #f0f0f0' }}>
        <button
          onClick={() => setShowMore(m => !m)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', padding: '9px 16px', fontSize: 12, color: '#9ca3af',
            background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <span>More</span>
          <span style={{ fontSize: 8, marginTop: 1 }}>{showMore ? '▲' : '▼'}</span>
        </button>
        {showMore && (
          <div style={{ paddingBottom: 8 }}>
            {MORE_ITEMS.map(item => {
              const active = isActive(item.key);
              return (
                <button
                  key={item.key}
                  onClick={() => go(item.key)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '6px 16px 6px 26px', fontSize: 12,
                    color: active ? NAVY : '#6b7280',
                    fontWeight: active ? 600 : 400,
                    background: active ? '#eef2ff' : 'none',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    borderLeft: `3px solid ${active ? NAVY : 'transparent'}`,
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
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
              background: 'white', borderRight: '1px solid #e5e5e5',
              overflowY: 'auto',
            }}>
              {body}
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
      borderRight: '1px solid #e5e5e5',
      backgroundColor: 'white',
      height: 'calc(100vh - 56px)',
      position: 'sticky', top: 56,
      overflowY: 'auto',
      display: 'flex', flexDirection: 'column',
    }}>
      {body}
    </aside>
  );
}
