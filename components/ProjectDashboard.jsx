'use client';

import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Circle, DollarSign, Calendar, ArrowRight, FileText, AlertCircle, Lightbulb, Users, TrendingUp } from 'lucide-react';

// ============================================================================
// HELPERS
// ============================================================================

function formatCurrency(amount) {
  if (!amount || amount <= 0) return '$0';
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${Math.round(amount / 1000).toLocaleString()}k`;
  return `$${Math.round(amount).toLocaleString()}`;
}

function formatCurrencyFull(amount) {
  if (!amount || amount <= 0) return '$0';
  return `$${Math.round(amount).toLocaleString()}`;
}

function getRegistrationDeadline(projectYear) {
  // AusIndustry registration deadline: 10 months after 30 June of claim year
  // e.g. FY 2025 (ending 30 June 2025) -> deadline 30 April 2026
  const year = parseInt(projectYear);
  if (!year) return null;
  // Claim year end is 30 June of year_end (or year if no year_end)
  const fyEnd = new Date(year, 5, 30); // June 30 of the year
  const deadline = new Date(fyEnd);
  deadline.setMonth(deadline.getMonth() + 10); // 10 months later
  return deadline;
}

function daysUntil(date) {
  if (!date) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

const STEPS = ['Hypothesis', 'Experiment', 'Observation', 'Evaluation', 'Conclusion'];

// ============================================================================
// COMPONENT
// ============================================================================

export default function ProjectDashboard({
  project,
  items,
  token,
  coreActivities,
  costSummary,
  taxBenefit,
  ledger,
  onNavigate,
}) {

  // ---- Compute per-activity evidence stats ----
  const activityStats = useMemo(() => {
    const activities = coreActivities || [];
    const evidence = items || [];

    return activities.map(act => {
      // Find evidence linked to this activity
      const linked = evidence.filter(ev => ev.linked_activity_id === act.id);
      const stepCoverage = {};
      STEPS.forEach(s => { stepCoverage[s] = 0; });
      linked.forEach(ev => {
        const step = ev.systematic_step_primary;
        if (step && stepCoverage.hasOwnProperty(step)) {
          stepCoverage[step]++;
        }
      });

      const coveredSteps = STEPS.filter(s => stepCoverage[s] > 0);
      const missingSteps = STEPS.filter(s => stepCoverage[s] === 0);

      // Check for evidence clustering (all added on same day)
      const dates = linked.map(ev => new Date(ev.created_at).toDateString());
      const uniqueDates = new Set(dates);
      const isClustered = linked.length >= 3 && uniqueDates.size === 1;

      // Check for single author
      const authors = new Set(linked.map(ev => ev.author_email).filter(Boolean));
      const singleAuthor = linked.length >= 3 && authors.size === 1;

      // Determine status
      let status = 'ready';
      let statusLabel = 'Ready';
      let statusColor = '#16a34a';
      let issue = null;

      if (linked.length === 0) {
        status = 'blocked';
        statusLabel = 'No evidence';
        statusColor = '#dc2626';
        issue = 'No evidence linked — this activity can\'t be claimed without contemporaneous records';
      } else if (missingSteps.length >= 3) {
        status = 'weak';
        statusLabel = 'Weak';
        statusColor = '#dc2626';
        issue = `Only ${coveredSteps.length}/5 systematic steps covered — ATO expects a complete progression`;
      } else if (missingSteps.length > 0) {
        status = 'gaps';
        statusLabel = 'Gaps';
        statusColor = '#d97706';
        const missing = missingSteps.map(s => s.toLowerCase()).join(', ');
        issue = `Missing ${missing} — add evidence showing these stages of your R&D`;
      }

      // Secondary warnings (only if not already blocked)
      const warnings = [];
      if (isClustered && status !== 'blocked') {
        warnings.push('All evidence added on one day — looks like retrospective reconstruction, not contemporaneous documentation');
      }
      if (singleAuthor && status !== 'blocked') {
        warnings.push(`All evidence from one person (${[...authors][0]}) — multiple contributors strengthen the record`);
      }
      if (!act.uncertainty?.trim() && status !== 'blocked') {
        warnings.push('No technical uncertainty defined — the ATO\'s first question is "what was uncertain?"');
      }

      return {
        ...act,
        evidenceCount: linked.length,
        coveredSteps,
        missingSteps,
        stepCoverage,
        status,
        statusLabel,
        statusColor,
        issue,
        warnings,
      };
    });
  }, [coreActivities, items]);

  // ---- Compute advisor insights ----
  const insights = useMemo(() => {
    const result = [];
    const evidence = items || [];
    const activities = coreActivities || [];

    // 1. Unapportioned costs
    if (costSummary && costSummary.unapportionedTotal > 0) {
      result.push({
        type: 'warning',
        title: 'Unapportioned costs',
        description: `${formatCurrencyFull(costSummary.unapportionedTotal)} in payroll costs aren't linked to any R&D activity. These won't appear in your claim.`,
        action: 'Review costs',
        actionView: 'costs',
      });
    }

    // 2. No costs uploaded at all
    if (!costSummary || costSummary.totalEligible === 0) {
      result.push({
        type: 'action',
        title: 'No R&D costs recorded',
        description: 'Upload payroll data to calculate your estimated tax offset. This is the number your client is paying you for.',
        action: 'Upload costs',
        actionView: 'costs',
      });
    }

    // 3. No activities defined
    if (activities.length === 0) {
      if (evidence.length >= 5) {
        result.push({
          type: 'action',
          title: 'Ready to generate activities',
          description: `You have ${evidence.length} evidence items — enough for AI to identify your core R&D activities. Generate them to start building your claim.`,
          action: 'Generate activities',
          actionView: 'activities',
        });
      } else if (evidence.length > 0) {
        result.push({
          type: 'action',
          title: 'Need more evidence for activity generation',
          description: `${evidence.length} evidence items captured. Add at least ${5 - evidence.length} more for AI activity generation, or create activities manually.`,
          action: 'View activities',
          actionView: 'activities',
        });
      }
    }

    // 4. Unlinked evidence that could be a missed activity
    const unlinkedEvidence = evidence.filter(ev => !ev.linked_activity_id);
    if (unlinkedEvidence.length > 3 && activities.length > 0) {
      result.push({
        type: 'opportunity',
        title: `${unlinkedEvidence.length} evidence items not linked to any activity`,
        description: 'This could be unclaimed R&D work, or evidence that needs linking. Review to check if you\'re missing a claimable activity.',
        action: 'Review evidence',
        actionView: 'workspace',
      });
    }

    // 5. Weak hypothesis
    if (project.current_hypothesis) {
      const hyp = project.current_hypothesis.toLowerCase();
      const businessWords = ['improve', 'increase', 'reduce cost', 'grow', 'revenue', 'market', 'customer satisfaction', 'efficiency'];
      const isBusinessy = businessWords.some(w => hyp.includes(w)) && !hyp.includes('whether') && !hyp.includes('can we') && !hyp.includes('if');
      if (isBusinessy) {
        result.push({
          type: 'warning',
          title: 'Hypothesis reads like a business goal',
          description: '"' + project.current_hypothesis.slice(0, 80) + '..." — Reframe around the technical uncertainty, not the commercial outcome.',
          action: 'Edit details',
          actionView: 'details',
        });
      }
    } else {
      result.push({
        type: 'action',
        title: 'No hypothesis defined',
        description: 'Every R&D claim needs a testable technical proposition. This is the foundation of your claim pack.',
        action: 'Add hypothesis',
        actionView: 'details',
      });
    }

    // 6. Technical framing incomplete
    const framingFields = ['technical_uncertainty', 'knowledge_gap', 'testing_method', 'success_criteria'];
    const missingFraming = framingFields.filter(f => !project[f]?.trim());
    if (missingFraming.length > 0 && missingFraming.length < 4) {
      result.push({
        type: 'action',
        title: `${missingFraming.length} technical framing field${missingFraming.length > 1 ? 's' : ''} incomplete`,
        description: 'The claim pack generator uses these as primary input. Missing fields produce weaker narratives.',
        action: 'Complete details',
        actionView: 'details',
      });
    }

    // 7. Supporting activities not captured
    const supportingEvidence = evidence.filter(ev => ev.activity_type === 'supporting');
    const supportingActivities = activities.filter(a => a.activity_type === 'supporting');
    if (supportingEvidence.length >= 2 && supportingActivities.length === 0) {
      result.push({
        type: 'opportunity',
        title: 'Supporting R&D work detected but not captured',
        description: `${supportingEvidence.length} evidence items classified as supporting R&D. These could be claimable activities (test infrastructure, data prep, tooling).`,
        action: 'View activities',
        actionView: 'activities',
      });
    }

    return result;
  }, [items, coreActivities, costSummary, project]);

  // ---- Registration deadline ----
  const yearForDeadline = project.year_end || project.year;
  const deadline = getRegistrationDeadline(yearForDeadline);
  const daysLeft = daysUntil(deadline);

  // ---- Render ----
  return (
    <div style={{ padding: '16px 0', maxWidth: 900 }}>

      {/* ================================================================ */}
      {/* ZONE 1: THE MONEY                                                */}
      {/* ================================================================ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: deadline ? '1fr auto' : '1fr',
        gap: 16,
        marginBottom: 24,
      }}>
        {/* Offset estimate */}
        <div style={{
          background: 'linear-gradient(135deg, #021048 0%, #0a1f6b 100%)',
          borderRadius: 12,
          padding: '24px 28px',
          color: 'white',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <DollarSign size={16} strokeWidth={2.5} />
            <span style={{ fontSize: 13, fontWeight: 500, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Estimated Tax Offset
            </span>
          </div>

          {taxBenefit && taxBenefit.offsetAmount > 0 ? (
            <>
              <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.1, marginBottom: 8 }}>
                {formatCurrencyFull(taxBenefit.offsetAmount)}
              </div>
              <div style={{ fontSize: 13, opacity: 0.7, lineHeight: 1.5 }}>
                {taxBenefit.refundable ? 'Refundable' : 'Non-refundable'} at {(taxBenefit.offsetRate * 100).toFixed(1)}%
                {taxBenefit.estimated && ' (turnover band not set)'}
              </div>
              {costSummary && (
                <div style={{
                  display: 'flex',
                  gap: 16,
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: '1px solid rgba(255,255,255,0.15)',
                  fontSize: 13,
                  opacity: 0.7,
                }}>
                  {costSummary.staffTotal > 0 && <span>Labour {formatCurrency(costSummary.staffTotal)}</span>}
                  {costSummary.contractorTotal > 0 && <span>Contractors {formatCurrency(costSummary.contractorTotal)}</span>}
                  {costSummary.cloudTotal > 0 && <span>Cloud {formatCurrency(costSummary.cloudTotal)}</span>}
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.2, marginBottom: 8, opacity: 0.5 }}>
                --
              </div>
              <div style={{ fontSize: 13, opacity: 0.7 }}>
                Upload payroll costs to see your estimated offset
              </div>
              <button
                onClick={() => onNavigate?.('costs')}
                style={{
                  marginTop: 12,
                  padding: '6px 14px',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#021048',
                  backgroundColor: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                Upload costs
              </button>
            </>
          )}
        </div>

        {/* Registration deadline */}
        {deadline && (
          <div style={{
            backgroundColor: daysLeft !== null && daysLeft < 60
              ? '#fef2f2'
              : daysLeft !== null && daysLeft < 180
                ? '#fffbeb'
                : '#f0fdf4',
            border: `1px solid ${
              daysLeft !== null && daysLeft < 60
                ? '#fecaca'
                : daysLeft !== null && daysLeft < 180
                  ? '#fde68a'
                  : '#bbf7d0'
            }`,
            borderRadius: 12,
            padding: '24px 24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minWidth: 200,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Calendar size={16} color={daysLeft !== null && daysLeft < 60 ? '#dc2626' : '#666'} />
              <span style={{ fontSize: 12, fontWeight: 500, color: '#666', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Registration Due
              </span>
            </div>
            <div style={{
              fontSize: 22,
              fontWeight: 700,
              color: daysLeft !== null && daysLeft < 60 ? '#dc2626' : daysLeft !== null && daysLeft < 180 ? '#92400e' : '#166534',
              lineHeight: 1.2,
            }}>
              {daysLeft !== null && daysLeft < 0
                ? 'Overdue'
                : daysLeft !== null
                  ? `${daysLeft} days`
                  : '--'}
            </div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              {deadline.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* ZONE 2: YOUR ACTIVITIES                                          */}
      {/* ================================================================ */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e5e5e5',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 24,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: '1px solid #e5e5e5',
          backgroundColor: '#fafafa',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={16} color="#374151" />
            <span style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>
              R&D Activities
            </span>
          </div>
          {activityStats.length > 0 && (
            <span style={{ fontSize: 12, color: '#666' }}>
              {activityStats.filter(a => a.status === 'ready').length} of {activityStats.length} ready to claim
            </span>
          )}
        </div>

        {activityStats.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: '#666', marginBottom: 12 }}>
              No R&D activities defined yet.
              {(items || []).length >= 5
                ? ' You have enough evidence to auto-generate them.'
                : ` Add at least ${Math.max(0, 5 - (items || []).length)} more evidence items for AI generation.`}
            </div>
            <button
              onClick={() => onNavigate?.('activities')}
              style={{
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 500,
                color: 'white',
                backgroundColor: '#021048',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              {(items || []).length >= 5 ? 'Generate activities' : 'Manage activities'}
            </button>
          </div>
        ) : (
          <div>
            {activityStats.map((act, i) => (
              <div
                key={act.id}
                style={{
                  padding: '16px 20px',
                  borderBottom: i < activityStats.length - 1 ? '1px solid #f0f0f0' : 'none',
                }}
              >
                {/* Activity header row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {/* Status indicator */}
                  <div style={{ paddingTop: 2, flexShrink: 0 }}>
                    {act.status === 'ready' ? (
                      <CheckCircle2 size={18} color="#16a34a" />
                    ) : act.status === 'blocked' ? (
                      <AlertCircle size={18} color="#dc2626" />
                    ) : (
                      <AlertTriangle size={18} color="#d97706" />
                    )}
                  </div>

                  {/* Activity info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                        {act.name}
                      </span>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 500,
                        padding: '1px 8px',
                        borderRadius: 10,
                        backgroundColor: act.activity_type === 'supporting' ? '#f3e8ff' : '#eff6ff',
                        color: act.activity_type === 'supporting' ? '#7c3aed' : '#1d4ed8',
                      }}>
                        {act.activity_type === 'supporting' ? 'Supporting' : 'Core'}
                      </span>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>
                        {act.evidenceCount} evidence item{act.evidenceCount !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Step coverage pills */}
                    {act.evidenceCount > 0 && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                        {STEPS.map(step => {
                          const count = act.stepCoverage[step] || 0;
                          const covered = count > 0;
                          return (
                            <span
                              key={step}
                              title={`${step}: ${count} item${count !== 1 ? 's' : ''}`}
                              style={{
                                fontSize: 10,
                                fontWeight: 500,
                                padding: '2px 8px',
                                borderRadius: 8,
                                backgroundColor: covered ? '#f0fdf4' : '#f9fafb',
                                color: covered ? '#166534' : '#94a3b8',
                                border: `1px solid ${covered ? '#bbf7d0' : '#e5e5e5'}`,
                                letterSpacing: '0.02em',
                              }}
                            >
                              {step.charAt(0)}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Issue */}
                    {act.issue && (
                      <div style={{
                        fontSize: 13,
                        color: act.status === 'blocked' ? '#dc2626' : '#92400e',
                        marginTop: 6,
                        lineHeight: 1.4,
                      }}>
                        {act.issue}
                      </div>
                    )}

                    {/* Warnings */}
                    {act.warnings.map((w, j) => (
                      <div key={j} style={{
                        fontSize: 12,
                        color: '#92400e',
                        marginTop: 4,
                        lineHeight: 1.4,
                        paddingLeft: 0,
                      }}>
                        {w}
                      </div>
                    ))}
                  </div>

                  {/* Status badge */}
                  <span style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: act.statusColor,
                    flexShrink: 0,
                    paddingTop: 2,
                  }}>
                    {act.statusLabel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* ZONE 3: ADVISOR INSIGHTS                                         */}
      {/* ================================================================ */}
      {insights.length > 0 && (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e5e5',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '14px 20px',
            borderBottom: '1px solid #e5e5e5',
            backgroundColor: '#fafafa',
          }}>
            <Lightbulb size={16} color="#374151" />
            <span style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>
              Insights
            </span>
          </div>

          <div>
            {insights.map((insight, i) => (
              <div
                key={i}
                style={{
                  padding: '14px 20px',
                  borderBottom: i < insights.length - 1 ? '1px solid #f0f0f0' : 'none',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                {/* Icon */}
                <div style={{ paddingTop: 1, flexShrink: 0 }}>
                  {insight.type === 'warning' ? (
                    <AlertTriangle size={16} color="#d97706" />
                  ) : insight.type === 'opportunity' ? (
                    <TrendingUp size={16} color="#0ea5e9" />
                  ) : (
                    <ArrowRight size={16} color="#6366f1" />
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>
                    {insight.title}
                  </div>
                  <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>
                    {insight.description}
                  </div>
                </div>

                {/* Action button */}
                {insight.action && (
                  <button
                    onClick={() => onNavigate?.(insight.actionView)}
                    style={{
                      flexShrink: 0,
                      padding: '5px 12px',
                      fontSize: 12,
                      fontWeight: 500,
                      color: '#021048',
                      backgroundColor: 'white',
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    {insight.action}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
