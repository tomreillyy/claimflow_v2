'use client';
import { useState, useEffect } from 'react';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';

export default function ClaimStepper({ steps, token, onNavigate }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`claimflow_stepper_collapsed_${token}`);
      if (stored === 'true') setCollapsed(true);
    } catch {}
  }, [token]);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(`claimflow_stepper_collapsed_${token}`, String(next));
    } catch {}
  };

  // Check localStorage for pack visited (step 6)
  const [packVisited, setPackVisited] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem(`claimflow_pack_visited_${token}`) === 'true') {
        setPackVisited(true);
      }
    } catch {}
  }, [token]);

  const resolvedSteps = steps.map((step, i) => ({
    ...step,
    complete: i === 5 ? (step.complete || packVisited) : step.complete,
  }));

  const completedCount = resolvedSteps.filter(s => s.complete).length;
  const currentIndex = resolvedSteps.findIndex(s => !s.complete);

  const handleStepClick = (step, index) => {
    // Mark pack as visited when clicking step 6
    if (index === 5) {
      try {
        localStorage.setItem(`claimflow_pack_visited_${token}`, 'true');
        setPackVisited(true);
      } catch {}
    }
    if (step.navigateTo) {
      onNavigate(step.navigateTo);
    }
  };

  const getCircleStyle = (step, index) => {
    const base = {
      width: 22,
      height: 22,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 11,
      fontWeight: 600,
      flexShrink: 0,
      transition: 'background-color 0.3s ease',
    };
    if (step.complete) {
      return { ...base, backgroundColor: '#10b981', color: '#fff' };
    }
    if (index === currentIndex) {
      return {
        ...base,
        backgroundColor: '#021048',
        color: '#fff',
        boxShadow: '0 0 0 3px rgba(2, 16, 72, 0.12)',
      };
    }
    return {
      ...base,
      backgroundColor: 'transparent',
      color: '#9ca3af',
      border: '2px solid #e5e5e5',
    };
  };

  return (
    <div style={{ padding: '8px 0 4px' }}>
      {/* Header */}
      <button
        onClick={toggleCollapse}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '4px 16px 6px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Claim Progress
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: completedCount === 6 ? '#10b981' : '#6b7280' }}>
            {completedCount}/6
          </span>
          {collapsed
            ? <ChevronRight size={14} color="#9ca3af" />
            : <ChevronDown size={14} color="#9ca3af" />
          }
        </span>
      </button>

      {/* Step list */}
      {!collapsed && (
        <div style={{ padding: '4px 0' }}>
          {resolvedSteps.map((step, i) => (
            <button
              key={i}
              onClick={() => handleStepClick(step, i)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                width: '100%',
                padding: '3px 16px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.03)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {/* Left column: circle + connector */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={getCircleStyle(step, i)}>
                  {step.complete
                    ? <Check size={12} strokeWidth={3} />
                    : step.number
                  }
                </div>
                {i < resolvedSteps.length - 1 && (
                  <div style={{
                    width: 2,
                    height: 12,
                    backgroundColor: step.complete ? '#10b981' : '#e5e5e5',
                    transition: 'background-color 0.3s ease',
                  }} />
                )}
              </div>

              {/* Right column: title + subtitle */}
              <div style={{ paddingTop: 2 }}>
                <span style={{
                  fontSize: 13,
                  fontWeight: step.complete || i === currentIndex ? 500 : 400,
                  color: step.complete ? '#374151' : i === currentIndex ? '#021048' : '#9ca3af',
                  lineHeight: 1.2,
                  display: 'block',
                }}>
                  {step.title}
                </span>
                {step.subtitle && !step.complete && (
                  <span style={{
                    fontSize: 11,
                    color: '#f59e0b',
                    lineHeight: 1.3,
                    display: 'block',
                    marginTop: 1,
                  }}>
                    {step.subtitle}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
