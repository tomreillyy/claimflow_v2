'use client';

import { useMemo } from 'react';

const NAVY = '#021048';
const STEPS = ['Hypothesis', 'Experiment', 'Observation', 'Evaluation', 'Conclusion'];

const card = {
  backgroundColor: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  overflow: 'hidden',
};

const label = {
  fontSize: 11, color: '#6b7280', fontWeight: 500,
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2,
};

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

export default function ProjectDashboard({
  project, items, token, coreActivities, financials, onNavigate,
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
  const deadlineUrgent = daysLeft !== null && daysLeft < 60;
  const deadlineOverdue = daysLeft !== null && daysLeft < 0;

  return (
    <div style={{ padding: '16px 0' }}>

      {/* ── Financials card ── */}
      <div style={{ ...card, padding: '14px 20px', display: 'flex', alignItems: 'flex-end', gap: 24, marginBottom: 12 }}>
        <div>
          <div style={label}>
            {hasOffset ? (financials.isRefundable ? 'Refundable Offset' : 'Tax Offset') : 'Estimated Offset'}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1e3a5f', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
            {hasOffset ? fmtK(financials.taxOffset) : '--'}
          </div>
          {!hasOffset && (
            <button onClick={() => onNavigate?.('workspace')} style={{ fontSize: 11, color: NAVY, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', marginTop: 2 }}>
              Add costs →
            </button>
          )}
        </div>
        {hasOffset && (
          <div>
            <div style={label}>Eligible Spend</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
              {fmtK(financials.eligibleExpenditure)}
            </div>
          </div>
        )}
        {hasOffset && (
          <div>
            <div style={label}>Offset Rate</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
              {(financials.offsetRate * 100).toFixed(1)}%
              <span style={{
                marginLeft: 8, fontSize: 10, fontWeight: 600, color: 'white',
                backgroundColor: financials.isRefundable ? '#16a34a' : '#2563eb',
                padding: '2px 6px', borderRadius: 4, fontFamily: 'system-ui', verticalAlign: 'middle',
              }}>
                {financials.isRefundable ? 'Refundable' : 'Non-refundable'}
              </span>
            </div>
          </div>
        )}
        {deadline && (
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={label}>Registration</div>
            <div style={{
              fontSize: 16, fontWeight: 600, fontFamily: 'monospace', whiteSpace: 'nowrap',
              color: deadlineOverdue || deadlineUrgent ? '#dc2626' : '#1a1a1a',
            }}>
              {deadlineOverdue ? 'Overdue' : `${daysLeft}d`}
            </div>
            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>
              {deadline.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
        )}
      </div>

      {/* ── Insights card ── */}
      {insights.length > 0 && (
        <div style={{ ...card, marginBottom: 12 }}>
          {insights.map((ins, i) => (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                padding: '10px 20px',
                borderTop: i > 0 ? '1px solid #f0f0f0' : 'none',
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
      )}

      {/* ── Activities card ── */}
      <div style={card}>
        <div style={{
          padding: '10px 20px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>R&D Activities</span>
          {activityStats.length > 0 && (
            <span style={{ fontSize: 12, color: '#9ca3af' }}>
              {activityStats.filter(a => !a.issue).length}/{activityStats.length} ready
            </span>
          )}
        </div>

        {activityStats.length === 0 ? (
          <div style={{ padding: '14px 20px', fontSize: 13, color: '#6b7280' }}>
            {(items || []).length >= 5
              ? <><span>No activities defined. </span><button onClick={() => onNavigate?.('activities')} style={{ color: NAVY, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 13, fontFamily: 'inherit' }}>Generate from evidence →</button></>
              : `No activities. Add ${Math.max(0, 5 - (items || []).length)} more evidence for AI generation.`
            }
          </div>
        ) : (
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {activityStats.map((act, i) => (
              <div
                key={act.id}
                style={{
                  padding: '10px 20px',
                  borderTop: i > 0 ? '1px solid #f0f0f0' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: act.issue || act.warnings.length ? 4 : 0 }}>
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
                {act.issue && <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>{act.issue}</div>}
                {act.warnings.map((w, j) => <div key={j} style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.4 }}>{w}</div>)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
