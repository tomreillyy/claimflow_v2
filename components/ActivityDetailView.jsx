'use client';
import { useState, useEffect } from 'react';
import EvidencePicker from './EvidencePicker';

const NAVY = '#021048';

const STAGES = [
  { key: 'Hypothesis',  hint: 'What were you trying to prove?' },
  { key: 'Experiment',  hint: 'What did you build or test?' },
  { key: 'Observation', hint: 'What happened or what did you measure?' },
  { key: 'Evaluation',  hint: 'What did the results mean?' },
  { key: 'Conclusion',  hint: 'What did you learn?' },
];

const SRC_LABELS = { manual: 'M', note: 'M', email: '@', github: 'G', document: 'D', upload: 'U' };

function SrcBadge({ src }) {
  return (
    <span style={{
      width: 18, height: 18, borderRadius: 3, flexShrink: 0,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: '#f3f4f6', border: '1px solid #e5e7eb',
      fontSize: 9, fontWeight: 700, color: '#6b7280', fontFamily: 'ui-monospace,monospace',
    }}>
      {SRC_LABELS[src] || '?'}
    </span>
  );
}

export default function ActivityDetailView({
  activity,
  token,
  allEvidence,
  onAdopt,
  onUpdate,
  onCoverageChange,
}) {
  const [stepData, setStepData] = useState({
    Hypothesis: [], Experiment: [], Observation: [], Evaluation: [], Conclusion: [],
  });
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState(null);
  const [pickerStep, setPickerStep] = useState(null);
  const [adopting, setAdopting] = useState(false);
  const [hText, setHText] = useState(activity.hypothesis_text || '');
  const [cText, setCText] = useState(activity.conclusion_text || '');

  const isDraft = !activity.status || activity.status === 'draft';
  const isAdopted = activity.status === 'adopted';

  useEffect(() => {
    setHText(activity.hypothesis_text || '');
    setCText(activity.conclusion_text || '');
    setActiveStage(null);
    fetchStepData();
  }, [activity.id]);

  const fetchStepData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${token}/core-activities/${activity.id}/evidence`);
      if (res.ok) {
        const data = await res.json();
        if (data._error) console.error('[ActivityDetailView]', data._error);
        const steps = data.steps || { Hypothesis: [], Experiment: [], Observation: [], Evaluation: [], Conclusion: [] };
        setStepData(steps);
        setActiveStage(prev => {
          if (prev) return prev;
          const firstEmpty = STAGES.find(s => !(steps[s.key] || []).length);
          return firstEmpty?.key || 'Hypothesis';
        });
      }
    } catch (err) {
      console.error('Failed to fetch step data:', err);
    }
    setLoading(false);
  };

  const handleLinkEvidence = async (evidenceIds, step) => {
    try {
      const { supabase } = await import('@/lib/supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/projects/${token}/core-activities/${activity.id}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ evidence_ids: evidenceIds, step }),
      });
      if (res.ok) {
        await fetchStepData();
        onCoverageChange?.();
      }
    } catch (err) {
      console.error('Failed to link evidence:', err);
    }
  };

  const handleUnlinkEvidence = async (evidenceId, step) => {
    try {
      const { supabase } = await import('@/lib/supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`/api/projects/${token}/core-activities/${activity.id}/evidence`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ evidence_ids: [evidenceId], step }),
      });
      await fetchStepData();
      onCoverageChange?.();
    } catch (err) {
      console.error('Failed to unlink evidence:', err);
    }
  };

  const handleAdopt = async () => {
    setAdopting(true);
    await onAdopt(activity.id);
    setAdopting(false);
  };

  const handleSaveText = async (field, value) => {
    try {
      const { supabase } = await import('@/lib/supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`/api/projects/${token}/core-activities/${activity.id}/step-text`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ field, value }),
      });
      onUpdate?.(activity.id, { [field]: value });
    } catch (err) {
      console.error('Failed to save text:', err);
    }
  };

  const coveredCount = STAGES.filter(s => (stepData[s.key] || []).length > 0).length;
  const canAdopt = coveredCount >= 3;

  const linkedIds = new Set();
  STAGES.forEach(s => (stepData[s.key] || []).forEach(ev => linkedIds.add(ev.id)));

  const activeItems = stepData[activeStage] || [];
  const activeStageObj = STAGES.find(s => s.key === activeStage);

  const fmtDate = (ts) => ts ? new Date(ts).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '';
  const snippet = (text) => (text || '').length > 200 ? (text || '').slice(0, 200) + '...' : (text || '');

  if (loading) {
    return <div style={{ padding: '16px 18px', fontSize: 13, color: '#9ca3af' }}>Loading...</div>;
  }

  return (
    <div>
      {/* Uncertainty paragraph */}
      <p style={{ margin: 0, padding: '12px 18px', fontSize: 13, color: '#6b7280', lineHeight: 1.65, borderBottom: '1px solid #f3f4f6' }}>
        {activity.uncertainty}
      </p>

      {isAdopted ? (
        /* Adopted: all stages at once, read-only */
        <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {STAGES.map(s => {
            const items = stepData[s.key] || [];
            return (
              <div key={s.key}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: items.length ? '#374151' : '#d1d5db', marginBottom: 8 }}>
                  {items.length ? '✓ ' : ''}{s.key}
                </div>
                {items.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 12, borderLeft: '2px solid #f0f0f0' }}>
                    {items.map(item => (
                      <div key={item.id} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                        <SrcBadge src={item.source} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'ui-monospace,monospace', marginBottom: 1 }}>{fmtDate(item.created_at)}</div>
                          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.55 }}>{snippet(item.content)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ paddingLeft: 12, borderLeft: '2px solid #f0f0f0', fontSize: 12, color: '#d1d5db' }}>No evidence</div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Draft: tabbed stage panel */
        <div>
          {/* Tab row */}
          <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0' }}>
            {STAGES.map(s => {
              const done = (stepData[s.key] || []).length > 0;
              const isActive = activeStage === s.key;
              const count = (stepData[s.key] || []).length;
              return (
                <button key={s.key} onClick={() => setActiveStage(s.key)} style={{
                  flex: 1, padding: '10px 4px', border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', textAlign: 'center', background: 'white',
                  borderBottom: isActive ? `2px solid ${NAVY}` : '2px solid transparent',
                  marginBottom: -1,
                }}>
                  <div style={{ fontSize: 11, fontWeight: isActive ? 700 : 500, color: isActive ? NAVY : done ? '#374151' : '#9ca3af' }}>
                    {done && !isActive ? '✓ ' : ''}{s.key}
                  </div>
                  <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>
                    {count > 0 ? `${count} item${count > 1 ? 's' : ''}` : 'empty'}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Stage content */}
          <div style={{ padding: '16px 18px', minHeight: 100 }}>
            {activeStageObj && (
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>{activeStageObj.hint}</div>
            )}

            {/* H/C textarea — auto-saves on blur */}
            {(activeStage === 'Hypothesis' || activeStage === 'Conclusion') && (
              <textarea
                value={activeStage === 'Hypothesis' ? hText : cText}
                onChange={e => activeStage === 'Hypothesis' ? setHText(e.target.value) : setCText(e.target.value)}
                onBlur={() => {
                  const field = activeStage === 'Hypothesis' ? 'hypothesis_text' : 'conclusion_text';
                  const val = activeStage === 'Hypothesis' ? hText : cText;
                  handleSaveText(field, val);
                }}
                placeholder={activeStageObj?.hint || ''}
                rows={2}
                style={{
                  width: '100%', padding: '8px 10px', fontSize: 13, lineHeight: 1.6,
                  border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none',
                  resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit',
                  color: '#111827', background: 'white',
                  marginBottom: activeItems.length ? 12 : 8,
                }}
              />
            )}

            {/* Evidence items */}
            {activeItems.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                {activeItems.map(item => (
                  <div key={item.id} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '9px 11px', background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 6 }}>
                    <SrcBadge src={item.source} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'ui-monospace,monospace', marginBottom: 2 }}>{fmtDate(item.created_at)}</div>
                      <div style={{ fontSize: 13, color: '#1f2937', lineHeight: 1.6 }}>{snippet(item.content)}</div>
                    </div>
                    <button
                      onClick={() => handleUnlinkEvidence(item.id, activeStage)}
                      style={{ flexShrink: 0, background: 'none', border: 'none', color: '#d1d5db', fontSize: 14, cursor: 'pointer', padding: '0 2px' }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setPickerStep(activeStage)}
              style={{
                fontSize: 12, fontWeight: 500,
                color: activeItems.length ? '#6b7280' : '#374151',
                background: 'none',
                border: `1px dashed ${activeItems.length ? '#e5e7eb' : '#9ca3af'}`,
                borderRadius: 5, cursor: 'pointer', padding: '6px 12px', fontFamily: 'inherit',
              }}
            >
              {activeItems.length ? `+ Link more to ${activeStage}` : `+ Link evidence to ${activeStage}`}
            </button>
          </div>
        </div>
      )}

      {/* Adopt footer — draft only */}
      {isDraft && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderTop: '1px solid #f3f4f6', background: '#fafafa' }}>
          <span style={{ fontSize: 12, color: canAdopt ? '#374151' : '#9ca3af' }}>
            {canAdopt
              ? 'Ready to adopt — will be included in your claim pack'
              : `${3 - coveredCount} more stage${3 - coveredCount === 1 ? '' : 's'} needed`}
          </span>
          <button
            onClick={handleAdopt}
            disabled={!canAdopt || adopting}
            style={{
              padding: '6px 16px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: 'none',
              background: canAdopt ? NAVY : '#e5e7eb',
              color: canAdopt ? 'white' : '#9ca3af',
              cursor: canAdopt && !adopting ? 'pointer' : 'default',
              fontFamily: 'inherit',
            }}
          >
            {adopting ? 'Adopting...' : 'Adopt activity'}
          </button>
        </div>
      )}

      {/* Evidence Picker Modal */}
      {pickerStep && (
        <EvidencePicker
          step={pickerStep}
          allEvidence={allEvidence}
          linkedEvidenceIds={linkedIds}
          onLink={(ids) => { handleLinkEvidence(ids, pickerStep); setPickerStep(null); }}
          onClose={() => setPickerStep(null)}
        />
      )}
    </div>
  );
}
