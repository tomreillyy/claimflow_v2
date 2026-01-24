// Claim Pack Validator - RDTI compliance checking
// Validates claim pack completeness and flags issues/warnings

import { SECTION_KEYS, SYSTEMATIC_STEPS } from './claimFlowMasterContext';

/**
 * Validate claim pack for RDTI compliance
 *
 * @param {Object} project - Project data
 * @param {Array} activities - Core activities
 * @param {Array} evidence - All evidence items
 * @param {Object} sections - Claim pack sections (keyed by section_key)
 * @param {Array} costLedger - Cost ledger entries
 * @returns {Object} { score, issues, warnings, suggestions }
 */
export function validateClaimPack(project, activities, evidence, sections, costLedger) {
  const issues = []; // Critical problems (block submission)
  const warnings = []; // Non-critical concerns (review recommended)
  const suggestions = []; // Optional improvements

  // ============================================================================
  // 1. SECTION COMPLETENESS
  // ============================================================================

  const requiredSections = [
    SECTION_KEYS.PROJECT_OVERVIEW,
    SECTION_KEYS.CORE_ACTIVITIES,
    SECTION_KEYS.EVIDENCE_INDEX,
    SECTION_KEYS.FINANCIALS,
    SECTION_KEYS.RD_BOUNDARY,
    SECTION_KEYS.REGISTRATION_TIEOUT,
    SECTION_KEYS.ATTESTATIONS
  ];

  const optionalSections = [
    SECTION_KEYS.SUPPORTING_ACTIVITIES, // Optional if no supporting activities
    SECTION_KEYS.OVERSEAS_CONTRACTED // Optional if no overseas work
  ];

  requiredSections.forEach(key => {
    if (!sections[key] || !sections[key].content || sections[key].content.trim().length < 50) {
      issues.push({
        type: 'missing_section',
        severity: 'critical',
        message: `Missing or incomplete section: ${getSectionName(key)}`,
        section_key: key
      });
    }
  });

  // Check optional sections (warn if supporting evidence exists but no section)
  const supportingEvidence = evidence.filter(e => e.evidence_type === 'supporting');
  if (supportingEvidence.length > 0 && (!sections[SECTION_KEYS.SUPPORTING_ACTIVITIES] || !sections[SECTION_KEYS.SUPPORTING_ACTIVITIES].content)) {
    warnings.push({
      type: 'missing_optional_section',
      severity: 'warning',
      message: `Found ${supportingEvidence.length} supporting evidence items but no Supporting Activities section`,
      section_key: SECTION_KEYS.SUPPORTING_ACTIVITIES
    });
  }

  // ============================================================================
  // 2. CORE ACTIVITIES VALIDATION
  // ============================================================================

  if (!activities || activities.length === 0) {
    issues.push({
      type: 'no_activities',
      severity: 'critical',
      message: 'No core R&D activities defined. At least one core activity is required.'
    });
  } else {
    // Check each activity has systematic progression
    activities.forEach(activity => {
      const activityEvidence = evidence.filter(e =>
        e.linked_activity_id === activity.id &&
        e.evidence_type === 'core'
      );

      if (activityEvidence.length === 0) {
        warnings.push({
          type: 'activity_no_evidence',
          severity: 'warning',
          message: `Activity "${activity.name}" has no linked core evidence`,
          activity_id: activity.id
        });
        return;
      }

      // Check systematic step coverage
      const steps = [...new Set(activityEvidence.map(e => e.systematic_step_primary))];
      const missingSteps = SYSTEMATIC_STEPS.filter(s => !steps.includes(s));

      if (missingSteps.length > 0) {
        warnings.push({
          type: 'incomplete_systematic_progression',
          severity: 'warning',
          message: `Activity "${activity.name}" missing steps: ${missingSteps.join(', ')}`,
          activity_id: activity.id,
          missing_steps: missingSteps
        });
      }

      // Check for hypothesis (should be in activity.uncertainty or project.current_hypothesis)
      if (!activity.uncertainty || activity.uncertainty.trim().length < 20) {
        warnings.push({
          type: 'weak_uncertainty',
          severity: 'warning',
          message: `Activity "${activity.name}" has vague/missing technical uncertainty statement`,
          activity_id: activity.id
        });
      }
    });
  }

  // ============================================================================
  // 3. EVIDENCE QUALITY
  // ============================================================================

  const coreEvidence = evidence.filter(e => e.evidence_type === 'core');

  if (coreEvidence.length === 0) {
    issues.push({
      type: 'no_core_evidence',
      severity: 'critical',
      message: 'No core R&D evidence items found. Evidence is required to support claims.'
    });
  } else if (coreEvidence.length < 10) {
    warnings.push({
      type: 'limited_evidence',
      severity: 'warning',
      message: `Only ${coreEvidence.length} core evidence items. More evidence strengthens the claim.`
    });
  }

  // Check contemporaneity (evidence should be within tax year)
  if (project.year && typeof project.year === 'string') {
    const yearMatch = project.year.match(/(\d{4})-(\d{4})/);
    if (yearMatch) {
      const [_, startYear, endYear] = yearMatch;
      const startDate = new Date(`${startYear}-07-01`); // Australian tax year starts July 1
      const endDate = new Date(`${endYear}-06-30`);

      const outsideYearEvidence = evidence.filter(e => {
        const evidenceDate = new Date(e.created_at);
        return evidenceDate < startDate || evidenceDate > endDate;
      });

      if (outsideYearEvidence.length > 0) {
        warnings.push({
          type: 'evidence_outside_tax_year',
          severity: 'warning',
          message: `${outsideYearEvidence.length} evidence items dated outside tax year ${project.year}`,
          evidence_ids: outsideYearEvidence.map(e => e.id.substring(0, 8))
        });
      }
    }
  }

  // Check for unlinked core evidence
  const unlinkedCoreEvidence = coreEvidence.filter(e => !e.linked_activity_id);
  if (unlinkedCoreEvidence.length > 0) {
    warnings.push({
      type: 'unlinked_core_evidence',
      severity: 'warning',
      message: `${unlinkedCoreEvidence.length} core evidence items not linked to any activity`,
      evidence_count: unlinkedCoreEvidence.length
    });
  }

  // ============================================================================
  // 4. SUPPORTING ACTIVITIES VALIDATION
  // ============================================================================

  if (supportingEvidence.length > 0) {
    // Check all supporting evidence has linked core activity
    const unlinkedSupporting = supportingEvidence.filter(e => !e.linked_activity_id);

    if (unlinkedSupporting.length > 0) {
      issues.push({
        type: 'supporting_no_link',
        severity: 'critical',
        message: `${unlinkedSupporting.length} supporting evidence items not linked to core activity (dominant purpose requirement)`,
        evidence_ids: unlinkedSupporting.map(e => e.id.substring(0, 8))
      });
    }
  }

  // ============================================================================
  // 5. FINANCIAL VALIDATION
  // ============================================================================

  if (!costLedger || costLedger.length === 0) {
    warnings.push({
      type: 'no_financial_data',
      severity: 'warning',
      message: 'No payroll/cost data uploaded. Financials section will be incomplete.'
    });
  } else {
    // Check for unapportioned costs - ESCALATE to MAJOR issue
    const unapportioned = costLedger.filter(entry => !entry.activity_id);

    if (unapportioned.length > 0) {
      const unapportionedTotal = unapportioned.reduce((sum, e) => sum + parseFloat(e.total_amount || 0), 0);

      if (unapportionedTotal > 0) {
        issues.push({
          type: 'unapportioned_costs',
          severity: 'MAJOR',
          message: `$${unapportionedTotal.toLocaleString('en-AU', {minimumFractionDigits: 2})} in payroll costs exist but are NOT mapped to activities. ACTION REQUIRED: Map payroll costs to Core Activities or provide apportionment notes/timesheets.`,
          unapportioned_entries: unapportioned.length,
          unapportioned_total: unapportionedTotal
        });
      }
    }

    // Check apportionment method consistency
    const basisTexts = [...new Set(costLedger.map(e => e.basis_text).filter(Boolean))];
    if (basisTexts.length > 1) {
      suggestions.push({
        type: 'inconsistent_apportionment',
        severity: 'suggestion',
        message: `Multiple apportionment methods used (${basisTexts.length}). Ensure consistency is documented.`
      });
    }
  }

  // ============================================================================
  // 6. PROJECT-LEVEL CHECKS
  // ============================================================================

  // Check hypothesis exists
  if (!project.current_hypothesis || project.current_hypothesis.trim().length < 20) {
    warnings.push({
      type: 'weak_hypothesis',
      severity: 'warning',
      message: 'Project hypothesis is vague or missing. A clear, testable hypothesis strengthens the claim.'
    });
  }

  // Check registration deadline awareness
  if (project.year && typeof project.year === 'string') {
    const yearMatch = project.year.match(/(\d{4})-(\d{4})/);
    if (yearMatch) {
      const [_, startYear, endYear] = yearMatch;
      const taxYearEnd = new Date(`${endYear}-06-30`);
      const registrationDeadline = new Date(taxYearEnd);
      registrationDeadline.setMonth(registrationDeadline.getMonth() + 10); // 10 months after year end

      const now = new Date();
      const daysUntilDeadline = Math.ceil((registrationDeadline - now) / (1000 * 60 * 60 * 24));

      if (daysUntilDeadline < 0) {
        issues.push({
          type: 'registration_deadline_passed',
          severity: 'critical',
          message: `Registration deadline passed on ${registrationDeadline.toLocaleDateString('en-AU')}`
        });
      } else if (daysUntilDeadline < 30) {
        warnings.push({
          type: 'registration_deadline_soon',
          severity: 'warning',
          message: `Registration deadline in ${daysUntilDeadline} days (${registrationDeadline.toLocaleDateString('en-AU')})`
        });
      }
    }
  }

  // ============================================================================
  // 7. COMPLIANCE GATING & EVIDENCE COVERAGE
  // ============================================================================

  // Count critical issues
  const critical_issue_count = issues.filter(i => i.severity === 'critical' || i.severity === 'MAJOR').length;

  // Calculate evidence coverage: (# core activities with ≥1 evidence link) / (total core activities)
  let activitiesWithEvidence = 0;
  activities.forEach(activity => {
    const activityEvidence = evidence.filter(e =>
      e.linked_activity_id === activity.id &&
      e.evidence_type === 'core'
    );
    if (activityEvidence.length > 0) {
      activitiesWithEvidence++;
    }
  });

  const evidence_coverage = activities.length > 0
    ? (activitiesWithEvidence / activities.length) * 100
    : 0;

  // COMPLIANCE GATING: Determine if pack is ready or draft
  const isDraft = critical_issue_count > 3 || evidence_coverage < 60;
  const packStatus = isDraft ? 'DRAFT - DO NOT SUBMIT' : 'Review Before Submission';

  // Build missing items list for banner
  const missingItems = [];

  activities.forEach(activity => {
    const activityEvidence = evidence.filter(e =>
      e.linked_activity_id === activity.id &&
      e.evidence_type === 'core'
    );

    if (activityEvidence.length === 0) {
      missingItems.push(`Core Activity "${activity.name}": missing all evidence`);
    } else {
      // Check for missing steps
      const steps = [...new Set(activityEvidence.map(e => e.systematic_step_primary))];
      const missingSteps = SYSTEMATIC_STEPS.filter(s => !steps.includes(s));

      if (missingSteps.length > 0) {
        missingItems.push(`Core Activity "${activity.name}": missing ${missingSteps.join(', ')} evidence`);
      }
    }
  });

  // Check for financial issues
  if (costLedger && costLedger.length > 0) {
    const unapportioned = costLedger.filter(entry => !entry.activity_id);
    if (unapportioned.length > 0) {
      const unapportionedTotal = unapportioned.reduce((sum, e) => sum + parseFloat(e.total_amount || 0), 0);
      if (unapportionedTotal > 0) {
        missingItems.push(`Financials: $${unapportionedTotal.toLocaleString('en-AU', {minimumFractionDigits: 2})} not apportioned`);
      }
    }
  }

  // ============================================================================
  // 8. CALCULATE COMPLIANCE SCORE
  // ============================================================================

  let score = 100;

  // Deduct 10 points per critical issue
  score -= issues.length * 10;

  // Deduct 2 points per warning
  score -= warnings.length * 2;

  // Floor at 0
  score = Math.max(0, score);

  // ============================================================================
  // 9. RETURN RESULTS
  // ============================================================================

  return {
    score,
    rating: getComplianceRating(score),
    packStatus,
    isDraft,
    critical_issue_count,
    evidence_coverage,
    missingItems,
    issues,
    warnings,
    suggestions,
    summary: {
      total_sections: Object.keys(sections).length,
      required_sections: requiredSections.length,
      activities_count: activities.length,
      activities_with_evidence: activitiesWithEvidence,
      core_evidence_count: coreEvidence.length,
      supporting_evidence_count: supportingEvidence.length,
      cost_entries: costLedger?.length || 0
    }
  };
}

// Helper: Get section name
function getSectionName(sectionKey) {
  const names = {
    [SECTION_KEYS.PROJECT_OVERVIEW]: 'Project Overview',
    [SECTION_KEYS.CORE_ACTIVITIES]: 'Core Activities',
    [SECTION_KEYS.SUPPORTING_ACTIVITIES]: 'Supporting Activities',
    [SECTION_KEYS.EVIDENCE_INDEX]: 'Evidence Index',
    [SECTION_KEYS.FINANCIALS]: 'Financials',
    [SECTION_KEYS.RD_BOUNDARY]: 'R&D Boundary',
    [SECTION_KEYS.OVERSEAS_CONTRACTED]: 'Overseas/Contracted Work',
    [SECTION_KEYS.REGISTRATION_TIEOUT]: 'Registration Tie-out',
    [SECTION_KEYS.ATTESTATIONS]: 'Attestations'
  };
  return names[sectionKey] || sectionKey;
}

// Helper: Get compliance rating based on score
function getComplianceRating(score) {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'fair';
  return 'poor';
}

// Helper: Get rating color for UI
export function getRatingColor(rating) {
  const colors = {
    excellent: '#10b981', // green
    good: '#3b82f6',      // blue
    fair: '#f59e0b',      // amber
    poor: '#ef4444'       // red
  };
  return colors[rating] || '#6b7280'; // default gray
}

// Helper: Get rating label
export function getRatingLabel(rating) {
  const labels = {
    excellent: 'Ready to Submit',
    good: 'Review Warnings',
    fair: 'Needs Improvement',
    poor: 'Critical Issues'
  };
  return labels[rating] || 'Unknown';
}
