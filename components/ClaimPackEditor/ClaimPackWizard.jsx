'use client';

import { useState } from 'react';
import { SECTION_KEYS, SECTION_NAMES } from '@/lib/claimFlowMasterContext';

const SECTIONS_ORDER = [
  SECTION_KEYS.PROJECT_OVERVIEW,
  SECTION_KEYS.CORE_ACTIVITIES,
  SECTION_KEYS.SUPPORTING_ACTIVITIES,
  SECTION_KEYS.EVIDENCE_INDEX,
  SECTION_KEYS.FINANCIALS,
  SECTION_KEYS.RD_BOUNDARY,
  SECTION_KEYS.OVERSEAS_CONTRACTED,
  SECTION_KEYS.REGISTRATION_TIEOUT,
  SECTION_KEYS.ATTESTATIONS,
];

const SIDEBAR_NAMES = {
  [SECTION_KEYS.PROJECT_OVERVIEW]: 'Project Overview',
  [SECTION_KEYS.CORE_ACTIVITIES]: 'Core Activities',
  [SECTION_KEYS.SUPPORTING_ACTIVITIES]: 'Supporting Activities',
  [SECTION_KEYS.EVIDENCE_INDEX]: 'Evidence Index',
  [SECTION_KEYS.FINANCIALS]: 'Financials',
  [SECTION_KEYS.RD_BOUNDARY]: 'R&D vs Non-R&D',
  [SECTION_KEYS.OVERSEAS_CONTRACTED]: 'Overseas Work',
  [SECTION_KEYS.REGISTRATION_TIEOUT]: 'Registration',
  [SECTION_KEYS.ATTESTATIONS]: 'Attestations',
};

const SECTION_DESCRIPTIONS = {
  [SECTION_KEYS.PROJECT_OVERVIEW]: 'The core technical problem, what existing solutions were reviewed and found insufficient, and why a competent professional could not have determined the outcome without experimentation.',
  [SECTION_KEYS.CORE_ACTIVITIES]: 'Detailed narrative for each core R&D activity — hypothesis, systematic work performed, failed or partial results, and what new technical knowledge was determined.',
  [SECTION_KEYS.SUPPORTING_ACTIVITIES]: 'Activities that directly enabled the core R&D work — test infrastructure, data preparation, tooling, or instrumentation built specifically to run experiments.',
  [SECTION_KEYS.EVIDENCE_INDEX]: 'Index of contemporaneous evidence records linked to R&D activities — compiled automatically from your timeline.',
  [SECTION_KEYS.FINANCIALS]: 'Summary of R&D expenditure by month and category — compiled from your cost records.',
  [SECTION_KEYS.RD_BOUNDARY]: 'Explicit delineation of what was eligible R&D versus standard BAU work — including software exclusion assessment and specific excluded items.',
  [SECTION_KEYS.OVERSEAS_CONTRACTED]: 'Declaration of any R&D conducted overseas or contracted to third parties, and whether an overseas finding applies.',
  [SECTION_KEYS.REGISTRATION_TIEOUT]: 'Tie-out confirming the claim pack narrative aligns with the activities registered with AusIndustry.',
  [SECTION_KEYS.ATTESTATIONS]: 'Attestations confirming the company meets all RDTI eligibility criteria for the claim year.',
};

// Section-specific hints about what the AI will look for
const SECTION_HINTS = {
  [SECTION_KEYS.PROJECT_OVERVIEW]: 'AI will scan your evidence for: vendor docs reviewed, standards assessed (WCAG, RFCs), open-source libraries evaluated, and why each was insufficient.',
  [SECTION_KEYS.CORE_ACTIVITIES]: 'AI will narrate each activity using your evidence — including failed attempts, unexpected results, and what was learned from each.',
  [SECTION_KEYS.SUPPORTING_ACTIVITIES]: 'AI will scan for test environments, tooling, scripts, sample data, or instrumentation set up purely to enable experiments.',
  [SECTION_KEYS.RD_BOUNDARY]: 'AI will identify production releases, deployment work, and routine maintenance from your evidence to build the exclusions list.',
};

// Evidence keyword patterns per section
const SIGNAL_PATTERNS = {
  [SECTION_KEYS.PROJECT_OVERVIEW]: /\b(review|research|vendor|docs?|standard|WCAG|prior|assess|evaluat|literature|framework|library|API|integrat|consult|existing|found|tried)\b/i,
  [SECTION_KEYS.CORE_ACTIVITIES]: /\b(fail|error|unexpected|abandon|revert|timeout|below|incorrect|invalid|retry|iterate|inconclusive|unsuccessful|attempt|trial|hypothesis|experiment|test)\b/i,
  [SECTION_KEYS.SUPPORTING_ACTIVITIES]: /\b(test\s*(env|infra|setup)|staging|mock|sample|instrument|log(ging)?|harness|fixture|dummy|scaffold|pipeline|config|set.?up)\b/i,
  [SECTION_KEYS.RD_BOUNDARY]: /\b(deploy|production|rollout|release|mainten|support|BAU|post.launch|go.live|launch|routine)\b/i,
};

function getSignalsForSection(sectionKey, evidence) {
  const pattern = SIGNAL_PATTERNS[sectionKey];
  if (!pattern || !evidence?.length) return [];
  return evidence
    .filter(e => e.content && pattern.test(e.content))
    .slice(0, 3)
    .map(e => {
      const match = e.content.match(/[^.!?\n]*(?:review|research|vendor|docs?|standard|WCAG|prior|assess|evaluat|fail|error|unexpect|abandon|test|staging|mock|instrument|deploy|production|rollout|release|mainten)[^.!?\n]*/i);
      const snippet = (match ? match[0] : e.content).trim();
      return {
        snippet: snippet.length > 115 ? snippet.slice(0, 115) + '…' : snippet,
        date: e.created_at
          ? new Date(e.created_at).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })
          : '',
      };
    });
}

export default function ClaimPackWizard({ project, activities, evidence, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [generatedSections, setGeneratedSections] = useState(new Set());
  const [generatingKey, setGeneratingKey] = useState(null);
  const [error, setError] = useState(null);
  const [notes, setNotes] = useState({});

  const currentKey = SECTIONS_ORDER[currentStep];
  const completedCount = generatedSections.size;
  const allDone = completedCount === SECTIONS_ORDER.length;
  const isGeneratingAll = generatingKey === 'all';
  const isGeneratingCurrent = generatingKey === currentKey;
  const isCurrentDone = generatedSections.has(currentKey);
  const signals = getSignalsForSection(currentKey, evidence || []);

  const generateSection = async (key) => {
    setGeneratingKey(key);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${project.project_token}/claim-pack/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerate_sections: [key], force: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Generation failed');
      setGeneratedSections(prev => new Set([...prev, key]));
      const nextIdx = SECTIONS_ORDER.indexOf(key) + 1;
      if (nextIdx < SECTIONS_ORDER.length) setCurrentStep(nextIdx);
    } catch (e) {
      setError(e.message);
    } finally {
      setGeneratingKey(null);
    }
  };

  const generateRemaining = async () => {
    const remaining = SECTIONS_ORDER.filter(k => !generatedSections.has(k));
    if (!remaining.length) { onComplete(); return; }
    setGeneratingKey('all');
    setError(null);
    try {
      const res = await fetch(`/api/projects/${project.project_token}/claim-pack/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerate_sections: remaining, force: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Generation failed');
      onComplete();
    } catch (e) {
      setError(e.message);
      setGeneratingKey(null);
    }
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

        {/* Progress card */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: 14,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 2 }}>
            Generate claim pack
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>
            {completedCount} of {SECTIONS_ORDER.length} sections ready
          </div>
          {completedCount > 0 && !allDone && (
            <div style={{ marginTop: 10, height: 3, backgroundColor: '#f3f4f6', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${(completedCount / SECTIONS_ORDER.length) * 100}%`,
                backgroundColor: '#021048',
                borderRadius: 2,
                transition: 'width 0.4s ease',
              }} />
            </div>
          )}
        </div>

        {/* Generate all / remaining button */}
        <button
          onClick={generateRemaining}
          disabled={!!generatingKey}
          style={{
            width: '100%',
            padding: '9px 0',
            backgroundColor: generatingKey ? '#9ca3af' : '#021048',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: generatingKey ? 'not-allowed' : 'pointer',
            fontFamily: 'system-ui',
            letterSpacing: '0.01em',
          }}
        >
          {isGeneratingAll ? 'Generating…' : completedCount === 0 ? 'Generate All Sections' : 'Generate Remaining'}
        </button>

        {/* Section nav */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          overflow: 'hidden',
        }}>
          <div style={{ padding: '8px 12px 6px', borderBottom: '1px solid #f3f4f6' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Sections
            </span>
          </div>
          {SECTIONS_ORDER.map((key, i) => {
            const isDone = generatedSections.has(key);
            const isCurrent = key === currentKey;
            return (
              <button
                key={key}
                onClick={() => setCurrentStep(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '7px 12px',
                  border: 'none',
                  borderBottom: i < SECTIONS_ORDER.length - 1 ? '1px solid #f9fafb' : 'none',
                  backgroundColor: isCurrent ? '#f0f4ff' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'system-ui',
                }}
                onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.backgroundColor = isCurrent ? '#f0f4ff' : 'transparent'; }}
              >
                <span style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                  fontWeight: 700,
                  backgroundColor: isDone ? '#10b981' : isCurrent ? '#021048' : '#f3f4f6',
                  color: isDone || isCurrent ? 'white' : '#9ca3af',
                }}>
                  {isDone ? '✓' : i + 1}
                </span>
                <span style={{
                  fontSize: 12,
                  color: isCurrent ? '#021048' : '#374151',
                  fontWeight: isCurrent ? 500 : 400,
                  lineHeight: 1.3,
                }}>
                  {SIDEBAR_NAMES[key]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Escape hatch after at least one section done */}
        {completedCount > 0 && (
          <button
            onClick={onComplete}
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
            View sections so far →
          </button>
        )}
      </aside>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {error && (
          <div style={{
            marginBottom: 12,
            padding: '10px 14px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 6,
            color: '#991b1b',
            fontSize: 13,
          }}>
            Generation error: {error}
          </div>
        )}

        {allDone ? (
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: '48px 24px',
            textAlign: 'center',
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              backgroundColor: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: 22,
              color: 'white',
            }}>
              ✓
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
              All {SECTIONS_ORDER.length} sections generated
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', maxWidth: 360, margin: '0 auto 24px', lineHeight: 1.6 }}>
              Review and edit each section before submission. Use the Strengthen feature to find gaps.
            </div>
            <button
              onClick={onComplete}
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
              Open claim pack editor →
            </button>
          </div>
        ) : (
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            overflow: 'hidden',
          }}>

            {/* Section header */}
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
                  Step {currentStep + 1} of {SECTIONS_ORDER.length}
                </div>
              </div>
              {isCurrentDone && (
                <span style={{
                  fontSize: 11,
                  color: '#10b981',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  padding: '3px 8px',
                  borderRadius: 4,
                  fontWeight: 500,
                }}>
                  ✓ Generated
                </span>
              )}
            </div>

            {/* Section body */}
            <div style={{ padding: '20px' }}>

              {/* Description */}
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px', lineHeight: 1.65 }}>
                {SECTION_DESCRIPTIONS[currentKey]}
              </p>

              {/* AI hint — what it'll look for */}
              {SECTION_HINTS[currentKey] && !isCurrentDone && (
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #f3f4f6',
                  borderRadius: 5,
                  fontSize: 12,
                  color: '#6b7280',
                  marginBottom: 16,
                  lineHeight: 1.55,
                }}>
                  {SECTION_HINTS[currentKey]}
                </div>
              )}

              {/* Evidence signals */}
              {signals.length > 0 && !isCurrentDone && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#9ca3af',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: 7,
                  }}>
                    Matching evidence found
                  </div>
                  {signals.map((sig, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      gap: 8,
                      padding: '7px 10px',
                      backgroundColor: '#eff6ff',
                      border: '1px solid #dbeafe',
                      borderRadius: 4,
                      marginBottom: 5,
                      fontSize: 12,
                      color: '#1e40af',
                      lineHeight: 1.5,
                    }}>
                      {sig.date && (
                        <span style={{ fontSize: 10, color: '#93c5fd', flexShrink: 0, paddingTop: 1 }}>
                          {sig.date}
                        </span>
                      )}
                      <span>"{sig.snippet}"</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Optional context notes */}
              {!isCurrentDone && (
                <div style={{ marginBottom: 20 }}>
                  <label style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: '#374151',
                    display: 'block',
                    marginBottom: 5,
                  }}>
                    Add context{' '}
                    <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional — anything not in your timeline)</span>
                  </label>
                  <textarea
                    value={notes[currentKey] || ''}
                    onChange={e => setNotes(n => ({ ...n, [currentKey]: e.target.value }))}
                    placeholder="e.g. specific vendor names, dates, team members, or constraints the AI should include..."
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      fontSize: 12,
                      border: '1px solid #e5e7eb',
                      borderRadius: 4,
                      fontFamily: 'system-ui',
                      boxSizing: 'border-box',
                      resize: 'vertical',
                      color: '#374151',
                      lineHeight: 1.5,
                      outline: 'none',
                    }}
                    onFocus={e => e.target.style.borderColor = '#021048'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {!isCurrentDone ? (
                  <>
                    <button
                      onClick={() => generateSection(currentKey)}
                      disabled={!!generatingKey}
                      style={{
                        padding: '9px 18px',
                        backgroundColor: generatingKey ? '#9ca3af' : '#021048',
                        color: 'white',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: generatingKey ? 'not-allowed' : 'pointer',
                        fontFamily: 'system-ui',
                      }}
                    >
                      {isGeneratingCurrent ? 'Generating…' : 'Generate section →'}
                    </button>
                    {currentStep < SECTIONS_ORDER.length - 1 && (
                      <button
                        onClick={() => setCurrentStep(s => s + 1)}
                        disabled={!!generatingKey}
                        style={{
                          padding: '9px 14px',
                          backgroundColor: 'transparent',
                          color: '#6b7280',
                          border: '1px solid #e5e7eb',
                          borderRadius: 6,
                          fontSize: 13,
                          cursor: generatingKey ? 'not-allowed' : 'pointer',
                          fontFamily: 'system-ui',
                        }}
                      >
                        Skip for now
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => {
                      const next = currentStep + 1;
                      if (next < SECTIONS_ORDER.length) setCurrentStep(next);
                      else onComplete();
                    }}
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
                    {currentStep < SECTIONS_ORDER.length - 1
                      ? `Next: ${SIDEBAR_NAMES[SECTIONS_ORDER[currentStep + 1]]} →`
                      : 'Open claim pack editor →'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
