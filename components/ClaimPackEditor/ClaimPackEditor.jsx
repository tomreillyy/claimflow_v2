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
        duration_ms: data.duration_ms
      });

      // Reload page to show new content
      window.location.reload();

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
      content: null,
      ai_generated: null,
      last_edited_at: null,
      last_edited_by: null
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
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: 8,
          color: '#166534',
          fontSize: 13
        }}>
          <strong>✓ Generation complete:</strong> {generationStats.generated} sections generated,
          {generationStats.skipped > 0 && ` ${generationStats.skipped} skipped (manual edits),`}
          {generationStats.errors > 0 && ` ${generationStats.errors} errors,`}
          {' '}{(generationStats.duration_ms / 1000).toFixed(1)}s
        </div>
      )}

      {/* Compliance Validator */}
      <ComplianceValidator validation={validation} />

      {/* Title Page (print only) */}
      <div className="print-only" style={{
        marginBottom: 40,
        paddingBottom: 24,
        borderBottom: '2px solid #333',
        pageBreakAfter: 'always'
      }}>
        <h1 style={{
          fontSize: 28,
          fontWeight: 400,
          color: '#1a1a1a',
          margin: '0 0 16px 0'
        }}>
          R&D Tax Incentive Claim Pack
        </h1>
        <h2 style={{
          fontSize: 20,
          fontWeight: 600,
          color: '#333',
          margin: '0 0 8px 0'
        }}>
          {project.name}
        </h2>
        <p style={{
          fontSize: 14,
          color: '#666',
          margin: '0 0 24px 0'
        }}>
          Tax Year {project.year} • Generated {new Date().toLocaleDateString('en-AU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>
        {project.current_hypothesis && (
          <div style={{
            padding: 16,
            backgroundColor: '#f8fafc',
            borderLeft: '4px solid #021048',
            marginTop: 24
          }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Project Hypothesis:</div>
            <div>{project.current_hypothesis}</div>
          </div>
        )}
      </div>

      {/* Sections */}
      <div>
        {/* 1. RDTI Overview */}
        <SectionEditor
          sectionKey={SECTION_KEYS.RDTI_OVERVIEW}
          sectionName={SECTION_NAMES[SECTION_KEYS.RDTI_OVERVIEW]}
          projectId={project.id}
          {...getSectionData(SECTION_KEYS.RDTI_OVERVIEW)}
          onRegenerateClick={() => handleRegenerateSection(SECTION_KEYS.RDTI_OVERVIEW)}
        />

        {/* 2. Eligible R&D */}
        <SectionEditor
          sectionKey={SECTION_KEYS.ELIGIBLE_RD}
          sectionName={SECTION_NAMES[SECTION_KEYS.ELIGIBLE_RD]}
          projectId={project.id}
          {...getSectionData(SECTION_KEYS.ELIGIBLE_RD)}
          onRegenerateClick={() => handleRegenerateSection(SECTION_KEYS.ELIGIBLE_RD)}
        />

        {/* 3. Project Overview */}
        <SectionEditor
          sectionKey={SECTION_KEYS.PROJECT_OVERVIEW}
          sectionName={SECTION_NAMES[SECTION_KEYS.PROJECT_OVERVIEW]}
          projectId={project.id}
          {...getSectionData(SECTION_KEYS.PROJECT_OVERVIEW)}
          onRegenerateClick={() => handleRegenerateSection(SECTION_KEYS.PROJECT_OVERVIEW)}
        />

        {/* 4. Core Activities */}
        <SectionEditor
          sectionKey={SECTION_KEYS.CORE_ACTIVITIES}
          sectionName={SECTION_NAMES[SECTION_KEYS.CORE_ACTIVITIES]}
          projectId={project.id}
          {...getSectionData(SECTION_KEYS.CORE_ACTIVITIES)}
          onRegenerateClick={() => handleRegenerateSection(SECTION_KEYS.CORE_ACTIVITIES)}
        />

        {/* 5. Supporting Activities */}
        <SectionEditor
          sectionKey={SECTION_KEYS.SUPPORTING_ACTIVITIES}
          sectionName={SECTION_NAMES[SECTION_KEYS.SUPPORTING_ACTIVITIES]}
          projectId={project.id}
          {...getSectionData(SECTION_KEYS.SUPPORTING_ACTIVITIES)}
          onRegenerateClick={() => handleRegenerateSection(SECTION_KEYS.SUPPORTING_ACTIVITIES)}
        />

        {/* 6. Evidence Index */}
        <SectionEditor
          sectionKey={SECTION_KEYS.EVIDENCE_INDEX}
          sectionName={SECTION_NAMES[SECTION_KEYS.EVIDENCE_INDEX]}
          projectId={project.id}
          {...getSectionData(SECTION_KEYS.EVIDENCE_INDEX)}
          onRegenerateClick={() => handleRegenerateSection(SECTION_KEYS.EVIDENCE_INDEX)}
        />

        {/* 7. Financials */}
        <SectionEditor
          sectionKey={SECTION_KEYS.FINANCIALS}
          sectionName={SECTION_NAMES[SECTION_KEYS.FINANCIALS]}
          projectId={project.id}
          {...getSectionData(SECTION_KEYS.FINANCIALS)}
          onRegenerateClick={() => handleRegenerateSection(SECTION_KEYS.FINANCIALS)}
        />

        {/* 8. R&D Boundary */}
        <SectionEditor
          sectionKey={SECTION_KEYS.RD_BOUNDARY}
          sectionName={SECTION_NAMES[SECTION_KEYS.RD_BOUNDARY]}
          projectId={project.id}
          {...getSectionData(SECTION_KEYS.RD_BOUNDARY)}
          onRegenerateClick={() => handleRegenerateSection(SECTION_KEYS.RD_BOUNDARY)}
        />

        {/* 9. Overseas/Contracted */}
        <SectionEditor
          sectionKey={SECTION_KEYS.OVERSEAS_CONTRACTED}
          sectionName={SECTION_NAMES[SECTION_KEYS.OVERSEAS_CONTRACTED]}
          projectId={project.id}
          {...getSectionData(SECTION_KEYS.OVERSEAS_CONTRACTED)}
          onRegenerateClick={() => handleRegenerateSection(SECTION_KEYS.OVERSEAS_CONTRACTED)}
        />

        {/* 10. Registration Tie-out */}
        <SectionEditor
          sectionKey={SECTION_KEYS.REGISTRATION_TIEOUT}
          sectionName={SECTION_NAMES[SECTION_KEYS.REGISTRATION_TIEOUT]}
          projectId={project.id}
          {...getSectionData(SECTION_KEYS.REGISTRATION_TIEOUT)}
          onRegenerateClick={() => handleRegenerateSection(SECTION_KEYS.REGISTRATION_TIEOUT)}
        />

        {/* 11. Attestations */}
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
        marginTop: 40,
        paddingTop: 16,
        borderTop: '1px solid #ddd',
        fontSize: 11,
        color: '#999',
        textAlign: 'center'
      }}>
        Generated by AIRD • {new Date().toLocaleDateString('en-AU')} • This document contains AI-assisted content for RDTI compliance
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
