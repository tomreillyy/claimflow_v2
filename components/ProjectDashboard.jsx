'use client';

import { useMemo } from 'react';

const NAVY = '#021048';
const STEPS = ['Hypothesis', 'Experiment', 'Observation', 'Evaluation', 'Conclusion'];

function fmtK(val) {
  if (!val && val !== 0) return '--';
  if (Math.abs(val) >= 1000000) return '$' + (val / 1000000).toFixed(1) + 'M';
  if (Math.abs(val) >= 1000) return '$' + (val / 1000).toFixed(0) + 'K';
  return '$' + Math.round(val).toLocaleString();
}

function getDeadline(year) {
  const y = parseInt(year);
  if (!y) return null;
  const d = new Date(y, 5, 30);
  d.setMonth(d.getMonth() + 10);
  return d;
}

function daysUntil(date) {
  if (!date) return null;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const t = new Date(date); t.setHours(0, 0, 0, 0);
  return Math.ceil((t - now) / 86400000);
}

const cardBase = {
  backgroundColor: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
};

function StatCard({ label, value, valueColor, subtitle, subtitleColor, action, onAction }) {
  return (
    <div style={{
      ...cardBase,
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>{label}</div>
      <div style={{
        fontSize: 22, fontWeight: 700, lineHeight: 1.1, marginBottom: 4,
        color: valueColor || '#111827',
      }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: 13, color: subtitleColor || '#9ca3af', lineHeight: 1.4 }}>
          {subtitle}
        </div>
      )}
      {action && (
        <div style={{ marginTop: 'auto', paddingTop: 12 }}>
          <button
            onClick={onAction}
            style={{
              fontSize: 13, color: '#374151', background: 'none', border: 'none',
              cursor: 'pointer', padding: 0, fontFamily: 'inherit',
            }}
            onMouseEnter={e => e.currentTarget.style.color = NAVY}
            onMouseLeave={e => e.currentTarget.style.color = '#374151'}
          >
            {action} →
          </button>
        </div>
      )}
    </div>
  );
}

export default function ProjectDashboard({
  project, items, coreActivities, financials, onNavigate,
}) {

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
      const dates = linked.map(ev => new Date(ev.created_at).toDateString());
      const clustered = linked.length >= 3 && new Set(dates).size === 1;
      const authors = new Set(linked.map(ev => ev.author_email).filter(Boolean));
      const singleAuthor = linked.length >= 3 && authors.size === 1;

      let issue = null;
      if (linked.length === 0) issue = 'No evidence linked';
      else if (missing.length >= 3) issue = `Only ${covered.length}/5 steps — needs more systematic progression`;
      else if (missing.length > 0) issue = `Missing ${missing.map(s => s.toLowerCase()).join(', ')}`;

      const warnings = [];
      if (clustered && linked.length > 0) warnings.push('All evidence added on one day — may look retrospective');
      if (singleAuthor && linked.length > 0) warnings.push('Single contributor');

      return { ...act, evidenceCount: linked.length, stepCoverage, covered, missing, issue, warnings };
    });
  }, [coreActivities, items]);

  const insights = useMemo(() => {
    const r = [];
    const evidence = items || [];
    const activities = coreActivities || [];

    if (!financials || financials.eligibleExpenditure <= 0) {
      r.push({ text: 'No R&D costs recorded — add team and costs in Workspace', action: 'Open workspace', view: 'workspace' });
    }
    if (activities.length === 0 && evidence.length >= 5) {
      r.push({ text: `${evidence.length} evidence items — enough to auto-generate activities`, action: 'Generate', view: 'activities' });
    }
    const unlinked = evidence.filter(ev => !ev.linked_activity_id);
    if (unlinked.length > 3 && activities.length > 0) {
      r.push({ text: `${unlinked.length} evidence items not linked to any activity`, action: 'Review', view: 'workspace' });
    }
    if (!project.current_hypothesis) {
      r.push({ text: 'No hypothesis defined', action: 'Add', view: 'details' });
    }
    const framingMissing = ['technical_uncertainty', 'knowledge_gap', 'testing_method', 'success_criteria'].filter(f => !project[f]?.trim());
    if (framingMissing.length > 0 && framingMissing.length < 4) {
      r.push({ text: `${framingMissing.length} technical framing field${framingMissing.length > 1 ? 's' : ''} incomplete`, action: 'Complete', view: 'details' });
    }
    const supportingEv = evidence.filter(ev => ev.activity_type === 'supporting');
    const supportingAct = activities.filter(a => a.activity_type === 'supporting');
    if (supportingEv.length >= 2 && supportingAct.length === 0) {
      r.push({ text: `${supportingEv.length} supporting evidence items — consider a supporting activity`, action: 'Review', view: 'activities' });
    }
    if (financials?.risks) {
      for (const risk of financials.risks) {
        r.push({ text: risk.message, action: 'Review', view: 'workspace' });
      }
    }
    return r;
  }, [items, coreActivities, financials, project]);

  const deadline = getDeadline(project.year_end || project.year);
  const daysLeft = daysUntil(deadline);
  const hasOffset = financials && financials.taxOffset > 0;
  const deadlineOverdue = daysLeft !== null && daysLeft < 0;
  const deadlineUrgent = daysLeft !== null && daysLeft < 60;

  const totalEvidence = (items || []).length;
  const readyActivities = activityStats.filter(a => !a.issue).length;
  const framingComplete = ['technical_uncertainty', 'knowledge_gap', 'testing_method', 'success_criteria'].filter(f => project[f]?.trim()).length;
  const framingMissing = 4 - framingComplete;

  return (
    <div style={{ padding: '0 0 12px' }}>

      {/* ── Row 1 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 14 }}>
        <StatCard
          label={hasOffset ? (financials.isRefundable ? 'Refundable Cash Offset' : 'Tax Offset') : 'Estimated Offset'}
          value={hasOffset ? fmtK(financials.taxOffset) : '--'}
          valueColor={hasOffset ? '#16a34a' : '#d1d5db'}
          subtitle={hasOffset ? `${(financials.offsetRate * 100).toFixed(1)}% of ${fmtK(financials.eligibleExpenditure)} eligible` : undefined}
          action={hasOffset ? 'View financials' : 'Add costs'}
          onAction={() => onNavigate?.('workspace')}
        />
        <StatCard
          label="Eligible R&D Spend"
          value={hasOffset ? fmtK(financials.eligibleExpenditure) : '--'}
          subtitle={hasOffset ? [
            financials.totalSalaries > 0 && `Salaries ${fmtK(financials.totalSalaries)}`,
            financials.contractorsTotal > 0 && `Contractors ${fmtK(financials.contractorsTotal)}`,
          ].filter(Boolean).join(', ') || undefined : undefined}
          action={hasOffset ? 'View breakdown' : undefined}
          onAction={() => onNavigate?.('workspace')}
        />
        <StatCard
          label="Registration Deadline"
          value={deadlineOverdue ? 'Overdue' : daysLeft !== null ? `${daysLeft} days` : '--'}
          valueColor={deadlineOverdue || deadlineUrgent ? '#dc2626' : '#111827'}
          subtitle={deadline ? `Due ${deadline.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}` : undefined}
          subtitleColor={deadlineUrgent ? '#dc2626' : '#9ca3af'}
        />
      </div>

      {/* ── Row 2 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard
          label="R&D Activities"
          value={activityStats.length > 0 ? `${readyActivities}/${activityStats.length}` : '0'}
          subtitle={activityStats.length > 0
            ? (readyActivities === activityStats.length ? 'All activities ready' : `${activityStats.length - readyActivities} need attention`)
            : `${totalEvidence} evidence items collected`}
          subtitleColor={activityStats.length > 0 && readyActivities < activityStats.length ? '#d97706' : '#9ca3af'}
          action="View activities"
          onAction={() => onNavigate?.('activities')}
        />
        <StatCard
          label="Evidence Collected"
          value={totalEvidence}
          subtitle={totalEvidence > 0
            ? `Across ${new Set((items || []).map(e => e.source)).size} source${new Set((items || []).map(e => e.source)).size !== 1 ? 's' : ''}`
            : 'No evidence yet'}
          action="View evidence"
          onAction={() => onNavigate?.('workspace')}
        />
        <StatCard
          label="Technical Framing"
          value={`${framingComplete}/4`}
          subtitle={framingMissing === 0 ? 'All fields complete' : `${framingMissing} field${framingMissing > 1 ? 's' : ''} need attention`}
          subtitleColor={framingMissing > 0 ? '#d97706' : '#9ca3af'}
          action="Edit details"
          onAction={() => onNavigate?.('details')}
        />
      </div>

      {/* ── Bottom tables ── */}
      <div style={{ display: 'grid', gridTemplateColumns: insights.length > 0 ? '1fr 1fr' : '1fr', gap: 14, alignItems: 'start' }}>

        {/* Insights */}
        {insights.length > 0 && (
          <div style={{ ...cardBase, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', fontSize: 15, fontWeight: 600, color: '#111827' }}>
              Attention needed
            </div>
            <div style={{ maxHeight: 340, overflowY: 'auto' }}>
              {insights.map((ins, i) => (
                <div key={i} style={{
                  padding: '12px 20px', borderTop: i > 0 ? '1px solid #f0f0f0' : 'none',
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
                }}>
                  <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{ins.text}</span>
                  <button
                    onClick={() => onNavigate?.(ins.view)}
                    style={{ flexShrink: 0, fontSize: 13, color: '#374151', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                    onMouseEnter={e => e.currentTarget.style.color = NAVY}
                    onMouseLeave={e => e.currentTarget.style.color = '#374151'}
                  >
                    {ins.action} →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activities */}
        <div style={{ ...cardBase, overflow: 'hidden' }}>
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid #f0f0f0',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>R&D Activities</span>
            {activityStats.length > 0 && (
              <span style={{ fontSize: 12, color: '#9ca3af' }}>{readyActivities}/{activityStats.length} ready</span>
            )}
          </div>
          {activityStats.length === 0 ? (
            <div style={{ padding: '20px', fontSize: 13, color: '#6b7280' }}>
              {totalEvidence >= 5
                ? <>No activities defined. <button onClick={() => onNavigate?.('activities')} style={{ color: NAVY, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 13, fontFamily: 'inherit' }}>Generate from evidence →</button></>
                : `No activities. Add ${Math.max(0, 5 - totalEvidence)} more evidence for AI generation.`}
            </div>
          ) : (
            <div style={{ maxHeight: 340, overflowY: 'auto' }}>
              {activityStats.map((act, i) => (
                <div key={act.id} style={{ padding: '12px 20px', borderTop: i > 0 ? '1px solid #f0f0f0' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: act.issue || act.warnings.length ? 4 : 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{act.name}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, flexShrink: 0,
                      backgroundColor: act.activity_type === 'supporting' ? '#f3f4f6' : NAVY,
                      color: act.activity_type === 'supporting' ? '#6b7280' : 'white',
                    }}>
                      {act.activity_type === 'supporting' ? 'Supporting' : 'Core'}
                    </span>
                    <span style={{ fontSize: 12, color: '#9ca3af', flexShrink: 0 }}>{act.evidenceCount}</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 3, flexShrink: 0 }}>
                      {STEPS.map(step => (
                        <span key={step} title={`${step}: ${act.stepCoverage[step]} items`} style={{
                          fontSize: 10, fontWeight: 600, width: 16, height: 16, lineHeight: '16px',
                          textAlign: 'center', borderRadius: 3,
                          backgroundColor: act.stepCoverage[step] > 0 ? '#111827' : '#f3f4f6',
                          color: act.stepCoverage[step] > 0 ? 'white' : '#d1d5db',
                        }}>
                          {step.charAt(0)}
                        </span>
                      ))}
                    </div>
                  </div>
                  {act.issue && <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>{act.issue}</div>}
                  {act.warnings.map((w, j) => <div key={j} style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.4 }}>{w}</div>)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
