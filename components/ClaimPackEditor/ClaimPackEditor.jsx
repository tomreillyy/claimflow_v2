'use client';

import { useState } from 'react';
import SectionEditor from './SectionEditor';
import ComplianceValidator from './ComplianceValidator';
import { SECTION_KEYS, SECTION_NAMES } from '@/lib/airdMasterContext';
import { validateClaimPack } from '@/lib/claimPackValidator';
import { supabase } from '@/lib/supabaseClient';

export default function ClaimPackEditor({
  project,
  activities,
  evidence,
  costLedger,
  initialSections
}) {
  const [sections, setSections] = useState(initialSections || {});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [generationStats, setGenerationStats] = useState(null);

  // Calculate validation on client side
  const validation = validateClaimPack(
    project,
    activities,
    evidence,
    sections,
    costLedger
  );

  const handleGenerateAll = async () => {
    if (!confirm('Generate all claim pack sections with AI? This may take 10-20 seconds.')) {
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setGenerationStats(null);

    try {
      const response = await fetch(`/api/projects/${project.project_token}/claim-pack/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          // Generate all sections
        })
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      setGenerationStats({
        generated: data.generated.length,
        skipped: data.skipped.length,
        errors: data.errors.length,
        errorDetails: data.errors,
        duration_ms: data.duration_ms
      });

      // If there were errors, show them instead of reloading
      if (data.errors && data.errors.length > 0) {
        console.error('[ClaimPackEditor] Generation errors:', data.errors);
        setGenerationError(`${data.errors.length} section(s) failed to generate. Check console for details.`);
      }

      // Reload page to show new content (even if some sections had errors)
      if (data.generated.length > 0) {
        setTimeout(() => window.location.reload(), 2000); // Delay to show error message first
      }

    } catch (error) {
      console.error('[ClaimPackEditor] Generation error:', error);
      setGenerationError(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateSection = async (sectionKey) => {
    const sectionName = SECTION_NAMES[sectionKey];

    if (!confirm(`Regenerate "${sectionName}" section with AI? This will replace existing content.`)) {
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      const response = await fetch(`/api/projects/${project.project_token}/claim-pack/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          regenerate_sections: [sectionKey],
          force: true // Override manual edits
        })
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      // Reload page to show new content
      window.location.reload();

    } catch (error) {
      console.error('[ClaimPackEditor] Regeneration error:', error);
      setGenerationError(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper to get section data
  const getSectionData = (sectionKey) => {
    return sections[sectionKey] || {
      initialContent: null,
      aiGenerated: null,
      lastEditedAt: null,
      lastEditedBy: null
    };
  };

  return (
    <div>
      {/* Header Actions (hidden in print) */}
      <div className="print-hide" style={{
        marginBottom: 24,
        padding: 16,
        backgroundColor: 'white',
        border: '1px solid #e5e5e5',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <h1 style={{
            fontSize: 20,
            fontWeight: 600,
            color: '#1a1a1a',
            margin: '0 0 4px 0'
          }}>
            R&D Claim Pack
          </h1>
          <p style={{
            fontSize: 13,
            color: '#666',
            margin: 0
          }}>
            AI-powered, editable claim pack for {project.name}
          </p>
        </div>

        <button
          onClick={handleGenerateAll}
          disabled={isGenerating}
          style={{
            padding: '10px 20px',
            backgroundColor: isGenerating ? '#ccc' : '#021048',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            fontFamily: 'system-ui'
          }}
        >
          {isGenerating ? 'Generating...' : 'Generate Claim Pack'}
        </button>
      </div>

      {/* Generation Feedback */}
      {generationError && (
        <div className="print-hide" style={{
          marginBottom: 24,
          padding: 16,
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 8,
          color: '#991b1b',
          fontSize: 13
        }}>
          <strong>Generation failed:</strong> {generationError}
        </div>
      )}

      {generationStats && (
        <div className="print-hide" style={{
          marginBottom: 24,
          padding: 16,
          backgroundColor: generationStats.errors > 0 ? '#fef2f2' : '#f0fdf4',
          border: generationStats.errors > 0 ? '1px solid #fecaca' : '1px solid #bbf7d0',
          borderRadius: 8,
          color: generationStats.errors > 0 ? '#991b1b' : '#166534',
          fontSize: 13
        }}>
          <strong>{generationStats.errors > 0 ? '⚠ ' : '✓ '}Generation complete:</strong> {generationStats.generated} sections generated,
          {generationStats.skipped > 0 && ` ${generationStats.skipped} skipped (manual edits),`}
          {generationStats.errors > 0 && ` ${generationStats.errors} errors,`}
          {' '}{(generationStats.duration_ms / 1000).toFixed(1)}s
          {generationStats.errorDetails && generationStats.errorDetails.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 12 }}>
              <strong>Failed sections:</strong>
              <ul style={{ marginTop: 4, marginBottom: 0, paddingLeft: 20 }}>
                {generationStats.errorDetails.map((err, i) => (
                  <li key={i}>{err.section_name}: {err.error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Compliance Validator */}
      <ComplianceValidator validation={validation} />

      {/* Title Page (print only) */}
      <div className="print-only" style={{
        marginBottom: 40,
        paddingBottom: 24,
        borderBottom: '2px solid #021048',
        pageBreakAfter: 'always',
        position: 'relative',
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        <div>
          {/* AIRD Logo */}
          <div style={{ marginBottom: 48 }}>
            <img
              src="/Aird__3_-removebg-preview.png"
              alt="AIRD"
              style={{
                height: 60,
                width: 'auto'
              }}
            />
          </div>

          {/* Title Section */}
          <div style={{ marginTop: 80, marginBottom: 48 }}>
            <h1 style={{
              fontSize: 32,
              fontWeight: 700,
              color: '#021048',
              margin: '0 0 16px 0',
              letterSpacing: '-0.5px'
            }}>
              R&D Tax Incentive Claim Pack
            </h1>
            <div style={{
              height: 4,
              width: 80,
              backgroundColor: '#021048',
              margin: '16px 0 32px 0'
            }}></div>
            <h2 style={{
              fontSize: 24,
              fontWeight: 600,
              color: '#1a1a1a',
              margin: '0 0 12px 0'
            }}>
              {project.name}
            </h2>
            <p style={{
              fontSize: 16,
              color: '#666',
              margin: '0 0 24px 0',
              fontFamily: 'system-ui'
            }}>
              Tax Year {project.year}
            </p>
          </div>

          {/* Hypothesis */}
          {project.current_hypothesis && (
            <div style={{
              padding: 24,
              backgroundColor: '#f8fafc',
              borderLeft: '4px solid #021048',
              marginTop: 48,
              marginBottom: 48
            }}>
              <div style={{
                fontWeight: 600,
                marginBottom: 12,
                color: '#021048',
                fontSize: 14,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>Project Hypothesis</div>
              <div style={{ fontSize: 15, lineHeight: 1.6 }}>{project.current_hypothesis}</div>
            </div>
          )}

          {/* Project Overview */}
          {project.project_overview && (
            <div style={{
              padding: 24,
              backgroundColor: '#fafafa',
              border: '1px solid #e5e5e5',
              marginTop: 24
            }}>
              <div style={{
                fontWeight: 600,
                marginBottom: 12,
                color: '#021048',
                fontSize: 14,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>Project Overview</div>
              <div style={{ fontSize: 15, lineHeight: 1.6 }}>{project.project_overview}</div>
            </div>
          )}
        </div>

        {/* Footer on Title Page */}
        <div style={{
          marginTop: 'auto',
          paddingTop: 48
        }}>
          <div style={{
            fontSize: 12,
            color: '#999',
            borderTop: '1px solid #e5e5e5',
            paddingTop: 16
          }}>
            <div style={{ marginBottom: 4 }}>
              <strong>Generated:</strong> {new Date().toLocaleDateString('en-AU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
            <div style={{ fontSize: 11, marginTop: 8 }}>
              This claim pack has been prepared using AIRD (AI R&D) software for RDTI compliance documentation.
              All sections are editable and should be reviewed by qualified advisors before submission.
            </div>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div>
        {/* 1. Project Overview */}
        <SectionEditor
          sectionKey={SECTION_KEYS.PROJECT_OVERVIEW}
          sectionName={SECTION_NAMES[SECTION_KEYS.PROJECT_OVERVIEW]}
          projectId={project.id}
          {...getSectionData(SECTION_KEYS.PROJECT_OVERVIEW)}
          onRegenerateClick={() => handleRegenerateSection(SECTION_KEYS.PROJECT_OVERVIEW)}
        />

        {/* 2. Core Activities */}
        <SectionEditor
          sectionKey={SECTION_KEYS.CORE_ACTIVITIES}
          sectionName={SECTION_NAMES[SECTION_KEYS.CORE_ACTIVITIES]}
          projectId={project.id}
          {...getSectionData(SECTION_KEYS.CORE_ACTIVITIES)}
          onRegenerateClick={() => handleRegenerateSection(SECTION_KEYS.CORE_ACTIVITIES)}
        />

        {/* 3. Supporting Activities */}
        <SectionEditor
          sectionKey={SECTION_KEYS.SUPPORTING_ACTIVITIES}
          sectionName={SECTION_NAMES[SECTION_KEYS.SUPPORTING_ACTIVITIES]}
          projectId={project.id}
          {...getSectionData(SECTION_KEYS.SUPPORTING_ACTIVITIES)}
          onRegenerateClick={() => handleRegenerateSection(SECTION_KEYS.SUPPORTING_ACTIVITIES)}
        />

        {/* 4. Evidence Index */}
        <SectionEditor
          sectionKey={SECTION_KEYS.EVIDENCE_INDEX}
          sectionName={SECTION_NAMES[SECTION_KEYS.EVIDENCE_INDEX]}
          projectId={project.id}
          {...getSectionData(SECTION_KEYS.EVIDENCE_INDEX)}
          onRegenerateClick={() => handleRegenerateSection(SECTION_KEYS.EVIDENCE_INDEX)}
        />

        {/* 5. Financials */}
        <SectionEditor
          sectionKey={SECTION_KEYS.FINANCIALS}
          sectionName={SECTION_NAMES[SECTION_KEYS.FINANCIALS]}
          projectId={project.id}
          {...getSectionData(SECTION_KEYS.FINANCIALS)}
          onRegenerateClick={() => handleRegenerateSection(SECTION_KEYS.FINANCIALS)}
        />

        {/* 6. R&D Boundary */}
        <SectionEditor
          sectionKey={SECTION_KEYS.RD_BOUNDARY}
          sectionName={SECTION_NAMES[SECTION_KEYS.RD_BOUNDARY]}
          projectId={project.id}
          {...getSectionData(SECTION_KEYS.RD_BOUNDARY)}
          onRegenerateClick={() => handleRegenerateSection(SECTION_KEYS.RD_BOUNDARY)}
        />

        {/* 7. Overseas/Contracted */}
        <SectionEditor
          sectionKey={SECTION_KEYS.OVERSEAS_CONTRACTED}
          sectionName={SECTION_NAMES[SECTION_KEYS.OVERSEAS_CONTRACTED]}
          projectId={project.id}
          {...getSectionData(SECTION_KEYS.OVERSEAS_CONTRACTED)}
          onRegenerateClick={() => handleRegenerateSection(SECTION_KEYS.OVERSEAS_CONTRACTED)}
        />

        {/* 8. Registration Tie-out */}
        <SectionEditor
          sectionKey={SECTION_KEYS.REGISTRATION_TIEOUT}
          sectionName={SECTION_NAMES[SECTION_KEYS.REGISTRATION_TIEOUT]}
          projectId={project.id}
          {...getSectionData(SECTION_KEYS.REGISTRATION_TIEOUT)}
          onRegenerateClick={() => handleRegenerateSection(SECTION_KEYS.REGISTRATION_TIEOUT)}
        />

        {/* 9. Attestations */}
        <SectionEditor
          sectionKey={SECTION_KEYS.ATTESTATIONS}
          sectionName={SECTION_NAMES[SECTION_KEYS.ATTESTATIONS]}
          projectId={project.id}
          {...getSectionData(SECTION_KEYS.ATTESTATIONS)}
          onRegenerateClick={() => handleRegenerateSection(SECTION_KEYS.ATTESTATIONS)}
        />
      </div>

      {/* Footer (print only) */}
      <div className="print-only" style={{
        marginTop: 60,
        paddingTop: 24,
        borderTop: '2px solid #021048'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16
        }}>
          <img
            src="/Aird__3_-removebg-preview.png"
            alt="AIRD"
            style={{
              height: 32,
              width: 'auto',
              opacity: 0.6
            }}
          />
          <div style={{
            fontSize: 11,
            color: '#666',
            textAlign: 'right'
          }}>
            <div style={{ marginBottom: 4 }}>
              <strong>AIRD</strong> - AI R&D Tax Incentive Documentation
            </div>
            <div style={{ color: '#999' }}>
              Generated {new Date().toLocaleDateString('en-AU', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </div>
          </div>
        </div>
        <div style={{
          fontSize: 10,
          color: '#999',
          textAlign: 'center',
          paddingTop: 12,
          borderTop: '1px solid #e5e5e5'
        }}>
          This claim pack has been generated using AI-assisted technology and should be reviewed by qualified R&D tax advisors before submission to AusIndustry or the ATO.
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .print-hide {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          body {
            background: white;
          }
        }

        .print-only {
          display: none;
        }
      `}</style>
    </div>
  );
}
