'use client';
import { useState, useEffect } from 'react';
import EvidencePicker from './EvidencePicker';

const STEPS = ['Hypothesis', 'Experiment', 'Observation', 'Evaluation', 'Conclusion'];
const STEP_COLORS = {
  Hypothesis: '#6366f1',
  Experiment: '#0ea5e9',
  Observation: '#10b981',
  Evaluation: '#f59e0b',
  Conclusion: '#8b5cf6',
};
const SOURCE_ICONS = { manual: 'M', note: 'M', email: '@', github: 'G', document: 'D', upload: 'U' };

export default function ActivityDetailView({
  activity,
  token,
  allEvidence,
  stepCoverage: initialCoverage,
  onBack,
  onAdopt,
  onUpdate,
  onCoverageChange,
}) {
  const [stepData, setStepData] = useState({});
  const [loading, setLoading] = useState(true);
  const [pickerStep, setPickerStep] = useState(null);
  const [adopting, setAdopting] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState(activity.name);
  const [editUncertainty, setEditUncertainty] = useState(activity.uncertainty);
  const [editingField, setEditingField] = useState(null);
  const [editFieldValue, setEditFieldValue] = useState('');
  const [collapsedSteps, setCollapsedSteps] = useState(new Set());

  useEffect(() => {
    fetchStepData();
  }, [activity.id]);

  const fetchStepData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${token}/core-activities/${activity.id}/evidence`);
      if (res.ok) {
        const data = await res.json();
        setStepData(data.steps);
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ evidence_ids: evidenceIds, step })
      });
      if (res.ok) {
        await fetchStepData();
        onCoverageChange();
      }
    } catch (err) {
      console.error('Failed to link evidence:', err);
    }
  };

  const handleUnlinkEvidence = async (evidenceId, step) => {
    try {
      const { supabase } = await import('@/lib/supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/projects/${token}/core-activities/${activity.id}/evidence`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ evidence_ids: [evidenceId], step })
      });
      if (res.ok) {
        await fetchStepData();
        onCoverageChange();
      }
    } catch (err) {
      console.error('Failed to unlink evidence:', err);
    }
  };

  const handleAdopt = async () => {
    setAdopting(true);
    const success = await onAdopt(activity.id);
    setAdopting(false);
    if (success) onBack();
  };

  const handleSaveName = async () => {
    if (!editName.trim() || !editUncertainty.trim()) return;
    await onUpdate(activity.id, { name: editName.trim(), uncertainty: editUncertainty.trim() });
    setEditingName(false);
  };

  const handleSaveStepText = async (field) => {
    try {
      const { supabase } = await import('@/lib/supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`/api/projects/${token}/core-activities/${activity.id}/step-text`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ field, value: editFieldValue })
      });
      onUpdate(activity.id, { [field]: editFieldValue });
    } catch (err) {
      console.error('Failed to save step text:', err);
    }
    setEditingField(null);
  };

  const toggleCollapse = (step) => {
    setCollapsedSteps(prev => {
      const next = new Set(prev);
      if (next.has(step)) next.delete(step);
      else next.add(step);
      return next;
    });
  };

  const isDraft = activity.status === 'draft' || !activity.status;
  const coveredSteps = STEPS.filter(s => (stepData[s] || []).length > 0);
  const canAdopt = coveredSteps.length >= 3;

  // Gather all evidence IDs already linked to this activity
  const linkedEvidenceIds = new Set();
  STEPS.forEach(s => {
    (stepData[s] || []).forEach(ev => linkedEvidenceIds.add(ev.id));
  });

  return (
    <div style={{ padding: '20px 0' }}>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 0',
          background: 'none',
          border: 'none',
          color: '#64748b',
          fontSize: 13,
          cursor: 'pointer',
          marginBottom: 16,
          fontFamily: 'inherit',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#021048'}
        onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
      >
        <span style={{ fontSize: 16 }}>&larr;</span> Back to Activities
      </button>

      {/* Activity header */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 24,
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ flex: 1 }}>
            {/* Status + source */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{
                padding: '3px 10px',
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                backgroundColor: isDraft ? '#fef3c7' : '#dcfce7',
                color: isDraft ? '#92400e' : '#166534',
              }}>
                {isDraft ? 'Draft' : 'Adopted'}
              </span>
              {activity.source === 'ai' && (
                <span style={{ fontSize: 11, color: '#94a3b8' }}>AI-generated</span>
              )}
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                {coveredSteps.length}/5 steps covered
              </span>
            </div>

            {/* Name + uncertainty */}
            {editingName ? (
              <div style={{ marginBottom: 8 }}>
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 10px', fontSize: 18, fontWeight: 600,
                    border: '1px solid #d1d5db', borderRadius: 6, outline: 'none',
                    marginBottom: 8, boxSizing: 'border-box', color: '#0f172a',
                  }}
                  onFocus={e => e.target.style.borderColor = '#021048'}
                  onBlur={e => e.target.style.borderColor = '#d1d5db'}
                />
                <textarea
                  value={editUncertainty}
                  onChange={e => setEditUncertainty(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%', padding: '8px 10px', fontSize: 14,
                    border: '1px solid #d1d5db', borderRadius: 6, outline: 'none',
                    resize: 'vertical', marginBottom: 8, boxSizing: 'border-box', color: '#374151',
                  }}
                  onFocus={e => e.target.style.borderColor = '#021048'}
                  onBlur={e => e.target.style.borderColor = '#d1d5db'}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleSaveName} style={smallBtnPrimary}>Save</button>
                  <button onClick={() => { setEditingName(false); setEditName(activity.name); setEditUncertainty(activity.uncertainty); }} style={smallBtnSecondary}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 600, color: '#0f172a', margin: '0 0 6px 0' }}>
                    {activity.name}
                  </h2>
                  {isDraft && (
                    <button
                      onClick={() => setEditingName(true)}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}
                    >
                      Edit
                    </button>
                  )}
                </div>
                <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                  {activity.uncertainty}
                </p>
              </>
            )}
          </div>

          {/* Adopt button */}
          {isDraft && (
            <button
              onClick={handleAdopt}
              disabled={!canAdopt || adopting}
              title={!canAdopt ? 'At least 3 systematic steps must have linked evidence' : ''}
              style={{
                padding: '10px 24px',
                backgroundColor: canAdopt ? '#021048' : '#94a3b8',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: canAdopt ? 'pointer' : 'not-allowed',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                opacity: adopting ? 0.7 : 1,
              }}
            >
              {adopting ? 'Adopting...' : 'Adopt Activity'}
            </button>
          )}
        </div>
      </div>

      {/* Step Sections */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading evidence...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {STEPS.map(step => {
            const items = stepData[step] || [];
            const isCollapsed = collapsedSteps.has(step);
            const hasItems = items.length > 0;
            const isTextStep = step === 'Hypothesis' || step === 'Conclusion';
            const textField = step === 'Hypothesis' ? 'hypothesis_text' : step === 'Conclusion' ? 'conclusion_text' : null;
            const textValue = textField ? activity[textField] : null;

            return (
              <div key={step} style={{
                backgroundColor: 'white',
                border: `1px solid ${hasItems ? STEP_COLORS[step] + '30' : '#e5e7eb'}`,
                borderRadius: 10,
                overflow: 'hidden',
              }}>
                {/* Step header */}
                <div
                  onClick={() => toggleCollapse(step)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 20px',
                    cursor: 'pointer',
                    backgroundColor: hasItems ? STEP_COLORS[step] + '08' : 'transparent',
                    borderBottom: isCollapsed ? 'none' : `1px solid ${hasItems ? STEP_COLORS[step] + '20' : '#f1f5f9'}`,
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: hasItems ? STEP_COLORS[step] : '#cbd5e1',
                    }} />
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{step}</span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>
                      {items.length} {items.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: '#94a3b8', transition: 'transform 0.2s', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                    &#9660;
                  </span>
                </div>

                {/* Step content */}
                {!isCollapsed && (
                  <div style={{ padding: '12px 20px' }}>
                    {/* Editable text for Hypothesis / Conclusion */}
                    {isTextStep && (
                      <div style={{ marginBottom: items.length > 0 ? 14 : 0 }}>
                        {editingField === textField ? (
                          <div>
                            <textarea
                              value={editFieldValue}
                              onChange={e => setEditFieldValue(e.target.value)}
                              rows={3}
                              placeholder={step === 'Hypothesis'
                                ? 'We hypothesized that...'
                                : 'This activity determined that...'}
                              style={{
                                width: '100%', padding: '10px 12px', fontSize: 14,
                                border: '1px solid #d1d5db', borderRadius: 6, outline: 'none',
                                resize: 'vertical', marginBottom: 8, boxSizing: 'border-box',
                                color: '#374151', lineHeight: 1.5,
                              }}
                              autoFocus
                            />
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => handleSaveStepText(textField)} style={smallBtnPrimary}>Save</button>
                              <button onClick={() => setEditingField(null)} style={smallBtnSecondary}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => { if (isDraft) { setEditingField(textField); setEditFieldValue(textValue || ''); } }}
                            style={{
                              padding: '10px 14px',
                              backgroundColor: textValue ? '#f8fafc' : '#fefce8',
                              border: `1px dashed ${textValue ? '#e2e8f0' : '#fde68a'}`,
                              borderRadius: 6,
                              fontSize: 14,
                              color: textValue ? '#374151' : '#92400e',
                              lineHeight: 1.5,
                              cursor: isDraft ? 'pointer' : 'default',
                            }}
                          >
                            {textValue || (isDraft
                              ? `Click to add ${step.toLowerCase()} statement...`
                              : `No ${step.toLowerCase()} statement recorded.`
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Evidence items */}
                    {items.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {items.map(ev => {
                          const content = ev.content || '';
                          const snippet = content.length > 160 ? content.slice(0, 160) + '...' : content;
                          const source = ev.source || 'manual';
                          const date = ev.created_at ? new Date(ev.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

                          return (
                            <div key={ev.id} style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 10,
                              padding: '10px 12px',
                              backgroundColor: '#fafbfc',
                              borderRadius: 6,
                              border: '1px solid #f1f5f9',
                            }}>
                              {/* Source icon */}
                              <div style={{
                                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                                backgroundColor: source === 'github' ? '#24292f' : source === 'email' ? '#0ea5e9' : source === 'document' ? '#8b5cf6' : '#021048',
                                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 10, fontWeight: 600, marginTop: 2,
                              }}>
                                {SOURCE_ICONS[source] || 'M'}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
                                  {snippet}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{date}</span>
                                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{source}</span>
                                  {ev.link_source === 'auto' && (
                                    <span style={{ fontSize: 10, color: '#c084fc', backgroundColor: '#faf5ff', padding: '1px 6px', borderRadius: 8 }}>auto-linked</span>
                                  )}
                                </div>
                              </div>
                              {/* Remove button */}
                              {isDraft && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleUnlinkEvidence(ev.id, step); }}
                                  title="Remove from this step"
                                  style={{
                                    background: 'none', border: 'none', color: '#cbd5e1',
                                    cursor: 'pointer', fontSize: 16, padding: '2px 4px', flexShrink: 0,
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                  onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}
                                >
                                  &times;
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : !isTextStep ? (
                      <div style={{
                        padding: '12px 14px',
                        backgroundColor: '#fffbeb',
                        border: '1px dashed #fde68a',
                        borderRadius: 6,
                        fontSize: 13,
                        color: '#92400e',
                      }}>
                        No evidence linked to this step yet.
                      </div>
                    ) : null}

                    {/* Link evidence button */}
                    {isDraft && (
                      <button
                        onClick={() => setPickerStep(step)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '6px 12px',
                          marginTop: 10,
                          background: 'none',
                          border: '1px dashed #d1d5db',
                          borderRadius: 6,
                          color: '#64748b',
                          fontSize: 12,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#021048'; e.currentTarget.style.color = '#021048'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#64748b'; }}
                      >
                        + Link evidence
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Adoption helper */}
      {isDraft && !loading && (
        <div style={{
          marginTop: 20,
          padding: '14px 20px',
          backgroundColor: canAdopt ? '#f0fdf4' : '#fffbeb',
          border: `1px solid ${canAdopt ? '#bbf7d0' : '#fde68a'}`,
          borderRadius: 8,
          fontSize: 13,
          color: canAdopt ? '#166534' : '#92400e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span>
            {canAdopt
              ? `${coveredSteps.length}/5 steps covered. Ready to adopt.`
              : `${coveredSteps.length}/5 steps covered. Need at least 3 to adopt.`
            }
          </span>
          {canAdopt && (
            <button
              onClick={handleAdopt}
              disabled={adopting}
              style={{
                padding: '6px 16px',
                backgroundColor: '#021048',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {adopting ? 'Adopting...' : 'Adopt Activity'}
            </button>
          )}
        </div>
      )}

      {/* Evidence Picker Modal */}
      {pickerStep && (
        <EvidencePicker
          step={pickerStep}
          allEvidence={allEvidence}
          linkedEvidenceIds={linkedEvidenceIds}
          onLink={(ids) => {
            handleLinkEvidence(ids, pickerStep);
            setPickerStep(null);
          }}
          onClose={() => setPickerStep(null)}
        />
      )}
    </div>
  );
}

const smallBtnPrimary = {
  padding: '5px 14px',
  backgroundColor: '#021048',
  color: 'white',
  border: 'none',
  borderRadius: 5,
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
};

const smallBtnSecondary = {
  padding: '5px 14px',
  backgroundColor: 'white',
  color: '#64748b',
  border: '1px solid #d1d5db',
  borderRadius: 5,
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
};
