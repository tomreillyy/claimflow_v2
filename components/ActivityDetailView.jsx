'use client';
import { useState, useEffect } from 'react';
import EvidencePicker from './EvidencePicker';
import { formatAuditTimestamp } from '@/lib/formatAuditTimestamp';

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

// Wrapper that reveals action buttons on hover
function EvidenceRow({ item, isEditing, onMove, onUnlink, children }) {
  const [hovered, setHovered] = useState(false);
  const showActions = hovered || isEditing;
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '9px 11px', background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 6 }}
    >
      {children}
      <div style={{ display: 'flex', gap: 5, flexShrink: 0, alignItems: 'center', opacity: showActions ? 1 : 0, transition: 'opacity 0.12s' }}>
        <button
          onClick={onMove}
          style={{ padding: '2px 7px', fontSize: 11, fontWeight: 500, color: '#6b7280', background: 'white', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {isEditing ? 'Cancel' : 'Move'}
        </button>
        {onUnlink && (
          <button
            onClick={onUnlink}
            style={{ padding: '2px 7px', fontSize: 11, fontWeight: 500, color: '#6b7280', background: 'white', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#fca5a5'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.borderColor = '#d1d5db'; }}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

export default function ActivityDetailView({
  activity,
  token,
  allEvidence,
  activities = [],       // full list for "move to different activity"
  onAdopt,
  onUpdate,
  onCoverageChange,
  onMovedToActivity,     // callback(activityId) when evidence is moved to a different activity
  onUnAdopt,             // callback(activityId) to revert adopted → draft
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

  // Move state
  const [editingEv, setEditingEv] = useState(null); // { id, currentStep }
  const [moveToAct, setMoveToAct] = useState('');
  const [moveToStep, setMoveToStep] = useState('');
  const [moving, setMoving] = useState(false);

  const isDraft = !activity.status || activity.status === 'draft';
  const isAdopted = activity.status === 'adopted';

  useEffect(() => {
    setHText(activity.hypothesis_text || '');
    setCText(activity.conclusion_text || '');
    setActiveStage(null);
    setEditingEv(null);
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

  const getSession = async () => {
    const { supabase } = await import('@/lib/supabaseClient');
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  };

  const handleLinkEvidence = async (evidenceIds, step) => {
    try {
      const session = await getSession();
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
      const session = await getSession();
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

  const openMovePanel = (evidenceId, currentStep) => {
    setEditingEv({ id: evidenceId, currentStep });
    setMoveToAct(activity.id);
    setMoveToStep(currentStep);
  };

  const handleMove = async () => {
    if (!editingEv) return;
    const { id, currentStep } = editingEv;
    if (moveToAct === activity.id && moveToStep === currentStep) {
      setEditingEv(null);
      return;
    }
    setMoving(true);
    try {
      const session = await getSession();
      // 1. Unlink from current position
      await fetch(`/api/projects/${token}/core-activities/${activity.id}/evidence`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ evidence_ids: [id], step: currentStep }),
      });
      // 2. Link to new position
      await fetch(`/api/projects/${token}/core-activities/${moveToAct}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ evidence_ids: [id], step: moveToStep }),
      });
      setEditingEv(null);
      await fetchStepData();
      onCoverageChange?.();
      // If moved to a different activity, notify parent to refresh that activity's dots too
      if (moveToAct !== activity.id) {
        onMovedToActivity?.(moveToAct);
      }
    } catch (err) {
      console.error('Failed to move evidence:', err);
    }
    setMoving(false);
  };

  const handleAdopt = async () => {
    setAdopting(true);
    await onAdopt(activity.id);
    setAdopting(false);
  };

  const handleSaveText = async (field, value) => {
    try {
      const session = await getSession();
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

  const fmtDate = (ts) => formatAuditTimestamp(ts);
  const snippet = (text) => (text || '').length > 200 ? (text || '').slice(0, 200) + '...' : (text || '');

  // Inline reassign panel — shared between draft and adopted views
  const MovePanel = ({ evidenceId, currentStep }) => {
    const isSamePosition = moveToAct === activity.id && moveToStep === currentStep;
    return (
      <div style={{
        marginTop: 4, padding: '10px 12px',
        background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8,
      }}>
        {activities.length > 1 && (
          <>
            <span style={{ fontSize: 12, color: '#6b7280' }}>Activity</span>
            <select
              value={moveToAct}
              onChange={e => setMoveToAct(e.target.value)}
              style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 5, color: '#111827', background: 'white', maxWidth: 200, fontFamily: 'inherit' }}
            >
              {activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </>
        )}
        <span style={{ fontSize: 12, color: '#6b7280' }}>Stage</span>
        <div style={{ display: 'flex', gap: 3 }}>
          {STAGES.map(s => (
            <button key={s.key} onClick={() => setMoveToStep(s.key)} style={{
              padding: '3px 8px', fontSize: 11, fontWeight: 600, borderRadius: 4, cursor: 'pointer',
              background: moveToStep === s.key ? NAVY : 'white',
              color: moveToStep === s.key ? 'white' : '#6b7280',
              border: `1px solid ${moveToStep === s.key ? NAVY : '#d1d5db'}`,
              fontFamily: 'inherit',
            }}>
              {s.key.slice(0, 3)}
            </button>
          ))}
        </div>
        <button
          onClick={handleMove}
          disabled={moving || isSamePosition}
          style={{
            padding: '4px 12px', fontSize: 12, fontWeight: 600,
            background: isSamePosition ? '#e5e7eb' : NAVY,
            color: isSamePosition ? '#9ca3af' : 'white',
            border: 'none', borderRadius: 5,
            cursor: (moving || isSamePosition) ? 'default' : 'pointer',
            fontFamily: 'inherit', opacity: moving ? 0.7 : 1,
          }}
        >
          {moving ? 'Moving...' : 'Confirm'}
        </button>
        <button
          onClick={() => setEditingEv(null)}
          style={{ padding: '4px 8px', fontSize: 12, color: '#6b7280', background: 'white', border: '1px solid #e5e7eb', borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Cancel
        </button>
      </div>
    );
  };

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
        /* Adopted: all stages at once */
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
                      <div key={item.id}>
                        <EvidenceRow
                          item={item}
                          isEditing={editingEv?.id === item.id}
                          onMove={() => editingEv?.id === item.id ? setEditingEv(null) : openMovePanel(item.id, s.key)}
                        >
                          <SrcBadge src={item.source} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'ui-monospace,monospace', marginBottom: 2, fontWeight: 500 }}>{fmtDate(item.created_at)}</div>
                            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.55 }}>{snippet(item.content)}</div>
                          </div>
                        </EvidenceRow>
                        {editingEv?.id === item.id && <MovePanel evidenceId={item.id} currentStep={s.key} />}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ paddingLeft: 12, borderLeft: '2px solid #f0f0f0', fontSize: 12, color: '#d1d5db' }}>No evidence</div>
                )}
                {/* Link more evidence — available even on adopted activities */}
                <button
                  onClick={() => setPickerStep(s.key)}
                  style={{
                    marginTop: 7, marginLeft: 12, fontSize: 11, fontWeight: 500,
                    color: '#9ca3af', background: 'none',
                    border: '1px dashed #e5e7eb', borderRadius: 4,
                    cursor: 'pointer', padding: '4px 10px', fontFamily: 'inherit',
                  }}
                >
                  + Link more to {s.key}
                </button>
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
                <button key={s.key} onClick={() => { setActiveStage(s.key); setEditingEv(null); }} style={{
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
                  <div key={item.id}>
                    <EvidenceRow
                      item={item}
                      isEditing={editingEv?.id === item.id}
                      onMove={() => editingEv?.id === item.id ? setEditingEv(null) : openMovePanel(item.id, activeStage)}
                      onUnlink={() => handleUnlinkEvidence(item.id, activeStage)}
                    >
                      <SrcBadge src={item.source} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'ui-monospace,monospace', marginBottom: 2, fontWeight: 500 }}>{fmtDate(item.created_at)}</div>
                        <div style={{ fontSize: 13, color: '#1f2937', lineHeight: 1.6 }}>{snippet(item.content)}</div>
                      </div>
                    </EvidenceRow>
                    {editingEv?.id === item.id && <MovePanel evidenceId={item.id} currentStep={activeStage} />}
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

      {/* Un-adopt footer — adopted only */}
      {isAdopted && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderTop: '1px solid #f3f4f6', background: '#f0fdf4' }}>
          <span style={{ fontSize: 12, color: '#166534' }}>Adopted · included in your claim pack</span>
          <button
            onClick={() => {
              if (confirm('Un-adopt this activity? It will move back to draft and be excluded from your claim pack until re-adopted.')) {
                onUnAdopt?.(activity.id);
              }
            }}
            style={{ padding: '5px 14px', fontSize: 12, fontWeight: 500, color: '#6b7280', background: 'white', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Un-adopt
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
