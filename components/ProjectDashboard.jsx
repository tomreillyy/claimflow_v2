'use client';

import { useMemo } from 'react';

const NAVY = '#021048';
const STEPS = ['Hypothesis', 'Experiment', 'Observation', 'Evaluation', 'Conclusion'];

function fmt(amount) {
  if (!amount || amount <= 0) return '$0';
  return `$${Math.round(amount).toLocaleString()}`;
}

function getDeadline(year) {
  const y = parseInt(year);
  if (!y) return null;
  const d = new Date(y, 5, 30); // June 30
  d.setMonth(d.getMonth() + 10); // +10 months
  return d;
}

function daysUntil(date) {
  if (!date) return null;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const t = new Date(date); t.setHours(0, 0, 0, 0);
  return Math.ceil((t - now) / 86400000);
}

export default function ProjectDashboard({
  project, items, token, coreActivities, costSummary, taxBenefit, ledger, onNavigate,
}) {

  // Per-activity evidence stats
  const activityStats = useMemo(() => {
    const activities = coreActivities || [];
    const evidence = items || [];

    return activities.map(act => {
      const linked = evidence.filter(ev => ev.linked_activity_id === act.id);
      const stepCoverage = {};
      STEPS.forEach(s => { stepCoverage[s] = 0; });
      linked.forEach(ev => {
        const step = ev.systematic_step_primary;
        if (step && stepCoverage[step] !== undefined) stepCoverage[step]++;
      });

      const covered = STEPS.filter(s => stepCoverage[s] > 0);
      const missing = STEPS.filter(s => stepCoverage[s] === 0);

      // Detect problems
      const dates = linked.map(ev => new Date(ev.created_at).toDateString());
      const clustered = linked.length >= 3 && new Set(dates).size === 1;
      const authors = new Set(linked.map(ev => ev.author_email).filter(Boolean));
      const singleAuthor = linked.length >= 3 && authors.size === 1;

      let issue = null;
      if (linked.length === 0) {
        issue = 'No evidence linked';
      } else if (missing.length >= 3) {
        issue = `Only ${covered.length}/5 steps — needs more systematic progression`;
      } else if (missing.length > 0) {
        issue = `Missing ${missing.map(s => s.toLowerCase()).join(', ')}`;
      }

      const warnings = [];
      if (clustered && linked.length > 0) warnings.push('All evidence added on one day — may look retrospective');
      if (singleAuthor && linked.length > 0) warnings.push('Single contributor');

      return { ...act, evidenceCount: linked.length, stepCoverage, covered, missing, issue, warnings };
    });
  }, [coreActivities, items]);

  // Insights
  const insights = useMemo(() => {
    const r = [];
    const evidence = items || [];
    const activities = coreActivities || [];

    if (costSummary?.unapportionedTotal > 0) {
      r.push({ text: `${fmt(costSummary.unapportionedTotal)} in payroll not linked to any activity — won't appear in claim`, action: 'Review costs', view: 'costs' });
    }
    if (!costSummary || costSummary.totalEligible === 0) {
      r.push({ text: 'No R&D costs recorded — upload payroll to calculate your offset', action: 'Upload costs', view: 'costs' });
    }
    if (activities.length === 0 && evidence.length >= 5) {
      r.push({ text: `${evidence.length} evidence items — enough to auto-generate R&D activities`, action: 'Generate', view: 'activities' });
    }
    const unlinked = evidence.filter(ev => !ev.linked_activity_id);
    if (unlinked.length > 3 && activities.length > 0) {
      r.push({ text: `${unlinked.length} evidence items not linked to any activity`, action: 'Review', view: 'workspace' });
    }
    if (project.current_hypothesis) {
      const h = project.current_hypothesis.toLowerCase();
      const biz = ['improve', 'increase revenue', 'reduce cost', 'grow', 'market share', 'customer satisfaction'];
      if (biz.some(w => h.includes(w)) && !h.includes('whether') && !h.includes('can we')) {
        r.push({ text: 'Hypothesis reads like a business goal — reframe around technical uncertainty', action: 'Edit', view: 'details' });
      }
    } else {
      r.push({ text: 'No hypothesis defined', action: 'Add', view: 'details' });
    }
    const framingMissing = ['technical_uncertainty', 'knowledge_gap', 'testing_method', 'success_criteria'].filter(f => !project[f]?.trim());
    if (framingMissing.length > 0 && framingMissing.length < 4) {
      r.push({ text: `${framingMissing.length} technical framing field${framingMissing.length > 1 ? 's' : ''} incomplete — weakens claim pack generation`, action: 'Complete', view: 'details' });
    }
    const supportingEv = evidence.filter(ev => ev.activity_type === 'supporting');
    const supportingAct = activities.filter(a => a.activity_type === 'supporting');
    if (supportingEv.length >= 2 && supportingAct.length === 0) {
      r.push({ text: `${supportingEv.length} supporting evidence items — consider adding a supporting activity`, action: 'Review', view: 'activities' });
    }
    return r;
  }, [items, coreActivities, costSummary, project]);

  const deadline = getDeadline(project.year_end || project.year);
  const daysLeft = daysUntil(deadline);
  const hasOffset = taxBenefit && taxBenefit.offsetAmount > 0;

  return (
    <div style={{ padding: '16px 0', maxWidth: 880 }}>

      {/* ── Offset + Deadline ── */}
      <div style={{ display: 'flex', gap: 1, marginBottom: 24, backgroundColor: '#e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
        {/* Offset */}
        <div style={{ flex: 1, backgroundColor: 'white', padding: '20px 24px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Estimated offset
          </div>
          {hasOffset ? (
            <>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#111827', lineHeight: 1, marginBottom: 6 }}>
                {fmt(taxBenefit.offsetAmount)}
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>
                {taxBenefit.refundable ? 'Refundable' : 'Non-refundable'} · {(taxBenefit.offsetRate * 100).toFixed(1)}% of {fmt(costSummary?.totalEligible)}
                {taxBenefit.estimated ? ' · turnover band not set' : ''}
              </div>
              {costSummary && (
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                  {[
                    costSummary.staffTotal > 0 && `Labour ${fmt(costSummary.staffTotal)}`,
                    costSummary.contractorTotal > 0 && `Contractors ${fmt(costSummary.contractorTotal)}`,
                    costSummary.cloudTotal > 0 && `Cloud ${fmt(costSummary.cloudTotal)}`,
                  ].filter(Boolean).join(' · ')}
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#d1d5db', lineHeight: 1, marginBottom: 6 }}>—</div>
              <button
                onClick={() => onNavigate?.('costs')}
                style={{ fontSize: 12, color: NAVY, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
              >
                Upload costs to calculate →
              </button>
            </>
          )}
        </div>

        {/* Deadline */}
        {deadline && (
          <div style={{ width: 160, backgroundColor: 'white', padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Registration
            </div>
            <div style={{
              fontSize: 22, fontWeight: 700, lineHeight: 1,
              color: daysLeft !== null && daysLeft < 0 ? '#dc2626' : daysLeft !== null && daysLeft < 60 ? '#dc2626' : '#111827',
              marginBottom: 4,
            }}>
              {daysLeft !== null && daysLeft < 0 ? 'Overdue' : daysLeft !== null ? `${daysLeft}d` : '—'}
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>
              {deadline.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
        )}
      </div>

      {/* ── Activities ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
          Activities
        </div>

        {activityStats.length === 0 ? (
          <div style={{
            padding: '24px 20px', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 8,
            fontSize: 13, color: '#6b7280', textAlign: 'center',
          }}>
            {(items || []).length >= 5
              ? <><span>No activities yet. </span><button onClick={() => onNavigate?.('activities')} style={{ color: NAVY, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 13, fontFamily: 'inherit' }}>Generate from evidence →</button></>
              : `No activities defined. Add ${Math.max(0, 5 - (items || []).length)} more evidence items for AI generation.`
            }
          </div>
        ) : (
          <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
            {activityStats.map((act, i) => (
              <div
                key={act.id}
                style={{
                  padding: '12px 16px',
                  borderBottom: i < activityStats.length - 1 ? '1px solid #f0f0f0' : 'none',
                }}
              >
                {/* Row 1: name + meta */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: act.issue || act.warnings.length ? 6 : 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{act.name}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 3,
                    backgroundColor: act.activity_type === 'supporting' ? '#f3f4f6' : NAVY,
                    color: act.activity_type === 'supporting' ? '#6b7280' : 'white',
                  }}>
                    {act.activity_type === 'supporting' ? 'Supporting' : 'Core'}
                  </span>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>
                    {act.evidenceCount} item{act.evidenceCount !== 1 ? 's' : ''}
                  </span>

                  {/* Step indicators — right-aligned */}
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
                    {STEPS.map(step => (
                      <span
                        key={step}
                        title={`${step}: ${act.stepCoverage[step]} items`}
                        style={{
                          fontSize: 10, fontWeight: 600, width: 16, height: 16, lineHeight: '16px',
                          textAlign: 'center', borderRadius: 3,
                          backgroundColor: act.stepCoverage[step] > 0 ? '#111827' : '#f3f4f6',
                          color: act.stepCoverage[step] > 0 ? 'white' : '#d1d5db',
                        }}
                      >
                        {step.charAt(0)}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Issues */}
                {act.issue && (
                  <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>
                    {act.issue}
                  </div>
                )}
                {act.warnings.map((w, j) => (
                  <div key={j} style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.4 }}>
                    {w}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Insights ── */}
      {insights.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
            Insights
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {insights.map((ins, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  padding: '10px 16px', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 8,
                }}
              >
                <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.4 }}>{ins.text}</span>
                <button
                  onClick={() => onNavigate?.(ins.view)}
                  style={{
                    flexShrink: 0, fontSize: 12, fontWeight: 600, color: NAVY,
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    fontFamily: 'inherit', whiteSpace: 'nowrap',
                  }}
                >
                  {ins.action} →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
