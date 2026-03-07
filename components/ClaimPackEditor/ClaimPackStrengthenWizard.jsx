'use client';

import { useState, useEffect } from 'react';
import { SECTION_KEYS, SECTION_NAMES } from '@/lib/claimFlowMasterContext';
import { supabase } from '@/lib/supabaseClient';

// Only sections with meaningful AI analysis
const STRENGTHEN_SECTIONS = [
  SECTION_KEYS.PROJECT_OVERVIEW,
  SECTION_KEYS.CORE_ACTIVITIES,
  SECTION_KEYS.SUPPORTING_ACTIVITIES,
  SECTION_KEYS.RD_BOUNDARY,
];

const SIDEBAR_LABELS = {
  [SECTION_KEYS.PROJECT_OVERVIEW]: 'Project Overview',
  [SECTION_KEYS.CORE_ACTIVITIES]: 'Core Activities',
  [SECTION_KEYS.SUPPORTING_ACTIVITIES]: 'Supporting Activities',
  [SECTION_KEYS.RD_BOUNDARY]: 'R&D vs Non-R&D',
};

const SECTION_DESCRIPTIONS = {
  [SECTION_KEYS.PROJECT_OVERVIEW]: 'Checking for: prior knowledge search documentation, specific sources reviewed, and competent professional test explanation.',
  [SECTION_KEYS.CORE_ACTIVITIES]: 'Checking for: failed or partial experimental results, technical vs commercial outcome framing, and missing hypothesis/conclusion pairs.',
  [SECTION_KEYS.SUPPORTING_ACTIVITIES]: 'Checking for: test infrastructure, instrumentation, data preparation, and tooling built to enable experiments.',
  [SECTION_KEYS.RD_BOUNDARY]: 'Checking for: specific excluded BAU items, software exclusion assessment, and concrete delineation from R&D work.',
};

export default function ClaimPackStrengthenWizard({ project, sections, onClose }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  // sectionStates: { [sectionKey]: { status: idle|loading|done|error, suggestions, appliedIds, message, error } }
  const [sectionStates, setSectionStates] = useState({});
  const [applyingId, setApplyingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [draftingId, setDraftingId] = useState(null);

  const currentKey = STRENGTHEN_SECTIONS[currentIdx];
  const allDone = currentIdx >= STRENGTHEN_SECTIONS.length;

  // Auto-analyse when navigating to a section
  useEffect(() => {
    if (!currentKey || sectionStates[currentKey]) return;
    analyseSection(currentKey);
  }, [currentKey]);

  const analyseSection = async (sectionKey) => {
    setSectionStates(prev => ({ ...prev, [sectionKey]: { status: 'loading' } }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentContent = sections[sectionKey]?.initialContent || '';
      const res = await fetch(`/api/projects/${project.project_token}/claim-pack/strengthen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ sectionKey, currentContent }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setSectionStates(prev => ({
        ...prev,
        [sectionKey]: {
          status: 'done',
          suggestions: data.suggestions || [],
          message: data.message || null,
          appliedIds: new Set(),
        },
      }));
    } catch (e) {
      setSectionStates(prev => ({ ...prev, [sectionKey]: { status: 'error', error: e.message } }));
    }
  };

  const applyImprovement = async (sectionKey, sugg) => {
    setApplyingId(sugg.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const existingContent = sections[sectionKey]?.initialContent || '';
      const draftHtml = sugg.draftContent.startsWith('<')
        ? sugg.draftContent
        : `<p>${sugg.draftContent}</p>`;
      const newContent = existingContent ? existingContent + '\n' + draftHtml : draftHtml;

      const res = await fetch(`/api/claim-pack-sections/${project.id}/${sectionKey}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ content: newContent }),
      });
      if (!res.ok) throw new Error('Save failed');

      setSectionStates(prev => ({
        ...prev,
        [sectionKey]: {
          ...prev[sectionKey],
          appliedIds: new Set([...(prev[sectionKey]?.appliedIds || []), sugg.id]),
        },
      }));
    } catch (e) {
      console.error('[strengthen wizard] apply error:', e);
    } finally {
      setApplyingId(null);
    }
  };

  const handleDraftFromAnswers = async (sectionKey, sugg) => {
    setDraftingId(sugg.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const suggAnswers = answers[sugg.id] || {};
      const res = await fetch(`/api/projects/${project.project_token}/claim-pack/strengthen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ action: 'draft', suggestion: sugg, answers: suggAnswers }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      if (data.draftContent) {
        setSectionStates(prev => ({
          ...prev,
          [sectionKey]: {
            ...prev[sectionKey],
            suggestions: prev[sectionKey].suggestions.map(s =>
              s.id === sugg.id ? { ...s, draftContent: data.draftContent } : s
            ),
          },
        }));
      }
    } catch (e) {
      console.error('[strengthen wizard] draft error:', e);
    } finally {
      setDraftingId(null);
    }
  };

  const setAnswer = (suggId, qIndex, value) => {
    setAnswers(prev => ({
      ...prev,
      [suggId]: { ...(prev[suggId] || {}), [`q${qIndex}`]: value },
    }));
  };

  const getSectionStatus = (key) => {
    const s = sectionStates[key];
    if (!s) return 'pending';
    if (s.status === 'loading') return 'loading';
    if (s.status === 'error') return 'error';
    if (s.status === 'done') {
      if (s.appliedIds?.size > 0) return 'improved';
      return s.suggestions?.length > 0 ? 'suggestions' : 'clean';
    }
    return 'pending';
  };

  const totalApplied = Object.values(sectionStates)
    .reduce((sum, s) => sum + (s.appliedIds?.size || 0), 0);

  const currentState = sectionStates[currentKey] || {};

  // ── Sidebar step indicator ───────────────────────────────────────────────────
  const statusIcon = (key) => {
    const st = getSectionStatus(key);
    if (st === 'improved') return { icon: '✓', bg: '#10b981', color: 'white' };
    if (st === 'clean') return { icon: '✓', bg: '#d1fae5', color: '#10b981' };
    if (st === 'error') return { icon: '!', bg: '#fee2e2', color: '#ef4444' };
    if (st === 'loading') return { icon: '…', bg: '#dbeafe', color: '#1d4ed8' };
    if (st === 'suggestions') return { icon: '●', bg: '#fef3c7', color: '#d97706' };
    const i = STRENGTHEN_SECTIONS.indexOf(key) + 1;
    return { icon: String(i), bg: '#f3f4f6', color: '#9ca3af' };
  };

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

      {/* SIDEBAR */}
      <aside style={{
        width: 216,
        flexShrink: 0,
        position: 'sticky',
        top: 80,
        maxHeight: 'calc(100vh - 92px)',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>

        {/* Header card */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: 14,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 2 }}>
            Strengthen claim pack
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>
            Reviewing {STRENGTHEN_SECTIONS.length} sections for gaps
          </div>
          {totalApplied > 0 && (
            <div style={{ fontSize: 11, color: '#10b981', marginTop: 4 }}>
              {totalApplied} improvement{totalApplied !== 1 ? 's' : ''} applied
            </div>
          )}
        </div>

        {/* Section nav */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          overflow: 'hidden',
        }}>
          {STRENGTHEN_SECTIONS.map((key, i) => {
            const si = statusIcon(key);
            const isCurrent = key === currentKey && !allDone;
            return (
              <button
                key={key}
                onClick={() => setCurrentIdx(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  borderBottom: i < STRENGTHEN_SECTIONS.length - 1 ? '1px solid #f9fafb' : 'none',
                  backgroundColor: isCurrent ? '#f0f4ff' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'system-ui',
                }}
                onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.backgroundColor = isCurrent ? '#f0f4ff' : 'transparent'; }}
              >
                <span style={{
                  width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700,
                  backgroundColor: isCurrent ? '#021048' : si.bg,
                  color: isCurrent ? 'white' : si.color,
                }}>
                  {isCurrent ? i + 1 : si.icon}
                </span>
                <span style={{
                  fontSize: 12,
                  color: isCurrent ? '#021048' : '#374151',
                  fontWeight: isCurrent ? 500 : 400,
                  lineHeight: 1.3,
                }}>
                  {SIDEBAR_LABELS[key]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Back to editor */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '8px 0',
            backgroundColor: 'transparent',
            color: '#6b7280',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: 'system-ui',
          }}
        >
          ← Back to editor
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {allDone ? (
          /* ── DONE STATE ── */
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: '48px 24px',
            textAlign: 'center',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              backgroundColor: totalApplied > 0 ? '#10b981' : '#f3f4f6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', fontSize: 22,
              color: totalApplied > 0 ? 'white' : '#9ca3af',
            }}>
              ✓
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
              {totalApplied > 0
                ? `${totalApplied} improvement${totalApplied !== 1 ? 's' : ''} applied`
                : 'Review complete'}
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', maxWidth: 360, margin: '0 auto 24px', lineHeight: 1.6 }}>
              {totalApplied > 0
                ? 'Your claim pack has been updated. The editor will reload to show all changes.'
                : 'No improvements were applied. You can return to the editor.'}
            </div>
            <button
              onClick={() => totalApplied > 0 ? window.location.reload() : onClose()}
              style={{
                padding: '10px 28px',
                backgroundColor: '#021048',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'system-ui',
              }}
            >
              {totalApplied > 0 ? 'View updated claim pack →' : 'Back to editor →'}
            </button>
          </div>

        ) : (
          /* ── SECTION CARD ── */
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid #f3f4f6',
              backgroundColor: '#fafafa',
            }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>
                  {SECTION_NAMES[currentKey]}
                </h2>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                  Section {currentIdx + 1} of {STRENGTHEN_SECTIONS.length}
                </div>
              </div>
              {currentState.status === 'done' && currentState.appliedIds?.size > 0 && (
                <span style={{
                  fontSize: 11, color: '#10b981', backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0', padding: '3px 8px', borderRadius: 4, fontWeight: 500,
                }}>
                  ✓ {currentState.appliedIds.size} applied
                </span>
              )}
            </div>

            {/* Body */}
            <div style={{ padding: '20px' }}>

              {/* What we're checking */}
              {currentState.status !== 'error' && (
                <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 20px', lineHeight: 1.6, fontStyle: 'italic' }}>
                  {SECTION_DESCRIPTIONS[currentKey]}
                </p>
              )}

              {/* Loading */}
              {currentState.status === 'loading' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 0', color: '#6b7280', fontSize: 13 }}>
                  <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                  Analysing section against your evidence…
                </div>
              )}

              {/* Error */}
              {currentState.status === 'error' && (
                <div style={{
                  padding: '12px 14px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 6,
                  color: '#991b1b',
                  fontSize: 13,
                  marginBottom: 16,
                }}>
                  {currentState.error} —{' '}
                  <button
                    onClick={() => { setSectionStates(prev => { const n = {...prev}; delete n[currentKey]; return n; }); }}
                    style={{ background: 'none', border: 'none', color: '#991b1b', textDecoration: 'underline', cursor: 'pointer', fontSize: 13, fontFamily: 'system-ui', padding: 0 }}
                  >
                    retry
                  </button>
                </div>
              )}

              {/* No suggestions */}
              {currentState.status === 'done' && currentState.suggestions?.length === 0 && (
                <div style={{
                  padding: '14px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 6,
                  color: '#166534',
                  fontSize: 13,
                  marginBottom: 16,
                }}>
                  ✓ No gaps detected — this section looks strong.
                  {currentState.message && <span style={{ color: '#6b7280' }}> {currentState.message}</span>}
                </div>
              )}

              {/* Suggestion cards */}
              {currentState.status === 'done' && currentState.suggestions?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  {currentState.suggestions.map((sugg) => {
                    const isApplied = currentState.appliedIds?.has(sugg.id);
                    const isExpanded = expandedId === sugg.id;
                    const isDrafting = draftingId === sugg.id;
                    const isApplying = applyingId === sugg.id;
                    const suggAnswers = answers[sugg.id] || {};
                    const hasAnswers = Object.values(suggAnswers).some(v => v?.trim());

                    return (
                      <div
                        key={sugg.id}
                        style={{
                          border: `1px solid ${isApplied ? '#bbf7d0' : '#e5e7eb'}`,
                          borderRadius: 6,
                          overflow: 'hidden',
                          marginBottom: 10,
                          backgroundColor: isApplied ? '#f0fdf4' : 'white',
                        }}
                      >
                        {/* Suggestion header */}
                        <div style={{ padding: '12px 14px' }}>
                          <div style={{
                            fontWeight: 600,
                            fontSize: 13,
                            color: isApplied ? '#166534' : '#111827',
                            marginBottom: 4,
                          }}>
                            {isApplied ? '✓ ' : ''}{sugg.title}
                          </div>
                          <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.55 }}>
                            {sugg.rationale}
                          </div>
                        </div>

                        {/* Draft preview */}
                        {!isApplied && (
                          <div style={{
                            margin: '0 14px 12px',
                            padding: '8px 10px',
                            backgroundColor: '#f9fafb',
                            border: '1px solid #f3f4f6',
                            borderRadius: 4,
                            fontSize: 12,
                            color: '#374151',
                            lineHeight: 1.6,
                            fontStyle: 'italic',
                          }}>
                            {sugg.draftContent.substring(0, 220)}{sugg.draftContent.length > 220 ? '…' : ''}
                          </div>
                        )}

                        {/* Action buttons */}
                        {!isApplied && (
                          <div style={{ padding: '0 14px 12px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                            <button
                              onClick={() => applyImprovement(currentKey, sugg)}
                              disabled={!!applyingId || !!draftingId}
                              style={{
                                padding: '6px 14px',
                                backgroundColor: isApplying ? '#9ca3af' : '#021048',
                                color: 'white',
                                border: 'none',
                                borderRadius: 4,
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: isApplying ? 'not-allowed' : 'pointer',
                                fontFamily: 'system-ui',
                              }}
                            >
                              {isApplying ? 'Applying…' : 'Apply improvement'}
                            </button>

                            {sugg.questions?.length > 0 && (
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : sugg.id)}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: 'transparent',
                                  color: '#6b7280',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: 4,
                                  fontSize: 12,
                                  cursor: 'pointer',
                                  fontFamily: 'system-ui',
                                }}
                              >
                                {isExpanded ? 'Hide questions ▲' : 'Customise ▾'}
                              </button>
                            )}
                          </div>
                        )}

                        {/* Expanded questions */}
                        {isExpanded && !isApplied && (
                          <div style={{
                            borderTop: '1px solid #f3f4f6',
                            padding: '12px 14px',
                            backgroundColor: '#f9fafb',
                          }}>
                            <div style={{ fontSize: 12, color: '#374151', marginBottom: 10, fontWeight: 500 }}>
                              Answer these to get a more specific draft:
                            </div>
                            {sugg.questions.map((q, qi) => (
                              <div key={qi} style={{ marginBottom: 8 }}>
                                <label style={{ fontSize: 11, color: '#374151', display: 'block', marginBottom: 3 }}>
                                  {q}
                                </label>
                                <input
                                  type="text"
                                  value={suggAnswers[`q${qi}`] || ''}
                                  onChange={e => setAnswer(sugg.id, qi, e.target.value)}
                                  placeholder="Your answer…"
                                  style={{
                                    width: '100%',
                                    padding: '5px 8px',
                                    fontSize: 11,
                                    border: '1px solid #e5e7eb',
                                    borderRadius: 3,
                                    fontFamily: 'system-ui',
                                    boxSizing: 'border-box',
                                    outline: 'none',
                                  }}
                                  onFocus={e => e.target.style.borderColor = '#021048'}
                                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                                />
                              </div>
                            ))}
                            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                              <button
                                onClick={() => handleDraftFromAnswers(currentKey, sugg)}
                                disabled={isDrafting || !hasAnswers}
                                style={{
                                  padding: '5px 12px',
                                  backgroundColor: isDrafting || !hasAnswers ? '#9ca3af' : '#1d4ed8',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: 3,
                                  fontSize: 11,
                                  fontWeight: 500,
                                  cursor: isDrafting || !hasAnswers ? 'not-allowed' : 'pointer',
                                  fontFamily: 'system-ui',
                                }}
                              >
                                {isDrafting ? 'Writing draft…' : 'Generate specific draft'}
                              </button>
                              <span style={{ fontSize: 11, color: '#9ca3af' }}>then click Apply</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Navigation */}
              {currentState.status === 'done' && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    onClick={() => setCurrentIdx(i => i + 1)}
                    style={{
                      padding: '9px 18px',
                      backgroundColor: '#021048',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'system-ui',
                    }}
                  >
                    {currentIdx < STRENGTHEN_SECTIONS.length - 1
                      ? `Next: ${SIDEBAR_LABELS[STRENGTHEN_SECTIONS[currentIdx + 1]]} →`
                      : 'Finish review →'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
