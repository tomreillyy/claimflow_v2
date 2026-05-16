'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { SECTION_NAMES, ACTIVITY_NARRATIVE_STEPS } from '@/lib/claimFlowMasterContext';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import InlineEditor, { BlobLoader } from './workspace/InlineEditor';
import { CreateActivityModal, UploadFileModal, AddEvidenceModal } from './workspace/WorkspaceModals';
import EvidencePicker from './EvidencePicker';
import FinancialsPage from './financials/FinancialsPage';
import FinancialsPrintSection from './financials/FinancialsPrintSection';

const NAVY = '#021048';

const STAGE_KEYS_5 = ['hypothesis', 'experiment', 'observation', 'evaluation', 'conclusion'];

const STAGES = [
  { key: 'prior_knowledge', label: 'Prior Knowledge & Knowledge Gap' },
  { key: 'hypothesis', label: 'Hypothesis' },
  { key: 'experiment', label: 'Experiment' },
  { key: 'observation', label: 'Observation' },
  { key: 'evaluation', label: 'Evaluation' },
  { key: 'conclusion', label: 'Conclusion & New Knowledge' },
];

const SOURCE_ICONS = { manual: 'M', note: 'M', email: '@', github: 'G', document: 'D', upload: 'U', jira: 'J' };
const SOURCE_COLORS = { manual: NAVY, github: '#24292f', jira: '#0052CC', email: '#0ea5e9', document: '#7c3aed', upload: '#6b7280', note: NAVY };

// Map from API capitalized step names to our lowercase stage keys
const STEP_TO_STAGE = {
  'Prior Knowledge': 'prior_knowledge',
  'Hypothesis': 'hypothesis',
  'Experiment': 'experiment',
  'Observation': 'observation',
  'Evaluation': 'evaluation',
  'Conclusion': 'conclusion',
  'Unknown': null,
};

const SIGN_OFF_ROLES = [
  { key: 'technical_lead', title: 'Technical Lead / CTO', description: 'I confirm that the activities described in this claim pack constitute genuine R&D involving technical uncertainty that could not be resolved by a competent professional using existing knowledge.' },
  { key: 'cfo', title: 'CFO / Finance', description: 'I confirm that the expenditure figures in this claim pack are accurate, the apportionment methodology has been applied consistently, and costs are substantiated by underlying records.' },
  { key: 'ceo', title: 'CEO / Managing Director', description: 'I confirm that this claim pack is complete and accurate to the best of my knowledge, and that the company is entitled to claim the R&D Tax Incentive for the activities and expenditure described.' },
];

/* ── Source badge ── */
function SrcBadge({ src, size = 22 }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: 5, flexShrink: 0,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: SOURCE_COLORS[src] || '#6b7280',
      fontSize: size < 22 ? 9 : 10, fontWeight: 700, color: 'white',
      fontFamily: 'ui-monospace, monospace',
    }}>
      {SOURCE_ICONS[src] || '?'}
    </span>
  );
}

/* ── Evidence card (inside a stage section) ── */
function EvidenceCard({ item, onContextMenu }) {
  const [open, setOpen] = useState(false);
  const text = item.content || item.text || '';
  const limit = 180;
  const long = text.length > limit;
  const date = item.created_at
    ? new Date(item.created_at).toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' })
    : item.date || '';
  const author = item.author_email || item.author || '';

  return (
    <div
      onContextMenu={onContextMenu}
      style={{
        padding: '10px 14px', background: 'white', borderRadius: 8,
        border: '1px solid #eef0f2', display: 'flex', gap: 10,
        alignItems: 'flex-start', transition: 'border-color 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#d1d5db'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#eef0f2'}
    >
      <SrcBadge src={item.source || 'manual'} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'ui-monospace, monospace', fontWeight: 500 }}>{date}</span>
          {item.meta?.type === 'jira' && item.meta.jira_key && (
            <span style={{ fontSize: 10, fontWeight: 600, color: '#0052CC', background: '#e8f0fe', padding: '1px 5px', borderRadius: 3 }}>{item.meta.jira_key}</span>
          )}
          {item.source === 'github' && item.meta && (
            <span style={{ fontSize: 10, color: '#57606a' }}>
              {item.meta.files_changed > 0 && `${item.meta.files_changed} files `}
              {item.meta.additions > 0 && <span style={{ color: '#1a7f37' }}>+{item.meta.additions}</span>}
              {item.meta.additions > 0 && item.meta.deletions > 0 && ' '}
              {item.meta.deletions > 0 && <span style={{ color: '#cf222e' }}>-{item.meta.deletions}</span>}
            </span>
          )}
          {author && <span style={{ fontSize: 10, color: '#c4c8cf', marginLeft: 'auto' }}>{author.split('@')[0]}</span>}
        </div>
        <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.55, whiteSpace: 'pre-line' }}>
          {open || !long ? text : text.slice(0, limit) + '\u2026'}
          {long && (
            <button onClick={() => setOpen(!open)} style={{
              display: 'inline', marginLeft: 4, padding: 0, border: 'none',
              background: 'none', fontSize: 12, fontWeight: 500, color: '#2563eb',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {open ? 'less' : 'more'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Context menu ── */
function ContextMenu({ x, y, items, onClose }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60 }} />
      <div style={{
        position: 'fixed', top: y, left: x, zIndex: 70,
        background: 'white', border: '1px solid #e5e7eb', borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden',
        minWidth: 170, padding: '4px 0',
      }}>
        {items.map((item, i) => item.divider ? (
          <div key={i} style={{ borderTop: '1px solid #f0f0f0', margin: '4px 0' }} />
        ) : (
          <button key={i} onClick={() => { item.action?.(); onClose(); }} style={{
            display: 'block', width: '100%', textAlign: 'left',
            padding: '7px 14px', fontSize: 13,
            color: item.danger ? '#dc2626' : '#374151',
            fontWeight: 400, background: 'white', border: 'none',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
            onMouseEnter={e => e.currentTarget.style.background = item.danger ? '#fef2f2' : '#f9fafb'}
            onMouseLeave={e => e.currentTarget.style.background = 'white'}
          >
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}

/* ── Collapsible stage section ── */
function StageSection({
  stage, evidence, sectionKey, projectId, sections,
  expanded, onToggle, onSaveStatus, onLinkEvidence, onAddNote,
  onUnlinkEvidence, activityId, onMoveStage,
}) {
  const evCount = evidence.length;
  const narrativeData = sections[sectionKey];
  const narrativeContent = narrativeData?.content || '';
  const plainText = narrativeContent.replace(/<[^>]*>/g, '').trim();
  const hasNarrative = plainText.length > 10;
  const charCount = plainText.length;
  const empty = evCount === 0 && !hasNarrative;
  const [ctxMenu, setCtxMenu] = useState(null);

  return (
    <div style={{
      borderRadius: 10,
      border: `1px solid ${empty ? '#fecaca' : expanded ? '#d1d5db' : '#f0f1f3'}`,
      background: 'white', overflow: 'hidden', transition: 'border-color 0.15s',
    }}>
      {/* Header */}
      <button onClick={onToggle} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '13px 16px', background: 'none', border: 'none',
        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
      }}>
        <span style={{
          width: 20, fontSize: 12, color: '#9ca3af', flexShrink: 0,
          transition: 'transform 0.15s',
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
        }}>
          &#9656;
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: empty ? '#dc2626' : '#111827', flex: 1 }}>
          {stage.label}
        </span>
        {evCount > 0 && (
          <span style={{ padding: '2px 8px', fontSize: 10, fontWeight: 600, borderRadius: 10, background: '#f0fdf4', color: '#16a34a' }}>
            {evCount}
          </span>
        )}
        {hasNarrative && (
          <span style={{ padding: '2px 8px', fontSize: 10, fontWeight: 500, borderRadius: 10, background: '#eff6ff', color: '#2563eb' }}>
            drafted
          </span>
        )}
        {empty && (
          <span style={{ padding: '2px 8px', fontSize: 10, fontWeight: 500, borderRadius: 10, background: '#fef2f2', color: '#dc2626' }}>
            gap
          </span>
        )}
      </button>

      {/* Collapsed narrative preview */}
      {!expanded && hasNarrative && (
        <div style={{
          padding: '0 16px 12px 46px', fontSize: 13, color: '#9ca3af',
          lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {plainText.slice(0, 100)}{plainText.length > 100 ? '\u2026' : ''}
        </div>
      )}

      {/* Expanded */}
      {expanded && (
        <div style={{ padding: '0 16px 16px 16px' }}>
          {/* Evidence tray */}
          {evCount > 0 && (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 5,
              marginBottom: 12, padding: '10px 12px',
              background: '#f8f9fb', borderRadius: 8,
            }}>
              <div style={{
                fontSize: 10, fontWeight: 600, color: '#9ca3af',
                textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2,
              }}>
                Linked evidence
              </div>
              {evidence.map(ev => (
                <EvidenceCard
                  key={ev.id}
                  item={ev}
                  onContextMenu={e => {
                    e.preventDefault();
                    setCtxMenu({ x: e.clientX, y: e.clientY, ev });
                  }}
                />
              ))}
            </div>
          )}

          {/* Link + Add buttons */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button
              onClick={onLinkEvidence}
              style={{
                fontSize: 12, fontWeight: 500, color: '#6b7280', background: 'none',
                border: '1px dashed #d1d5db', borderRadius: 6, cursor: 'pointer',
                padding: '5px 12px', fontFamily: 'inherit',
              }}
            >
              + Link evidence
            </button>
            <button
              onClick={onAddNote}
              style={{
                fontSize: 12, fontWeight: 500, color: '#6b7280', background: 'none',
                border: '1px dashed #d1d5db', borderRadius: 6, cursor: 'pointer',
                padding: '5px 12px', fontFamily: 'inherit',
              }}
            >
              + Add note
            </button>
          </div>

          {/* Stage AI tip — show when no narrative yet */}
          {!hasNarrative && (
            <div style={{
              padding: '10px 12px', marginBottom: 12, borderRadius: 8,
              background: '#f8f9fb', border: '1px solid #eef0f2',
              fontSize: 13, lineHeight: 1.5, color: '#6b7280',
            }}>
              {evCount > 0
                ? <><span style={{ color: '#374151' }}>✦</span> {evCount} evidence item{evCount > 1 ? 's' : ''} linked. Hit <strong>Generate with AI</strong> above to draft this section, or write it yourself.</>
                : <><span style={{ color: '#d97706' }}>⚠</span> No evidence linked. Link evidence or add a note above — AI needs something to draft from.</>}
            </div>
          )}

          {/* Narrative editor */}
          <div className="workspace-inline-editor">
            <InlineEditor
              key={sectionKey}
              sectionKey={sectionKey}
              projectId={projectId}
              initialContent={narrativeData?.content || null}
              placeholder={ACTIVITY_NARRATIVE_STEPS.find(s => s.key === stage.key)?.placeholder || 'Start writing or click Generate with AI\u2026'}
              onSaveStatus={onSaveStatus}
            />
          </div>

          {/* Char count */}
          <div style={{
            display: 'flex', justifyContent: 'flex-end', marginTop: 5,
            fontSize: 11, color: charCount > 3800 ? '#dc2626' : '#c4c8cf',
            fontFamily: 'ui-monospace, monospace',
          }}>
            {charCount.toLocaleString()} / 4,000
          </div>
        </div>
      )}

      {/* Evidence context menu */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          onClose={() => setCtxMenu(null)}
          items={[
            { label: 'Move to different stage', action: () => onMoveStage?.(ctxMenu.ev) },
            { divider: true },
            { label: 'Unlink from this stage', danger: true, action: () => onUnlinkEvidence?.(ctxMenu.ev.id) },
          ]}
        />
      )}
    </div>
  );
}

/* ── AI context tip — actionable guidance before generating ── */
function AiContextTip({ sectionKey, activities, items, activityEvidence, hasContent }) {
  if (hasContent) return null;

  const coreActs = activities.filter(a => (a.activity_type || 'core') === 'core');
  const totalEvidence = (items || []).filter(e => !e.soft_deleted).length;

  let message = null;
  let gap = null;

  if (sectionKey === 'project_overview') {
    if (coreActs.length > 0 && totalEvidence > 0) {
      message = `Describe the company and the overarching technical problem. AI will draft from your ${coreActs.length} activit${coreActs.length === 1 ? 'y' : 'ies'} and ${totalEvidence} evidence items.`;
    } else if (coreActs.length > 0) {
      message = `Describe the company and the technical problem being investigated.`;
      gap = 'Low evidence — connect GitHub/Jira or add notes for a stronger AI draft.';
    } else {
      gap = 'Add activities first so AI has context to generate from.';
    }
  } else if (sectionKey === 'rd_boundary') {
    if (coreActs.length > 0) {
      message = `Document what was claimed as R&D and what was excluded (BAU, deployment, routine work). AI will draft from your ${coreActs.length} activit${coreActs.length === 1 ? 'y' : 'ies'}.`;
    } else {
      gap = 'Add activities first — AI needs to know what R&D was done to define the boundary.';
    }
  }

  if (!message && !gap) return null;

  return (
    <div style={{
      padding: '12px 14px', marginBottom: 16, borderRadius: 8,
      background: '#f8f9fb', border: '1px solid #eef0f2',
      fontSize: 13, lineHeight: 1.5, color: '#6b7280',
    }}>
      {message && <div><span style={{ color: '#374151' }}>✦</span> {message}</div>}
      {gap && <div style={{ color: '#d97706', marginTop: message ? 4 : 0 }}>⚠ {gap}</div>}
    </div>
  );
}

/* ── Project-level section panel (Overview, R&D Boundary, etc.) ── */
function SectionPanel({ sectionKey, sectionName, projectId, sections, saveStatus, onSaveStatus, token, onGenerated, activities, items, activityEvidence }) {
  const data = sections[sectionKey] || {};
  const plainText = (data.content || '').replace(/<[^>]*>/g, '').trim();
  const charCount = plainText.length;
  const hasContent = charCount > 10;
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/projects/${token}/claim-pack/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ regenerate_sections: [sectionKey], force: true }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Generation failed');
      onGenerated?.();
    } catch (err) {
      setGenError(err.message);
      setTimeout(() => setGenError(null), 5000);
    }
    setGenerating(false);
  };

  return (
    <div style={{ padding: '28px 40px 60px', position: 'relative' }}>
      {generating && <BlobLoader />}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
        <h1 style={{ fontSize: 19, fontWeight: 700, color: '#111827', margin: 0 }}>
          {sectionName}
        </h1>
        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{
            padding: '8px 16px', fontSize: 13, fontWeight: 600,
            color: 'white', backgroundColor: generating ? '#9ca3af' : NAVY,
            border: 'none', borderRadius: 8,
            cursor: generating ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
            flexShrink: 0, whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: 14 }}>&#10022;</span> {hasContent ? 'Regenerate with AI' : 'Generate with AI'}
        </button>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20,
        fontSize: 12, color: '#9ca3af', minHeight: 18,
      }}>
        {data.last_edited_at && (
          <span>
            {data.ai_generated !== false ? 'AI draft' : 'Edited'}{' '}
            {new Date(data.last_edited_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        )}
        {saveStatus === 'saving' && <span>Saving...</span>}
        {saveStatus === 'saved' && <span style={{ color: '#10b981' }}>Saved</span>}
        {saveStatus === 'error' && <span style={{ color: '#ef4444' }}>Save failed</span>}
        {genError && <span style={{ color: '#ef4444' }}>{genError}</span>}
      </div>
      <AiContextTip sectionKey={sectionKey} activities={activities || []} items={items || []} activityEvidence={activityEvidence || {}} hasContent={hasContent} />
      <div className="workspace-inline-editor">
        <InlineEditor
          key={sectionKey}
          sectionKey={sectionKey}
          projectId={projectId}
          initialContent={data.content || null}
          placeholder={`Write the ${sectionName.toLowerCase()} section...`}
          onSaveStatus={onSaveStatus}
        />
      </div>
      <div style={{
        display: 'flex', justifyContent: 'flex-end', marginTop: 5,
        fontSize: 11, color: charCount > 3800 ? '#dc2626' : '#c4c8cf',
        fontFamily: 'ui-monospace, monospace',
      }}>
        {charCount.toLocaleString()} / 4,000
      </div>
    </div>
  );
}

/* ── Attestations & Sign-offs Panel ── */
function AttestationsPanel({ projectId, sections, token, onSaved }) {
  const sectionKey = 'attestations';
  const parseSignatures = (s) => {
    try {
      const c = s?.[sectionKey]?.content;
      if (c && c.startsWith('{')) return JSON.parse(c);
    } catch {}
    return {};
  };
  const [signatures, setSignatures] = useState(() => parseSignatures(sections));

  useEffect(() => {
    const parsed = parseSignatures(sections);
    if (Object.keys(parsed).length > 0) setSignatures(parsed);
  }, [sections]);

  const [saving, setSaving] = useState(false);
  const sigRefs = useRef({});

  const handleSign = (roleKey) => {
    const canvas = sigRefs.current[roleKey];
    if (!canvas || canvas.isEmpty()) return;
    const dataUrl = canvas.toDataURL('image/png');
    const updated = {
      ...signatures,
      [roleKey]: {
        ...signatures[roleKey],
        signature: dataUrl,
        signedAt: new Date().toISOString(),
        signedBy: signatures[roleKey]?.signedBy || '',
      },
    };
    setSignatures(updated);
    saveSignatures(updated);
  };

  const handleClear = (roleKey) => {
    const canvas = sigRefs.current[roleKey];
    if (canvas) canvas.clear();
    const updated = { ...signatures };
    delete updated[roleKey];
    setSignatures(updated);
    saveSignatures(updated);
  };

  const nameTimerRef = useRef(null);
  const handleNameChange = (roleKey, name) => {
    const updated = {
      ...signatures,
      [roleKey]: { ...signatures[roleKey], signedBy: name },
    };
    setSignatures(updated);
    if (nameTimerRef.current) clearTimeout(nameTimerRef.current);
    nameTimerRef.current = setTimeout(() => saveSignatures(updated), 1000);
  };

  const [saveError, setSaveError] = useState(null);
  const saveSignatures = async (data) => {
    setSaving(true);
    setSaveError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      if (!projectId) throw new Error(`Project not loaded yet (projectId=${projectId})`);
      const res = await fetch(`/api/claim-pack-sections/${projectId}/${sectionKey}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ content: JSON.stringify(data) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Save failed: ${res.status}`);
      }
      onSaved?.();
    } catch (err) {
      console.error('Save signatures failed:', err);
      setSaveError(err.message);
    }
    setSaving(false);
  };

  const [SignatureCanvas, setSignatureCanvas] = useState(null);
  useEffect(() => {
    import('react-signature-canvas').then(mod => setSignatureCanvas(() => mod.default));
  }, []);

  const signedCount = SIGN_OFF_ROLES.filter(r => signatures[r.key]?.signature).length;

  return (
    <div style={{ padding: '28px 40px 60px' }}>
      <h1 style={{ fontSize: 19, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>
        Attestations & Sign-offs
      </h1>
      <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 28px' }}>
        {signedCount} of {SIGN_OFF_ROLES.length} signed
        {saving && <span style={{ marginLeft: 8 }}>· Saving...</span>}
        {saveError && <span style={{ marginLeft: 8, color: '#dc2626' }}>· {saveError}</span>}
      </p>

      {SIGN_OFF_ROLES.map(role => {
        const sig = signatures[role.key];
        const isSigned = !!sig?.signature;

        return (
          <div key={role.key} style={{
            marginBottom: 24, border: '1px solid #e5e7eb', borderRadius: 10,
            overflow: 'hidden', backgroundColor: 'white',
          }}>
            <div style={{
              padding: '14px 20px', borderBottom: '1px solid #f0f0f0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{role.title}</div>
                {isSigned && (
                  <div style={{ fontSize: 11, color: '#10b981', marginTop: 2 }}>
                    Signed {new Date(sig.signedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
                    {sig.signedBy && ` by ${sig.signedBy}`}
                  </div>
                )}
              </div>
              {isSigned && (
                <span style={{
                  padding: '3px 10px', fontSize: 11, fontWeight: 600, borderRadius: 12,
                  backgroundColor: '#dcfce7', color: '#166534',
                }}>
                  Signed
                </span>
              )}
            </div>

            <div style={{ padding: '16px 20px' }}>
              <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, margin: '0 0 16px' }}>
                {role.description}
              </p>

              {isSigned ? (
                <div>
                  <div style={{
                    border: '1px solid #e5e7eb', borderRadius: 8,
                    padding: 8, backgroundColor: '#fafbfc', marginBottom: 12,
                    display: 'flex', justifyContent: 'center',
                  }}>
                    <img src={sig.signature} alt="Signature" style={{ maxHeight: 80, maxWidth: '100%' }} />
                  </div>
                  <button
                    onClick={() => handleClear(role.key)}
                    style={{
                      padding: '6px 14px', fontSize: 12, fontWeight: 500,
                      color: '#dc2626', backgroundColor: 'white',
                      border: '1px solid #fecaca', borderRadius: 6,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Clear signature
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                      Full name
                    </label>
                    <input
                      value={sig?.signedBy || ''}
                      onChange={e => handleNameChange(role.key, e.target.value)}
                      placeholder="Enter full name"
                      style={{
                        width: '100%', padding: '8px 12px', fontSize: 13,
                        border: '1px solid #e5e7eb', borderRadius: 6,
                        outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                      Signature
                    </label>
                    <div style={{
                      border: '1px dashed #d1d5db', borderRadius: 8,
                      backgroundColor: '#fafbfc', overflow: 'hidden',
                      height: 120, position: 'relative',
                    }}>
                      {SignatureCanvas ? (
                        <SignatureCanvas
                          ref={ref => { sigRefs.current[role.key] = ref; }}
                          canvasProps={{
                            style: { width: '100%', height: '100%', cursor: 'crosshair' },
                          }}
                          penColor={NAVY}
                          dotSize={2}
                          minWidth={1.5}
                          maxWidth={3}
                        />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', fontSize: 12 }}>
                          Loading...
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleSign(role.key)}
                      style={{
                        padding: '7px 16px', fontSize: 13, fontWeight: 600,
                        color: 'white', backgroundColor: NAVY,
                        border: 'none', borderRadius: 6,
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      Sign
                    </button>
                    <button
                      onClick={() => { const c = sigRefs.current[role.key]; if (c) c.clear(); }}
                      style={{
                        padding: '7px 14px', fontSize: 13, fontWeight: 500,
                        color: '#6b7280', backgroundColor: 'white',
                        border: '1px solid #e5e7eb', borderRadius: 6,
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Activity Rail ── */
function ActivityRail({ activities, activeView, onSelect, addBtnRef, onAddClick, activityEvidence }) {
  const stageCount = (act) => {
    const evData = activityEvidence[act.id];
    if (!evData) return 0;
    return STAGE_KEYS_5.filter(stageKey => {
      // evData is an array with _step property (capitalized)
      return evData.some(ev => {
        const mapped = STEP_TO_STAGE[ev._step];
        return mapped === stageKey;
      });
    }).length;
  };

  const stageHas = (act, stageKey) => {
    const evData = activityEvidence[act.id];
    if (!evData) return false;
    return evData.some(ev => STEP_TO_STAGE[ev._step] === stageKey);
  };

  return (
    <div style={{
      width: 224, flexShrink: 0, borderRight: '1px solid #f0f1f3',
      display: 'flex', flexDirection: 'column', background: '#fafbfc', overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 14px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>Workspace</span>
        <button
          ref={addBtnRef}
          onClick={onAddClick}
          style={{
            width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 6, border: '1px solid #e5e7eb', background: 'white',
            cursor: 'pointer', fontSize: 15, color: '#6b7280', fontWeight: 300, lineHeight: 1,
          }}
        >
          +
        </button>
      </div>

      {/* Project sections — always visible at top */}
      <div style={{ padding: '6px 10px 4px', borderBottom: '1px solid #eef0f2' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, padding: '0 4px' }}>
          Project
        </div>
        {[
          { key: 'overview', label: 'Project Overview' },
          { key: 'financials', label: 'Financials' },
          { key: 'attestations', label: 'Attestations' },
          { key: 'boundary', label: 'R&D Boundary' },
        ].map(item => {
          const sel = activeView.type === 'section' && activeView.id === item.key;
          return (
            <button key={item.key} onClick={() => onSelect({ type: 'section', id: item.key })} style={{
              width: '100%', textAlign: 'left', display: 'block',
              padding: '6px 10px', marginBottom: 1, borderRadius: 6,
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              background: sel ? 'white' : 'transparent',
              boxShadow: sel ? '0 1px 3px rgba(0,0,0,0.04)' : 'none',
              fontSize: 12, color: sel ? '#111827' : '#6b7280',
              fontWeight: sel ? 500 : 400,
            }}>
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Core activities */}
      {activities.filter(a => (a.activity_type || 'core') === 'core').length > 0 && (
        <div style={{ padding: '4px 10px 4px' }}>
          <div style={{
            fontSize: 10, fontWeight: 600, color: '#9ca3af',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            marginBottom: 6, padding: '0 4px',
          }}>
            Core Activities
          </div>
          {activities.filter(a => (a.activity_type || 'core') === 'core').map(act => {
            const sel = activeView.type === 'activity' && activeView.id === act.id;
            const filled = stageCount(act);
            return (
              <button key={act.id} onClick={() => onSelect({ type: 'activity', id: act.id })} style={{
                width: '100%', textAlign: 'left', display: 'block', padding: '8px 10px',
                marginBottom: 2, borderRadius: 7,
                border: sel ? '1px solid #e0e2e6' : '1px solid transparent',
                cursor: 'pointer', fontFamily: 'inherit',
                background: sel ? 'white' : 'transparent',
                boxShadow: sel ? '0 1px 3px rgba(0,0,0,0.04)' : 'none',
              }}>
                <div style={{
                  fontSize: 12, fontWeight: 500, color: '#111827', marginBottom: 5,
                  lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                  {act.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {STAGE_KEYS_5.map(s => (
                      <div key={s} style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: stageHas(act, s) ? '#10b981' : '#e5e7eb',
                      }} />
                    ))}
                  </div>
                  <span style={{
                    marginLeft: 'auto', padding: '1px 6px', fontSize: 9, fontWeight: 600, borderRadius: 3,
                    background: filled >= 5 ? '#dcfce7' : filled >= 3 ? '#fefce8' : '#f3f4f6',
                    color: filled >= 5 ? '#166534' : filled >= 3 ? '#854d0e' : '#9ca3af',
                  }}>
                    {filled >= 5 ? 'Ready' : `${filled}/5`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Supporting activities */}
      {activities.filter(a => a.activity_type === 'supporting').length > 0 && (
        <div style={{ padding: '6px 10px 4px' }}>
          <div style={{
            fontSize: 10, fontWeight: 600, color: '#9ca3af',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            marginBottom: 6, padding: '0 4px',
          }}>
            Supporting
          </div>
          {activities.filter(a => a.activity_type === 'supporting').map(act => {
            const sel = activeView.type === 'activity' && activeView.id === act.id;
            return (
              <button key={act.id} onClick={() => onSelect({ type: 'activity', id: act.id })} style={{
                width: '100%', textAlign: 'left', display: 'block', padding: '8px 10px',
                marginBottom: 2, borderRadius: 7,
                border: sel ? '1px solid #e0e2e6' : '1px solid transparent',
                cursor: 'pointer', fontFamily: 'inherit',
                background: sel ? 'white' : 'transparent',
              }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#111827', lineHeight: 1.35 }}>
                  {act.name}
                </div>
              </button>
            );
          })}
        </div>
      )}

    </div>
  );
}

/* ── Activity view (main content) ── */
function ActivityView({
  activity, expandedStages, onToggleStage, sections, projectId,
  activityEvidence, onSaveStatus, token, onActivitiesChange,
  onGenerated, onLinkEvidence, onAddNote, onUnlinkEvidence,
}) {
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);
  const [actCtx, setActCtx] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [editingUncertainty, setEditingUncertainty] = useState(false);
  const [nameVal, setNameVal] = useState(activity.name);
  const [uncVal, setUncVal] = useState(activity.uncertainty || '');
  const saveTimerRef = useRef(null);

  // Sync with prop changes (e.g. switching activities)
  useEffect(() => { setNameVal(activity.name); setUncVal(activity.uncertainty || ''); setEditingName(false); setEditingUncertainty(false); }, [activity.id]);

  const saveField = async (field, value) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`/api/projects/${token}/core-activities/${activity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ [field]: value }),
      });
      // Update parent state
      if (typeof onActivitiesChange === 'function') {
        onActivitiesChange(prev => {
          const list = typeof prev === 'function' ? prev : prev;
          return (Array.isArray(list) ? list : []).map(a => a.id === activity.id ? { ...a, [field]: value } : a);
        });
      }
    } catch (err) { console.error('Save field failed:', err); }
  };

  const debouncedSave = (field, value) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveField(field, value), 1000);
  };

  // Check if any stage has narrative content
  const hasContent = STAGES.some(({ key }) => {
    const s = sections[`activity_${activity.id}_${key}`];
    return s?.content && s.content.replace(/<[^>]*>/g, '').trim().length > 10;
  });

  const handleGenerate = async () => {
    setGenerating(true);
    setGenError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/projects/${token}/activities/${activity.id}/generate-narrative`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Generation failed');
      onGenerated?.();
    } catch (err) {
      setGenError(err.message);
      setTimeout(() => setGenError(null), 5000);
    }
    setGenerating(false);
  };

  const handleChangeType = async () => {
    const newType = (activity.activity_type || 'core') === 'core' ? 'supporting' : 'core';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`/api/projects/${token}/core-activities/${activity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ activity_type: newType }),
      });
      if (onActivitiesChange) {
        onActivitiesChange(prev => prev.map(a => a.id === activity.id ? { ...a, activity_type: newType } : a));
      }
    } catch (err) { console.error('Activity type change failed:', err); }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${activity.name}"? This cannot be undone.`)) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`/api/projects/${token}/core-activities/${activity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ status: 'archived' }),
      });
      if (onActivitiesChange) {
        onActivitiesChange(prev => prev.filter(a => a.id !== activity.id));
      }
    } catch (err) { console.error('Archive failed:', err); }
  };

  // Build per-stage evidence from activityEvidence
  const stageEvidence = {};
  STAGES.forEach(s => { stageEvidence[s.key] = []; });
  const evData = activityEvidence[activity.id] || [];
  evData.forEach(ev => {
    const mapped = STEP_TO_STAGE[ev._step];
    if (mapped && stageEvidence[mapped]) {
      stageEvidence[mapped].push(ev);
    }
  });

  return (
    <div style={{ padding: '28px 40px 60px', position: 'relative' }}>
      {generating && <BlobLoader />}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              {editingName ? (
                <input
                  value={nameVal}
                  onChange={e => { setNameVal(e.target.value); debouncedSave('name', e.target.value); }}
                  onBlur={() => { setEditingName(false); if (nameVal.trim()) saveField('name', nameVal.trim()); }}
                  onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                  autoFocus
                  style={{ fontSize: 19, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.3, border: 'none', borderBottom: `2px solid ${NAVY}`, outline: 'none', fontFamily: 'inherit', padding: '0 0 2px', background: 'transparent', width: '100%' }}
                />
              ) : (
                <h1
                  onClick={() => setEditingName(true)}
                  style={{ fontSize: 19, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.3, cursor: 'text' }}
                  title="Click to edit"
                >
                  {activity.name}
                </h1>
              )}
              <span style={{
                padding: '2px 7px', fontSize: 10, fontWeight: 600, borderRadius: 4,
                background: (activity.activity_type || 'core') === 'core' ? NAVY : '#6b7280', color: 'white',
              }}>
                {(activity.activity_type || 'core') === 'core' ? 'Core' : 'Supporting'}
              </span>
              <button
                onClick={e => setActCtx({ x: e.clientX, y: e.clientY })}
                style={{
                  padding: '2px 6px', fontSize: 16, color: '#9ca3af', background: 'none',
                  border: 'none', cursor: 'pointer', lineHeight: 1, borderRadius: 4,
                }}
              >
                &#x22EF;
              </button>
            </div>
            {editingUncertainty ? (
              <textarea
                value={uncVal}
                onChange={e => { setUncVal(e.target.value); debouncedSave('uncertainty', e.target.value); }}
                onBlur={() => { setEditingUncertainty(false); if (uncVal.trim()) saveField('uncertainty', uncVal.trim()); }}
                autoFocus
                rows={3}
                style={{ fontSize: 13, color: '#6b7280', margin: 0, lineHeight: 1.5, border: 'none', borderBottom: `2px solid ${NAVY}`, outline: 'none', fontFamily: 'inherit', padding: '0 0 2px', background: 'transparent', width: '100%', resize: 'vertical' }}
              />
            ) : (
              <p
                onClick={() => setEditingUncertainty(true)}
                style={{ fontSize: 13, color: activity.uncertainty ? '#6b7280' : '#c4c8cf', margin: 0, lineHeight: 1.5, cursor: 'text' }}
                title="Click to edit"
              >
                {activity.uncertainty || 'Click to add technical uncertainty...'}
              </p>
            )}
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              padding: '8px 16px', fontSize: 13, fontWeight: 600,
              color: 'white', background: generating ? '#9ca3af' : NAVY,
              border: 'none', borderRadius: 8, cursor: generating ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', flexShrink: 0, whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <span style={{ fontSize: 14 }}>&#10022;</span> {hasContent ? 'Regenerate with AI' : 'Generate with AI'}
          </button>
        </div>
        {/* Save/gen status */}
        {genError && (
          <div style={{ fontSize: 12, color: '#ef4444', marginTop: 8 }}>{genError}</div>
        )}
      </div>

      {/* Stage sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {STAGES.map(stage => (
          <StageSection
            key={stage.key}
            stage={stage}
            evidence={stageEvidence[stage.key]}
            sectionKey={`activity_${activity.id}_${stage.key}`}
            projectId={projectId}
            sections={sections}
            expanded={expandedStages.has(stage.key)}
            onToggle={() => onToggleStage(stage.key)}
            onSaveStatus={onSaveStatus}
            onLinkEvidence={() => onLinkEvidence?.(activity.id, stage.key)}
            onAddNote={() => onAddNote?.(activity.id)}
            onUnlinkEvidence={(evId) => onUnlinkEvidence?.(evId, activity.id)}
            activityId={activity.id}
          />
        ))}
      </div>

      {/* Activity context menu */}
      {actCtx && (
        <ContextMenu
          x={actCtx.x}
          y={actCtx.y}
          onClose={() => setActCtx(null)}
          items={[
            {
              label: (activity.activity_type || 'core') === 'core' ? 'Change to supporting' : 'Change to core',
              action: handleChangeType,
            },
            { divider: true },
            { label: 'Delete activity', danger: true, action: handleDelete },
          ]}
        />
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════
   Main WorkspaceView
   ═══════════════════════════════════════════════════════════ */
export default function WorkspaceView({
  items = [],
  evidenceSteps = {},
  evidenceActivityTypes = {},
  activities = [],
  token,
  project = {},
  onActivitiesChange,
}) {
  // ── State ──
  const [activeView, setActiveView] = useState({ type: 'section', id: 'overview' });
  const [expandedStages, setExpandedStages] = useState(new Set(['prior_knowledge', 'hypothesis']));
  const [sections, setSections] = useState({});
  const [projectId, setProjectId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('');
  const [activityEvidence, setActivityEvidence] = useState({});

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [pickerTarget, setPickerTarget] = useState(null); // { activityId, step } or null
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Jira CSV import state
  const [showJiraImport, setShowJiraImport] = useState(false);
  const [jiraFile, setJiraFile] = useState(null);
  const [jiraAnalysing, setJiraAnalysing] = useState(false);
  const [jiraResults, setJiraResults] = useState(null);
  const [jiraSelected, setJiraSelected] = useState({});
  const [jiraImporting, setJiraImporting] = useState(false);
  const [jiraError, setJiraError] = useState('');
  const [jiraSuccess, setJiraSuccess] = useState('');

  const addBtnRef = useRef(null);

  // ── Toggle stage expansion ──
  const toggleStage = (key) => setExpandedStages(prev => {
    const n = new Set(prev);
    if (n.has(key)) n.delete(key); else n.add(key);
    return n;
  });

  // ── Jira CSV handlers (kept exactly as-is) ──
  const handleJiraAnalyse = async () => {
    if (!jiraFile) return;
    setJiraAnalysing(true);
    setJiraError('');
    setJiraResults(null);
    try {
      const formData = new FormData();
      formData.append('file', jiraFile);
      const res = await fetch(`/api/projects/${token}/jira/csv-analyse`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setJiraResults(data);
      const selected = {};
      (data.results || []).forEach((r, i) => { if (r.is_rd) selected[i] = true; });
      setJiraSelected(selected);
    } catch (err) {
      setJiraError(err.message);
    } finally {
      setJiraAnalysing(false);
    }
  };

  const handleJiraImport = async () => {
    if (!jiraResults) return;
    const toImport = jiraResults.results.filter((_, i) => jiraSelected[i]);
    if (toImport.length === 0) { setJiraError('Select at least one activity to import'); return; }
    setJiraImporting(true);
    setJiraError('');
    try {
      const res = await fetch(`/api/projects/${token}/jira/import-activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activities: toImport }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      const listRes = await fetch(`/api/projects/${token}/core-activities`);
      if (listRes.ok) {
        const listData = await listRes.json();
        onActivitiesChange(listData.activities || []);
      }
      setJiraSuccess(`Imported ${data.totalImported} activities from Jira`);
      resetJiraImport();
      setTimeout(() => setJiraSuccess(''), 5000);
    } catch (err) {
      setJiraError(err.message);
    } finally {
      setJiraImporting(false);
    }
  };

  const resetJiraImport = () => {
    setShowJiraImport(false);
    setJiraFile(null);
    setJiraResults(null);
    setJiraSelected({});
    setJiraError('');
    setJiraAnalysing(false);
    setJiraImporting(false);
  };

  // ── Fetch sections ──
  const fetchSections = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/projects/${token}/claim-pack/sections`, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setProjectId(data.projectId);
        setSections(data.sections || {});
      }
    } catch (err) { console.error('Failed to fetch sections:', err); }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchSections(); }, [fetchSections]);

  // ── Fetch evidence for a specific activity ──
  const fetchActivityEvidence = useCallback(async (activityId, force = false) => {
    if (activityEvidence[activityId] && !force) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/projects/${token}/core-activities/${activityId}/evidence`, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        const all = [];
        Object.entries(data.steps || {}).forEach(([step, stepItems]) => {
          stepItems.forEach(item => {
            if (!all.find(e => e.id === item.id)) all.push({ ...item, _step: step });
          });
        });
        setActivityEvidence(prev => ({ ...prev, [activityId]: all }));
      }
    } catch (err) { console.error('Failed to fetch activity evidence:', err); }
  }, [token, activityEvidence]);

  // Fetch evidence when an activity is selected
  const activeActivity = activeView.type === 'activity' ? activities.find(a => a.id === activeView.id) : null;

  useEffect(() => {
    if (activeActivity) fetchActivityEvidence(activeActivity.id);
  }, [activeActivity?.id]);

  // Select first activity on mount if any exist
  useEffect(() => {
    if (activities.length > 0 && activeView.type === 'section' && activeView.id === 'overview') {
      setActiveView({ type: 'activity', id: activities[0].id });
    }
  }, [activities.length]);

  // ── Handlers ──
  const handleActivityCreated = (newActivity) => {
    if (onActivitiesChange) onActivitiesChange([...activities, newActivity]);
    setActiveView({ type: 'activity', id: newActivity.id });
  };

  const handleActivitiesChange = (updater) => {
    if (!onActivitiesChange) return;
    if (typeof updater === 'function') {
      onActivitiesChange(updater(activities));
      // If deleted the current activity, go to overview
      const updated = updater(activities);
      if (activeView.type === 'activity' && !updated.find(a => a.id === activeView.id)) {
        setActiveView(updated.length > 0 ? { type: 'activity', id: updated[0].id } : { type: 'section', id: 'overview' });
      }
    } else {
      onActivitiesChange(updater);
    }
  };

  const handleLinkEvidence = async (evidenceId, activityId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const step = items.find(e => e.id === evidenceId)?.systematic_step_primary || 'Hypothesis';
      await fetch(`/api/projects/${token}/core-activities/${activityId}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ evidence_ids: [evidenceId], step }),
      });
      await fetchActivityEvidence(activityId, true);
    } catch (err) { console.error('Link failed:', err); }
  };

  // Link multiple evidence items to a specific activity + step (used by EvidencePicker)
  const handlePickerLink = async (evidenceIds, step, activityId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`/api/projects/${token}/core-activities/${activityId}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ evidence_ids: evidenceIds, step }),
      });
      await fetchActivityEvidence(activityId, true);
    } catch (err) { console.error('Link failed:', err); }
  };

  const handleUnlinkEvidence = async (evidenceId, activityId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`/api/projects/${token}/core-activities/${activityId}/evidence`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ evidence_ids: [evidenceId] }),
      });
      await fetchActivityEvidence(activityId, true);
    } catch (err) { console.error('Unlink failed:', err); }
  };

  const handleEvidenceCreated = () => {
    // Refresh evidence for current activity
    if (activeActivity) fetchActivityEvidence(activeActivity.id, true);
  };

  // ── Loading ──
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 160px)', color: '#9ca3af', fontSize: 13 }}>
        Loading workspace...
      </div>
    );
  }

  return (
    <>
      <div className="workspace-screen" style={{ display: 'flex', gap: 0, height: 'calc(100vh - 120px)', minHeight: 500 }}>
        {/* ── Activity Rail ── */}
        <ActivityRail
          activities={activities}
          activeView={activeView}
          onSelect={setActiveView}
          addBtnRef={addBtnRef}
          onAddClick={() => setShowAddMenu(prev => !prev)}
          activityEvidence={activityEvidence}
        />

        {/* ── Main content area ── */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#f8f9fa' }}>
          {/* Activity view */}
          {activeView.type === 'activity' && activeActivity && (
            <ActivityView
              activity={activeActivity}
              expandedStages={expandedStages}
              onToggleStage={toggleStage}
              sections={sections}
              projectId={projectId}
              activityEvidence={activityEvidence}
              onSaveStatus={setSaveStatus}
              token={token}
              onActivitiesChange={handleActivitiesChange}
              onGenerated={fetchSections}
              onLinkEvidence={(activityId, stageKey) => setPickerTarget({ activityId, step: stageKey })}
              onAddNote={() => setShowEvidenceModal(true)}
              onUnlinkEvidence={handleUnlinkEvidence}
            />
          )}

          {/* Project Overview */}
          {activeView.type === 'section' && activeView.id === 'overview' && (
            <SectionPanel
              sectionKey="project_overview"
              sectionName={SECTION_NAMES.project_overview || 'Project Overview & Knowledge Gap'}
              projectId={projectId}
              sections={sections}
              saveStatus={saveStatus}
              onSaveStatus={setSaveStatus}
              token={token}
              onGenerated={fetchSections}
              activities={activities}
              items={items}
              activityEvidence={activityEvidence}
            />
          )}

          {/* Financials */}
          {activeView.type === 'section' && activeView.id === 'financials' && (
            <FinancialsPage token={token} activities={activities} />
          )}

          {/* R&D Boundary */}
          {activeView.type === 'section' && activeView.id === 'boundary' && (
            <SectionPanel
              sectionKey="rd_boundary"
              sectionName={SECTION_NAMES.rd_boundary || 'R&D vs Non-R&D Boundary'}
              projectId={projectId}
              sections={sections}
              saveStatus={saveStatus}
              onSaveStatus={setSaveStatus}
              token={token}
              onGenerated={fetchSections}
              activities={activities}
              items={items}
              activityEvidence={activityEvidence}
            />
          )}

          {/* Attestations */}
          {activeView.type === 'section' && activeView.id === 'attestations' && (
            <AttestationsPanel
              projectId={projectId}
              sections={sections}
              token={token}
              onSaved={fetchSections}
            />
          )}

          {/* Fallback: no activity selected and no section */}
          {activeView.type === 'activity' && !activeActivity && activities.length === 0 && (
            <div style={{ padding: '60px 40px', textAlign: 'center', color: '#9ca3af' }}>
              <div style={{ fontSize: 15, marginBottom: 8 }}>No activities yet</div>
              <div style={{ fontSize: 13 }}>Click the + button to add your first R&D activity.</div>
            </div>
          )}
        </div>

        {/* ── Add menu dropdown (anchored to + button) ── */}
        {showAddMenu && (
          <>
            <div onClick={() => setShowAddMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 60 }} />
            <div style={{
              position: 'fixed',
              top: (addBtnRef.current?.getBoundingClientRect().bottom || 0) + 6,
              left: addBtnRef.current?.getBoundingClientRect().left || 0,
              zIndex: 70, background: 'white', border: '1px solid #e5e7eb', borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden',
              minWidth: 170, padding: '4px 0',
            }}>
              <button
                onClick={() => { setShowCreateModal(true); setShowAddMenu(false); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '7px 14px',
                  fontSize: 13, color: '#374151', background: 'white', border: 'none',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}
              >
                New activity
              </button>
              <div style={{ borderTop: '1px solid #f0f0f0', margin: '4px 0' }} />
              <button
                onClick={() => { setShowEvidenceModal(true); setShowAddMenu(false); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '7px 14px',
                  fontSize: 13, color: '#374151', background: 'white', border: 'none',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}
              >
                Add evidence note
              </button>
              <button
                onClick={() => { setShowUploadModal(true); setShowAddMenu(false); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '7px 14px',
                  fontSize: 13, color: '#374151', background: 'white', border: 'none',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}
              >
                Upload file
              </button>
              <div style={{ borderTop: '1px solid #f0f0f0', margin: '4px 0' }} />
              <button
                onClick={() => { setShowJiraImport(true); setShowAddMenu(false); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '7px 14px',
                  fontSize: 13, color: '#374151', background: 'white', border: 'none',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#2684FF">
                    <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24.013 12.487V1.005A1.005 1.005 0 0 0 23.013 0z"/>
                  </svg>
                  Import from Jira
                </span>
              </button>
            </div>
          </>
        )}

        {/* ── Modals ── */}
        {showCreateModal && (
          <CreateActivityModal
            token={token}
            onCreated={handleActivityCreated}
            onClose={() => setShowCreateModal(false)}
          />
        )}

        {showEvidenceModal && (
          <AddEvidenceModal
            token={token}
            activities={activities}
            onCreated={handleEvidenceCreated}
            onClose={() => setShowEvidenceModal(false)}
          />
        )}

        {showUploadModal && (
          <UploadFileModal
            token={token}
            onCreated={handleEvidenceCreated}
            onClose={() => setShowUploadModal(false)}
          />
        )}

        {pickerTarget && (() => {
          // Map lowercase stage key to capitalized step name for API
          const stageToStep = Object.fromEntries(Object.entries(STEP_TO_STAGE).map(([k, v]) => [v, k]));
          const apiStep = stageToStep[pickerTarget.step] || 'Hypothesis';
          // Collect IDs already linked to this activity
          const linkedIds = new Set((activityEvidence[pickerTarget.activityId] || []).map(e => e.id));
          return (
            <EvidencePicker
              step={apiStep}
              allEvidence={items}
              linkedEvidenceIds={linkedIds}
              onLink={(ids) => {
                handlePickerLink(ids, apiStep, pickerTarget.activityId);
                setPickerTarget(null);
              }}
              onClose={() => setPickerTarget(null)}
            />
          );
        })()}

        {/* Jira import success banner */}
        {jiraSuccess && (
          <div style={{
            position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
            zIndex: 1000, background: '#dcfce7', border: '1px solid #86efac',
            borderRadius: 8, padding: '10px 20px', fontSize: 13, color: '#166534',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}>
            {jiraSuccess}
          </div>
        )}

        {/* Jira CSV Import Modal */}
        {showJiraImport && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
            <div style={{ background: 'white', borderRadius: 12, width: 640, maxHeight: '85vh', overflow: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: '1px solid #e5e7eb' }}>
              {/* Modal header */}
              <div style={{ padding: '18px 22px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#2684FF">
                    <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24.013 12.487V1.005A1.005 1.005 0 0 0 23.013 0z"/>
                  </svg>
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>Import R&D Activities from Jira</span>
                </div>
                <button onClick={resetJiraImport} style={{ background: 'none', border: 'none', fontSize: 20, color: '#9ca3af', cursor: 'pointer', lineHeight: 1 }}>×</button>
              </div>

              <div style={{ padding: '18px 22px' }}>
                {jiraError && (
                  <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, marginBottom: 14, fontSize: 13, color: '#dc2626' }}>
                    {jiraError}
                  </div>
                )}

                {/* Step 1: File upload */}
                {!jiraResults && (
                  <div>
                    <p style={{ fontSize: 13, color: '#6b7280', marginTop: 0, marginBottom: 14, lineHeight: 1.5 }}>
                      Export your Jira board as CSV (Filters → Export → CSV), then upload it here. AI will identify which epics are R&D and draft RDTI-ready activity descriptions.
                    </p>
                    <div style={{
                      border: '2px dashed #d1d5db', borderRadius: 8, padding: 32,
                      textAlign: 'center', background: '#fafafa', marginBottom: 16, cursor: 'pointer',
                    }}
                      onClick={() => document.getElementById('workspace-jira-csv-input').click()}
                      onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#2684FF'; }}
                      onDragLeave={e => { e.currentTarget.style.borderColor = '#d1d5db'; }}
                      onDrop={e => {
                        e.preventDefault();
                        e.currentTarget.style.borderColor = '#d1d5db';
                        const f = e.dataTransfer.files[0];
                        if (f && (f.name.endsWith('.csv') || f.type === 'text/csv')) setJiraFile(f);
                      }}
                    >
                      <input
                        id="workspace-jira-csv-input"
                        type="file"
                        accept=".csv"
                        style={{ display: 'none' }}
                        onChange={e => { if (e.target.files[0]) setJiraFile(e.target.files[0]); }}
                      />
                      {jiraFile ? (
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 4 }}>{jiraFile.name}</div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>{(jiraFile.size / 1024).toFixed(1)} KB</div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize: 14, color: '#374151', marginBottom: 4 }}>Drop a Jira CSV here or click to browse</div>
                          <div style={{ fontSize: 12, color: '#9ca3af' }}>Supports standard Jira CSV exports</div>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <button onClick={resetJiraImport} style={{ padding: '7px 14px', fontSize: 13, color: '#6b7280', background: 'white', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Cancel
                      </button>
                      <button
                        onClick={handleJiraAnalyse}
                        disabled={!jiraFile || jiraAnalysing}
                        style={{
                          padding: '7px 18px', fontSize: 13, fontWeight: 600,
                          background: (!jiraFile || jiraAnalysing) ? '#e5e7eb' : NAVY,
                          color: (!jiraFile || jiraAnalysing) ? '#9ca3af' : 'white',
                          border: 'none', borderRadius: 6,
                          cursor: (!jiraFile || jiraAnalysing) ? 'default' : 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        {jiraAnalysing ? 'Analysing...' : 'Analyse CSV'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Triage results */}
                {jiraResults && (
                  <div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 14 }}>
                      Analysed {jiraResults.totalIssues} issues across {jiraResults.epicCount} epics. Select the activities to import.
                    </div>

                    {/* R&D activities */}
                    {jiraResults.results.filter(r => r.is_rd).length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#166534', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                          R&D Activities ({jiraResults.results.filter(r => r.is_rd).length})
                        </div>
                        {jiraResults.results.map((r, i) => {
                          if (!r.is_rd) return null;
                          return (
                            <div key={i} style={{
                              border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, marginBottom: 8,
                              background: jiraSelected[i] ? '#f0f9ff' : 'white', transition: 'background 0.15s',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                <input type="checkbox" checked={!!jiraSelected[i]} onChange={() => setJiraSelected(prev => ({ ...prev, [i]: !prev[i] }))} style={{ marginTop: 3, accentColor: NAVY }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 3 }}>{r.activity_name}</div>
                                  <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>
                                    From: &quot;{r.epic_name}&quot; · {r.classification === 'core' ? 'Core R&D' : 'Supporting'} · {(r.issues || []).length} issues
                                  </div>
                                  <div style={{ fontSize: 12, color: '#4b5563', marginBottom: 6, lineHeight: 1.5 }}>
                                    <strong style={{ color: '#374151' }}>Uncertainty:</strong> {r.uncertainty}
                                  </div>
                                  <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>{r.reason}</div>
                                  {r.issues && r.issues.length > 0 && (
                                    <details style={{ marginTop: 8 }}>
                                      <summary style={{ fontSize: 11, color: '#9ca3af', cursor: 'pointer' }}>{r.issues.length} Jira issues mapped</summary>
                                      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                        {r.issues.map((issue, j) => (
                                          <div key={j} style={{ fontSize: 11, color: '#6b7280', display: 'flex', gap: 6, alignItems: 'center' }}>
                                            <span style={{
                                              padding: '1px 5px', borderRadius: 3, fontSize: 10, fontWeight: 600,
                                              background: issue.step === 'Hypothesis' ? '#ede9fe' : issue.step === 'Experiment' ? '#dbeafe' : issue.step === 'Observation' ? '#d1fae5' : issue.step === 'Evaluation' ? '#fef3c7' : issue.step === 'Conclusion' ? '#fee2e2' : '#f3f4f6',
                                              color: issue.step === 'Hypothesis' ? '#7c3aed' : issue.step === 'Experiment' ? '#2563eb' : issue.step === 'Observation' ? '#059669' : issue.step === 'Evaluation' ? '#d97706' : issue.step === 'Conclusion' ? '#dc2626' : '#6b7280',
                                            }}>
                                              {(issue.step || '?').slice(0, 3)}
                                            </span>
                                            <span style={{ fontFamily: 'ui-monospace,monospace', fontWeight: 600, color: '#374151' }}>{issue.key}</span>
                                            <span>{issue.summary}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </details>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Not R&D */}
                    {jiraResults.results.filter(r => !r.is_rd).length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                          Not R&D ({jiraResults.results.filter(r => !r.is_rd).length})
                        </div>
                        {jiraResults.results.map((r, i) => {
                          if (r.is_rd) return null;
                          return (
                            <div key={i} style={{
                              border: '1px solid #f3f4f6', borderRadius: 8, padding: 12, marginBottom: 6,
                              background: jiraSelected[i] ? '#f0f9ff' : '#fafafa',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                <input type="checkbox" checked={!!jiraSelected[i]} onChange={() => setJiraSelected(prev => ({ ...prev, [i]: !prev[i] }))} style={{ marginTop: 2, accentColor: NAVY }} title="Override — import as R&D anyway" />
                                <div>
                                  <div style={{ fontSize: 13, color: '#6b7280' }}>&quot;{r.epic_name}&quot;</div>
                                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{r.reason}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #f3f4f6' }}>
                      <button onClick={() => { setJiraResults(null); setJiraFile(null); setJiraSelected({}); }} style={{ padding: '7px 14px', fontSize: 13, color: '#6b7280', background: 'white', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Back
                      </button>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={resetJiraImport} style={{ padding: '7px 14px', fontSize: 13, color: '#6b7280', background: 'white', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}>
                          Cancel
                        </button>
                        <button
                          onClick={handleJiraImport}
                          disabled={jiraImporting || Object.values(jiraSelected).filter(Boolean).length === 0}
                          style={{
                            padding: '7px 18px', fontSize: 13, fontWeight: 600,
                            background: (jiraImporting || Object.values(jiraSelected).filter(Boolean).length === 0) ? '#e5e7eb' : NAVY,
                            color: (jiraImporting || Object.values(jiraSelected).filter(Boolean).length === 0) ? '#9ca3af' : 'white',
                            border: 'none', borderRadius: 6,
                            cursor: (jiraImporting || Object.values(jiraSelected).filter(Boolean).length === 0) ? 'default' : 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          {jiraImporting ? 'Importing...' : `Import ${Object.values(jiraSelected).filter(Boolean).length} Activities`}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ PRINT LAYOUT — hidden on screen, shown on print ══ */}
      <div className="workspace-print" style={{ display: 'none' }}>
        {/* Cover page */}
        <div className="print-cover" style={{
          pageBreakAfter: 'always', backgroundColor: NAVY,
          WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
          display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -120, right: -120, width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
          <div style={{ position: 'absolute', bottom: -80, left: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.02)' }} />
          <div style={{ padding: '48px 56px 0' }}>
            <img src="/claimflow-white-text-and-icon.png" alt="ClaimFlow" style={{ height: 40, width: 'auto' }} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 56px' }}>
            <div style={{ width: 56, height: 3, backgroundColor: 'rgba(255,255,255,0.25)', marginBottom: 24 }} />
            <h1 style={{ fontSize: 36, fontWeight: 700, color: '#fff', margin: '0 0 10px', lineHeight: 1.15, letterSpacing: '-0.01em' }}>
              R&D Tax Incentive<br />Substantiation Pack
            </h1>
            <div style={{ width: 56, height: 3, backgroundColor: 'rgba(255,255,255,0.25)', margin: '18px 0 24px' }} />
            <h2 style={{ fontSize: 22, fontWeight: 500, color: 'rgba(255,255,255,0.85)', margin: '0 0 6px' }}>
              {project.name || 'Project'}
            </h2>
          </div>
          <div style={{ padding: '0 56px 44px', display: 'flex', gap: 24, fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
            <span>FY{project.year || new Date().getFullYear()}</span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
            <span>{new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
            <span>Confidential</span>
          </div>
        </div>

        {/* Project Overview */}
        {sections.project_overview?.content && (
          <div className="print-section">
            <h2 className="print-section-title">Project Overview & Existing Knowledge</h2>
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(sections.project_overview.content) }} />
          </div>
        )}

        {/* Activity narratives */}
        {activities.map((act, i) => (
          <div key={act.id} className="print-section" style={{ pageBreakBefore: 'always' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Core Activity {i + 1}
            </div>
            <h2 className="print-section-title" style={{ marginTop: 0 }}>{act.name}</h2>
            {act.uncertainty && (
              <p style={{ fontSize: 11, color: '#6b7280', fontStyle: 'italic', margin: '0 0 16px', lineHeight: 1.5 }}>
                {act.uncertainty}
              </p>
            )}
            {ACTIVITY_NARRATIVE_STEPS.map(({ key, label }) => {
              const content = sections[`activity_${act.id}_${key}`]?.content;
              if (!content || content.replace(/<[^>]*>/g, '').trim().length < 5) return null;
              return (
                <div key={key} style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#374151', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#9ca3af' }}>—</span> {label}
                  </h3>
                  <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />
                </div>
              );
            })}
          </div>
        ))}

        {/* Financials narrative */}
        {sections.financials?.content && (
          <div className="print-section" style={{ pageBreakBefore: 'always' }}>
            <h2 className="print-section-title">Financials & Notional Deductions</h2>
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(sections.financials.content) }} />
          </div>
        )}

        {/* Financials figures — R&D Tax Incentive Schedule + detail tables */}
        <FinancialsPrintSection token={token} />

        {/* R&D Boundary */}
        {sections.rd_boundary?.content && (
          <div className="print-section">
            <h2 className="print-section-title">R&D vs Non-R&D Boundary</h2>
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(sections.rd_boundary.content) }} />
          </div>
        )}

        {/* Attestations & Sign-offs */}
        {(() => {
          let sigs = {};
          try {
            const c = sections.attestations?.content;
            if (c && c.startsWith('{')) sigs = JSON.parse(c);
          } catch {}
          const hasSigs = SIGN_OFF_ROLES.some(r => sigs[r.key]?.signature);
          if (!hasSigs) return null;
          return (
            <div className="print-section" style={{ pageBreakBefore: 'always' }}>
              <h2 className="print-section-title">Attestations & Sign-offs</h2>
              {SIGN_OFF_ROLES.map(role => {
                const sig = sigs[role.key];
                if (!sig?.signature) return (
                  <div key={role.key} style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>{role.title}</h3>
                    <p style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>Not yet signed</p>
                  </div>
                );
                return (
                  <div key={role.key} style={{ marginBottom: 28 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 6px' }}>{role.title}</h3>
                    <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 10px', lineHeight: 1.5 }}>{role.description}</p>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24 }}>
                      <div>
                        <img src={sig.signature} alt="Signature" style={{ maxHeight: 60, maxWidth: 200 }} />
                        <div style={{ borderTop: '1px solid #111', width: 200, paddingTop: 4, fontSize: 11 }}>
                          {sig.signedBy || 'Name'}
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>
                        Date: {new Date(sig.signedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Footer */}
        <div style={{ marginTop: 40, paddingTop: 14, borderTop: '1px solid #ddd', fontSize: 10, color: '#999', textAlign: 'center' }}>
          Generated by ClaimFlow · {new Date().toLocaleDateString('en-AU')} · R&D Tax Incentive substantiation documentation
        </div>
      </div>

      <style>{`
        @media print {
          /* Hide workspace UI, show print layout */
          body { background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          header, aside { display: none !important; }
          .workspace-screen { display: none !important; }
          .workspace-print { display: block !important; }

          /* Page setup */
          @page { size: A4; margin: 2.5cm 2cm; }

          /* Cover page fills margins */
          .print-cover {
            margin: -2.5cm -2cm 0 -2cm !important;
            padding: 2.5cm 2cm 0 2cm !important;
            min-height: calc(100vh + 2.5cm) !important;
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Section styling */
          .print-section {
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 11pt;
            line-height: 1.7;
            color: #111;
            page-break-inside: avoid;
          }
          .print-section p { margin: 0 0 10px; }
          .print-section h2, .print-section h3 { page-break-after: avoid; }
          .print-section-title {
            font-size: 18pt;
            font-weight: 700;
            color: #111;
            margin: 0 0 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid #ddd;
          }
          .print-section ul, .print-section ol { padding-left: 20px; margin: 0 0 10px; }
          .print-section li { margin-bottom: 3px; }
          .print-section strong { font-weight: 600; color: #111; }
        }

        /* Screen styles */
        .workspace-inline-editor .ProseMirror {
          outline: none;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 16px;
          line-height: 1.8;
          color: #1a1a1a;
          min-height: 60px;
        }
        .workspace-inline-editor .ProseMirror p { margin: 0 0 12px 0; }
        .workspace-inline-editor .ProseMirror p:last-child { margin-bottom: 0; }
        .workspace-inline-editor .ProseMirror h2 {
          font-size: 15px; font-weight: 600; color: #1f2937;
          margin: 20px 0 8px 0;
        }
        .workspace-inline-editor .ProseMirror h3 {
          font-size: 14px; font-weight: 600; color: #374151;
          margin: 16px 0 6px 0;
        }
        .workspace-inline-editor .ProseMirror ul,
        .workspace-inline-editor .ProseMirror ol {
          margin: 0 0 12px 0; padding-left: 20px;
        }
        .workspace-inline-editor .ProseMirror li { margin-bottom: 4px; }
        .workspace-inline-editor .ProseMirror strong { font-weight: 600; color: #111827; }
        .workspace-inline-editor .ProseMirror blockquote {
          border-left: 3px solid ${NAVY}; padding-left: 14px; margin: 12px 0; color: #374151;
        }
        .workspace-inline-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left; color: #d1d5db; pointer-events: none; height: 0;
          font-style: italic; font-size: 15px;
        }
      `}</style>
    </>
  );
}
