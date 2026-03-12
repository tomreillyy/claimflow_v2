'use client';

import { useState } from 'react';
import SectionEditor from './SectionEditor';
import ClaimPackWizard from './ClaimPackWizard';
import ClaimPackStrengthenWizard from './ClaimPackStrengthenWizard';
import { SECTION_KEYS, SECTION_NAMES } from '@/lib/claimFlowMasterContext';
import { validateClaimPack, getRatingColor, getRatingLabel } from '@/lib/claimPackValidator';
import { useAuth } from '@/components/AuthProvider';

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

// Shorter names for sidebar
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

function StatusDot({ status }) {
  const styles = {
    ok:      { backgroundColor: '#10b981' },
    error:   { backgroundColor: '#ef4444' },
    warning: { backgroundColor: '#f59e0b' },
    empty:   { backgroundColor: '#e5e7eb' },
  };
  return (
    <span style={{
      width: 7,
      height: 7,
      borderRadius: '50%',
      flexShrink: 0,
      display: 'inline-block',
      ...(styles[status] || styles.empty),
    }} />
  );
}

export default function ClaimPackEditor({
  project,
  activities,
  evidence,
  costLedger,
  initialSections
}) {
  const { consultantBranding } = useAuth();
  const [sections] = useState(initialSections || {});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [generationStats, setGenerationStats] = useState(null);
  const [showStrengthenWizard, setShowStrengthenWizard] = useState(false);

  const validation = validateClaimPack(project, activities, evidence, sections, costLedger);

  const handleGenerateAll = async () => {
    if (!confirm('Generate all claim pack sections with AI? This may take 10–20 seconds.')) return;
    setIsGenerating(true);
    setGenerationError(null);
    setGenerationStats(null);
    try {
      const response = await fetch(`/api/projects/${project.project_token}/claim-pack/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'Generation failed');
      setGenerationStats({
        generated: data.generated.length,
        skipped: data.skipped.length,
        errors: data.errors.length,
        errorDetails: data.errors,
        duration_ms: data.duration_ms,
      });
      if (data.errors?.length > 0) {
        setGenerationError(`${data.errors.length} section(s) failed to generate.`);
      }
      if (data.generated.length > 0) {
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (error) {
      setGenerationError(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateSection = async (sectionKey) => {
    const sectionName = SECTION_NAMES[sectionKey];
    if (!confirm(`Regenerate "${sectionName}" with AI? Existing content will be replaced.`)) return;
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const response = await fetch(`/api/projects/${project.project_token}/claim-pack/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerate_sections: [sectionKey], force: true }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'Generation failed');
      window.location.reload();
    } catch (error) {
      setGenerationError(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const getSectionData = (key) =>
    sections[key] || { initialContent: null, aiGenerated: null, lastEditedAt: null, lastEditedBy: null };

  const getSectionStatus = (key) => {
    const d = sections[key];
    const hasContent = d?.initialContent && d.initialContent.trim().length > 10;
    if (!hasContent) return 'empty';
    const hasIssue = validation.issues.some(i => i.section_key === key);
    if (hasIssue) return 'error';
    const hasWarning = validation.warnings.some(w => w.section_key === key);
    if (hasWarning) return 'warning';
    return 'ok';
  };

  const scrollToSection = (key) => {
    const el = document.getElementById(`section-${key}`);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 88;
    window.scrollTo({ top: y, behavior: 'smooth' });
  };

  const completedCount = SECTIONS_ORDER.filter(k => {
    const d = sections[k];
    return d?.initialContent && d.initialContent.trim().length > 10;
  }).length;

  const isEmpty = completedCount === 0;

  // Show guided wizard for first-time generation
  if (isEmpty) {
    return (
      <ClaimPackWizard
        project={project}
        activities={activities}
        evidence={evidence}
        onComplete={() => window.location.reload()}
      />
    );
  }

  // Show strengthen wizard when requested
  if (showStrengthenWizard) {
    return (
      <ClaimPackStrengthenWizard
        project={project}
        sections={sections}
        onClose={() => setShowStrengthenWizard(false)}
      />
    );
  }

  // Derive status label
  const statusLabel = validation.isDraft
    ? 'Not ready to submit'
    : validation.score >= 90
      ? 'Ready for review'
      : 'Review warnings';

  return (
    <div>
      {/* ── SCREEN LAYOUT ── */}
      <div className="print-hide" style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

        {/* LEFT SIDEBAR */}
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

          {/* Readiness card */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: validation.missingItems.length > 0 ? 12 : 0 }}>
              <div style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                backgroundColor: getRatingColor(validation.rating),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 15,
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {validation.score}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', lineHeight: 1.2 }}>
                  {statusLabel}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                  {completedCount}/{SECTIONS_ORDER.length} sections complete
                </div>
              </div>
            </div>

            {/* Action items */}
            {validation.missingItems.length > 0 && (
              <div>
                <div style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#9ca3af',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 6,
                }}>
                  Action required
                </div>
                {validation.missingItems.map((item, i) => (
                  <div key={i} style={{
                    fontSize: 11,
                    color: '#7f1d1d',
                    padding: '4px 8px',
                    borderLeft: '2px solid #ef4444',
                    marginBottom: 4,
                    lineHeight: 1.5,
                    backgroundColor: '#fef2f2',
                    borderRadius: '0 3px 3px 0',
                  }}>
                    {item}
                  </div>
                ))}
              </div>
            )}

            {validation.missingItems.length === 0 && validation.warnings.length > 0 && (
              <div style={{ fontSize: 11, color: '#92400e', marginTop: 4 }}>
                {validation.warnings.length} warning{validation.warnings.length !== 1 ? 's' : ''} — review before submission
              </div>
            )}

            {validation.score >= 90 && (
              <div style={{ fontSize: 11, color: '#065f46', marginTop: 4 }}>
                Claim pack is ready for advisor review.
              </div>
            )}
          </div>

          {/* Generate / Regenerate button */}
          <button
            onClick={handleGenerateAll}
            disabled={isGenerating}
            style={{
              width: '100%',
              padding: '9px 0',
              backgroundColor: isGenerating ? '#9ca3af' : '#021048',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              fontFamily: 'system-ui',
              letterSpacing: '0.01em',
            }}
          >
            {isGenerating ? 'Generating...' : isEmpty ? 'Generate All Sections' : 'Regenerate All'}
          </button>

          {/* Strengthen button — only when content exists */}
          {!isEmpty && (
            <button
              onClick={() => setShowStrengthenWizard(true)}
              style={{
                width: '100%',
                padding: '9px 0',
                backgroundColor: 'transparent',
                color: '#021048',
                border: '1px solid #021048',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'system-ui',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f0f4ff'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              ✦ Strengthen
            </button>
          )}

          {/* Section nav */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '8px 12px 6px',
              borderBottom: '1px solid #f3f4f6',
            }}>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#9ca3af',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>
                Sections
              </span>
            </div>
            {SECTIONS_ORDER.map((key, i) => {
              const status = getSectionStatus(key);
              return (
                <button
                  key={key}
                  onClick={() => scrollToSection(key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '7px 12px',
                    border: 'none',
                    borderBottom: i < SECTIONS_ORDER.length - 1 ? '1px solid #f9fafb' : 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'system-ui',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <StatusDot status={status} />
                  <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.3 }}>
                    {SIDEBAR_NAMES[key]}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* RIGHT CONTENT */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Feedback banners */}
          {generationError && (
            <div style={{
              marginBottom: 12,
              padding: '10px 14px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 6,
              color: '#991b1b',
              fontSize: 13,
            }}>
              Generation error: {generationError}
            </div>
          )}
          {generationStats && !generationError && (
            <div style={{
              marginBottom: 12,
              padding: '10px 14px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 6,
              color: '#166534',
              fontSize: 13,
            }}>
              {generationStats.generated} section{generationStats.generated !== 1 ? 's' : ''} generated
              in {(generationStats.duration_ms / 1000).toFixed(1)}s — reloading...
            </div>
          )}

          {/* Empty state */}
          {isEmpty && (
            <div style={{
              padding: '36px 24px',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              marginBottom: 12,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
                Generate your claim pack
              </div>
              <div style={{ fontSize: 13, color: '#6b7280', maxWidth: 380, margin: '0 auto 20px', lineHeight: 1.6 }}>
                AI will draft all 9 RDTI sections using your project data, activities, and evidence.
                Review and edit each section before submission.
              </div>
              <button
                onClick={handleGenerateAll}
                disabled={isGenerating}
                style={{
                  padding: '10px 24px',
                  backgroundColor: isGenerating ? '#9ca3af' : '#021048',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  fontFamily: 'system-ui',
                }}
              >
                {isGenerating ? 'Generating...' : 'Generate All Sections'}
              </button>
            </div>
          )}

          {/* Section editors */}
          {SECTIONS_ORDER.map(key => (
            <div key={key} id={`section-${key}`}>
              <SectionEditor
                sectionKey={key}
                sectionName={SECTION_NAMES[key]}
                projectId={project.id}
                token={project.project_token}
                {...getSectionData(key)}
                onRegenerateClick={() => handleRegenerateSection(key)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── PRINT LAYOUT ── */}
      <div className="print-only">
        {/* Title page — full-page navy cover */}
        <div style={{
          pageBreakAfter: 'always',
          margin: '-24px -24px 0 -24px',
          minHeight: '100vh',
          backgroundColor: '#021048',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Subtle geometric accent */}
          <div style={{
            position: 'absolute',
            top: -120,
            right: -120,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.03)',
          }} />
          <div style={{
            position: 'absolute',
            bottom: -80,
            left: -80,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.02)',
          }} />

          {/* Top bar with logo */}
          <div style={{
            padding: '48px 56px 0 56px',
          }}>
            {consultantBranding?.logo_url ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <img
                  src={consultantBranding.logo_url}
                  alt={consultantBranding.company_name || 'Logo'}
                  style={{ height: 48, width: 'auto', objectFit: 'contain' }}
                />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>
                  Powered by ClaimFlow
                </span>
              </div>
            ) : (
              <img
                src="/claimflow-white-text-and-icon.png"
                alt="ClaimFlow"
                style={{ height: 48, width: 'auto' }}
              />
            )}
          </div>

          {/* Main title area — centred vertically */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '0 56px',
          }}>
            <div style={{
              width: 64,
              height: 3,
              backgroundColor: 'rgba(255,255,255,0.25)',
              marginBottom: 28,
            }} />
            <h1 style={{
              fontSize: 38,
              fontWeight: 700,
              color: '#ffffff',
              margin: '0 0 12px 0',
              lineHeight: 1.15,
              letterSpacing: '-0.01em',
            }}>
              R&D Tax Incentive<br />Claim Pack
            </h1>
            <div style={{
              width: 64,
              height: 3,
              backgroundColor: 'rgba(255,255,255,0.25)',
              margin: '20px 0 28px 0',
            }} />
            <h2 style={{
              fontSize: 22,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.85)',
              margin: '0 0 8px 0',
            }}>
              {project.name}
            </h2>
            {project.company_name && (
              <p style={{
                fontSize: 15,
                color: 'rgba(255,255,255,0.55)',
                margin: '0 0 4px 0',
                fontWeight: 400,
              }}>
                {project.company_name}
              </p>
            )}
          </div>

          {/* Bottom metadata strip */}
          <div style={{
            padding: '0 56px 48px 56px',
            display: 'flex',
            gap: 32,
            fontSize: 13,
            color: 'rgba(255,255,255,0.45)',
            letterSpacing: '0.02em',
          }}>
            <span>Tax Year {project.year}</span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
            <span>{new Date().toLocaleDateString('en-AU', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}</span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
            <span>Confidential</span>
          </div>
        </div>

        {SECTIONS_ORDER.map(key => (
          <SectionEditor
            key={`print-${key}`}
            sectionKey={key}
            sectionName={SECTION_NAMES[key]}
            projectId={project.id}
            {...getSectionData(key)}
            onRegenerateClick={() => {}}
          />
        ))}

        <div style={{
          marginTop: 40,
          paddingTop: 16,
          borderTop: '1px solid #ddd',
          fontSize: 11,
          color: '#999',
          textAlign: 'center',
        }}>
          Generated by ClaimFlow · {new Date().toLocaleDateString('en-AU')} · AI-assisted RDTI compliance documentation
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .print-hide { display: none !important; }
          .print-only { display: block !important; }
          body { background: white; }
        }
        .print-only { display: none; }
      `}</style>
    </div>
  );
}
