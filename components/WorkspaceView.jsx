'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { SECTION_NAMES } from '@/lib/claimFlowMasterContext';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { marked } from 'marked';

const NAVY = '#021048';

const SOURCE_ICONS = {
  manual: 'M', note: 'M', email: '@', github: 'G',
  document: 'D', upload: 'U', jira: 'J',
};

const ACTIVITY_STEPS = [
  { key: 'prior_knowledge', label: 'Prior Knowledge', placeholder: 'What existing sources, standards, or literature were checked? Why were they insufficient?' },
  { key: 'hypothesis', label: 'Hypothesis', placeholder: 'What testable proposition was formed? What measurable outcome was expected?' },
  { key: 'experiment', label: 'Experiment', placeholder: 'What methodology was used? What controls and test environments were set up?' },
  { key: 'observation', label: 'Observation', placeholder: 'What data was collected? What results were observed, including any failures?' },
  { key: 'evaluation', label: 'Evaluation', placeholder: 'How were results analysed against the hypothesis? What comparisons were made?' },
  { key: 'conclusion', label: 'Conclusion', placeholder: 'What new knowledge was generated? What was definitively learned?' },
];

// Project-level tabs
const PROJECT_TABS = [
  { key: 'project_overview', label: 'Overview' },
];
const SUFFIX_TABS = [
  { key: 'financials', label: 'Financials' },
  { key: 'rd_boundary', label: 'R&D Boundary' },
];
const MORE_TABS = [
  { key: 'overseas_contracted', label: 'Overseas & Contracted' },
  { key: 'registration_tieout', label: 'Registration' },
  { key: 'attestations', label: 'Attestations' },
];

function relativeTime(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function normaliseContent(raw) {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (trimmed.startsWith('<')) return trimmed;
  return marked.parse(trimmed, { breaks: false });
}

/* ── Inline Section Editor with floating toolbar ── */
function InlineEditor({ sectionKey, projectId, initialContent, placeholder, onSaveStatus }) {
  const [saveTimer, setSaveTimer] = useState(null);
  const [toolbarPos, setToolbarPos] = useState(null);
  const isDirtyRef = useRef(false);
  const wrapperRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Placeholder.configure({ placeholder: placeholder || 'Start typing...' }),
    ],
    content: normaliseContent(initialContent),
    editable: true,
    onUpdate: ({ editor }) => {
      if (!isDirtyRef.current) return;
      const html = editor.getHTML();
      if (saveTimer) clearTimeout(saveTimer);
      const timer = setTimeout(() => handleSave(html), 2000);
      setSaveTimer(timer);
    },
    onSelectionUpdate: ({ editor }) => {
      isDirtyRef.current = true;
      const { from, to } = editor.state.selection;
      if (from === to) { setToolbarPos(null); return; }
      const domSel = window.getSelection();
      if (!domSel || domSel.rangeCount === 0) return;
      const rect = domSel.getRangeAt(0).getBoundingClientRect();
      const wr = wrapperRef.current?.getBoundingClientRect();
      if (!wr || rect.width === 0) return;
      setToolbarPos({ top: rect.top - wr.top - 44, left: rect.left - wr.left + rect.width / 2 });
    },
  });

  useEffect(() => {
    const hide = () => setTimeout(() => {
      if (editor && editor.state.selection.from === editor.state.selection.to) setToolbarPos(null);
    }, 200);
    document.addEventListener('mousedown', hide);
    return () => document.removeEventListener('mousedown', hide);
  }, [editor]);

  useEffect(() => {
    const n = normaliseContent(initialContent);
    if (editor) { editor.commands.setContent(n || ''); isDirtyRef.current = false; }
  }, [initialContent, sectionKey]);

  const handleSave = useCallback(async (content) => {
    if (!content || content === '<p></p>') return;
    onSaveStatus?.('saving');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const res = await fetch(`/api/claim-pack-sections/${projectId}/${sectionKey}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error('Save failed');
      onSaveStatus?.('saved');
      setTimeout(() => onSaveStatus?.(''), 2000);
    } catch { onSaveStatus?.('error'); }
  }, [projectId, sectionKey, onSaveStatus]);

  if (!editor) return null;

  const TB = ({ label, action, active, style: s = {} }) => (
    <button onMouseDown={e => { e.preventDefault(); action(); }} style={{
      padding: '4px 8px', minWidth: 28, backgroundColor: active ? 'white' : 'transparent',
      color: active ? '#111' : 'rgba(255,255,255,0.9)', border: 'none', borderRadius: 4,
      fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'system-ui', lineHeight: 1.2, ...s,
    }}>{label}</button>
  );

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      {toolbarPos && (
        <div onMouseDown={e => e.preventDefault()} style={{
          position: 'absolute', top: toolbarPos.top, left: toolbarPos.left, transform: 'translateX(-50%)',
          zIndex: 20, display: 'flex', alignItems: 'center', gap: 2,
          backgroundColor: '#1a1a1a', borderRadius: 8, padding: '4px 6px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)', whiteSpace: 'nowrap',
        }}>
          <TB label="B" action={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} style={{ fontWeight: 800 }} />
          <TB label="I" action={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} style={{ fontStyle: 'italic' }} />
          <TB label="H2" action={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} style={{ fontSize: 11 }} />
          <div style={{ width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />
          <button onMouseDown={e => e.preventDefault()} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
            backgroundColor: NAVY, color: 'white', border: 'none', borderRadius: 5,
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'system-ui',
          }}>
            <span style={{ fontSize: 14 }}>&#10022;</span> Rewrite
          </button>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

/* ── Evidence row (compact) ── */
function EvidenceRow({ ev, evidenceSteps, evidenceActivityTypes, selected, onClick }) {
  const step = evidenceSteps?.[ev.id]?.step || ev.systematic_step_primary;
  const actType = evidenceActivityTypes?.[ev.id]?.activity_type || ev.activity_type || 'core';
  return (
    <div onClick={onClick} style={{
      padding: '10px 16px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer',
      backgroundColor: selected ? '#f0f4ff' : 'white', transition: 'background-color 0.12s',
    }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.backgroundColor = '#fafbfc'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.backgroundColor = 'white'; }}
    >
      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'ui-monospace, Monaco, monospace' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 3, backgroundColor: '#f3f4f6', fontSize: 10, fontWeight: 700, color: '#6b7280', flexShrink: 0 }}>
          {SOURCE_ICONS[ev.source] || 'M'}
        </span>
        <span style={{ color: '#6b7280', fontWeight: 500 }}>{relativeTime(ev.created_at)}</span>
        {step && step !== 'Unknown' && (<><span style={{ color: '#d1d5db' }}>·</span><span style={{ color: '#374151', fontWeight: 600, fontSize: 11 }}>{step}</span></>)}
        {actType && (<><span style={{ color: '#d1d5db' }}>·</span><span style={{ padding: '1px 5px', fontSize: 10, fontWeight: 600, borderRadius: 3, backgroundColor: actType === 'core' ? NAVY : '#6b7280', color: 'white' }}>{actType === 'core' ? 'Core' : 'Supporting'}</span></>)}
      </div>
      {ev.content && (<p style={{ fontSize: 13, color: '#1a1a1a', lineHeight: 1.5, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{ev.content}</p>)}
      {ev.author_email && (<div style={{ fontSize: 11, color: '#c0c5ce', marginTop: 4 }}>{ev.author_email}</div>)}
    </div>
  );
}

/* ── Create activity modal ── */
function CreateActivityModal({ token, onCreated, onClose }) {
  const [name, setName] = useState('');
  const [uncertainty, setUncertainty] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim() || !uncertainty.trim()) return;
    setSaving(true); setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/projects/${token}/core-activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ name: name.trim(), uncertainty: uncertainty.trim() }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      onCreated(await res.json());
      onClose();
    } catch (err) { setError(err.message); }
    setSaving(false);
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: 12, width: 460, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>New activity</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 18, color: '#9ca3af', cursor: 'pointer', padding: '0 4px' }}>×</button>
        </div>
        <div style={{ padding: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Activity name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Isolation Forest Thresholding" maxLength={60} autoFocus
            style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = NAVY} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, textAlign: 'right' }}>{name.length}/60</div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, marginTop: 12 }}>Technical uncertainty</label>
          <textarea value={uncertainty} onChange={e => setUncertainty(e.target.value)} placeholder="What technical unknown are you investigating?" maxLength={800} rows={3}
            style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 }}
            onFocus={e => e.target.style.borderColor = NAVY} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, textAlign: 'right' }}>{uncertainty.length}/800</div>
          {error && <div style={{ fontSize: 12, color: '#dc2626', marginTop: 8 }}>{error}</div>}
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '7px 14px', fontSize: 13, fontWeight: 500, color: '#6b7280', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={handleCreate} disabled={saving || !name.trim() || !uncertainty.trim()} style={{ padding: '7px 16px', fontSize: 13, fontWeight: 600, color: 'white', backgroundColor: saving || !name.trim() || !uncertainty.trim() ? '#a5b4fc' : NAVY, border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {saving ? 'Creating...' : 'Create activity'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Per-activity narrative panel ── */
function ActivityNarrativePanel({ activity, projectId, token, sections, saveStatus, onSaveStatus, onGenerated }) {
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);
  const isAI = activity.source === 'ai';

  // Check if any sections have content
  const hasContent = ACTIVITY_STEPS.some(({ key }) => {
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

  return (
    <div style={{ padding: '28px 36px 36px' }}>
      {/* Activity header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.3 }}>
            {activity.name}
          </h1>
          <span style={{ padding: '2px 8px', fontSize: 11, fontWeight: 600, borderRadius: 4, backgroundColor: isAI ? '#ede9fe' : '#ecfdf5', color: isAI ? '#7c3aed' : '#059669' }}>
            {isAI ? 'AI' : 'Manual'}
          </span>
          <span style={{ padding: '2px 8px', fontSize: 11, fontWeight: 500, borderRadius: 4, backgroundColor: activity.status === 'adopted' ? '#dcfce7' : '#fef9c3', color: activity.status === 'adopted' ? '#166534' : '#854d0e' }}>
            {activity.status === 'adopted' ? 'Adopted' : 'Draft'}
          </span>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{
            padding: '6px 14px', fontSize: 12, fontWeight: 600,
            color: 'white', backgroundColor: generating ? '#9ca3af' : NAVY,
            border: 'none', borderRadius: 6,
            cursor: generating ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            flexShrink: 0,
          }}
        >
          {generating ? (
            'Generating...'
          ) : (
            <><span style={{ fontSize: 14 }}>&#10022;</span> {hasContent ? 'Regenerate' : 'Generate narrative'}</>
          )}
        </button>
      </div>

      {/* Uncertainty */}
      {activity.uncertainty && (
        <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 4px', lineHeight: 1.5 }}>
          {activity.uncertainty}
        </p>
      )}

      {/* Save status + gen error */}
      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 28, minHeight: 18 }}>
        {saveStatus === 'saving' && 'Saving...'}
        {saveStatus === 'saved' && <span style={{ color: '#10b981' }}>Saved</span>}
        {saveStatus === 'error' && <span style={{ color: '#ef4444' }}>Save failed</span>}
        {genError && <span style={{ color: '#ef4444' }}>{genError}</span>}
      </div>

      {/* Systematic progression — 6 sections */}
      {ACTIVITY_STEPS.map(({ key, label, placeholder }) => {
        const sectionKey = `activity_${activity.id}_${key}`;
        const existing = sections[sectionKey];
        return (
          <div key={key} style={{ marginBottom: 28 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
              color: '#374151', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ color: '#9ca3af', fontWeight: 400 }}>—</span> {label}
            </div>
            <div className="workspace-inline-editor">
              <InlineEditor
                key={sectionKey}
                sectionKey={sectionKey}
                projectId={projectId}
                initialContent={existing?.content || null}
                placeholder={placeholder}
                onSaveStatus={onSaveStatus}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Project-level section panel (Overview, Financials, etc.) ── */
function SectionPanel({ sectionKey, sectionName, projectId, sections, saveStatus, onSaveStatus }) {
  const data = sections[sectionKey] || {};
  return (
    <div style={{ padding: '28px 36px 36px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: '0 0 6px', lineHeight: 1.3 }}>
        {sectionName}
      </h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 12, color: '#9ca3af', minHeight: 18 }}>
        {data.last_edited_at && (
          <span>
            {data.ai_generated !== false ? 'AI draft' : 'Edited'}{' '}
            {new Date(data.last_edited_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        )}
        {saveStatus === 'saving' && <span>Saving...</span>}
        {saveStatus === 'saved' && <span style={{ color: '#10b981' }}>Saved</span>}
        {saveStatus === 'error' && <span style={{ color: '#ef4444' }}>Save failed</span>}
      </div>
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
  onActivitiesChange,
}) {
  const [activeTab, setActiveTab] = useState('project_overview');
  const [sections, setSections] = useState({});
  const [projectId, setProjectId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('');
  const [selectedEvidenceId, setSelectedEvidenceId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showAllEvidence, setShowAllEvidence] = useState(false);
  const [activityEvidence, setActivityEvidence] = useState({});

  // Fetch sections
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

  // Fetch evidence for a specific activity
  const fetchActivityEvidence = useCallback(async (activityId) => {
    if (activityEvidence[activityId]) return;
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

  // Determine if current tab is an activity
  const activeActivity = activities.find(a => `activity_${a.id}` === activeTab);
  const isActivityTab = !!activeActivity;

  // Fetch activity evidence when switching to activity tab
  useEffect(() => {
    if (activeActivity) fetchActivityEvidence(activeActivity.id);
  }, [activeActivity, fetchActivityEvidence]);

  // Build tab list
  const tabs = [
    ...PROJECT_TABS,
    ...activities.map(a => ({ key: `activity_${a.id}`, label: a.name, isActivity: true })),
    ...SUFFIX_TABS,
  ];

  // Evidence filtering
  const filteredEvidence = (() => {
    if (!isActivityTab || showAllEvidence) return items;
    const actEvidence = activityEvidence[activeActivity?.id];
    if (!actEvidence) return [];
    const ids = new Set(actEvidence.map(e => e.id));
    return items.filter(e => ids.has(e.id));
  })();

  const handleActivityCreated = (newActivity) => {
    if (onActivitiesChange) onActivitiesChange([...activities, newActivity]);
    setActiveTab(`activity_${newActivity.id}`);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 160px)', color: '#9ca3af', fontSize: 13 }}>
        Loading workspace...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 0, height: 'calc(100vh - 120px)', minHeight: 500 }}>
      {/* ── Left panel ── */}
      <div style={{
        width: 340, minWidth: 280, flexShrink: 0, borderRight: '1px solid #e5e5e5',
        display: 'flex', flexDirection: 'column', backgroundColor: 'white',
      }}>
        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>
              {isActivityTab ? 'Evidence' : 'Activities & Evidence'}
              {isActivityTab && !showAllEvidence && (
                <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: 6, fontSize: 12 }}>
                  for {activeActivity.name}
                </span>
              )}
            </h2>
            {!isActivityTab && (
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  padding: '4px 10px', fontSize: 12, fontWeight: 500,
                  color: '#374151', backgroundColor: 'white',
                  border: '1px solid #e5e7eb', borderRadius: 5,
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}
              >
                <span style={{ fontSize: 13, lineHeight: 1 }}>+</span> New
              </button>
            )}
            {isActivityTab && (
              <span style={{ fontSize: 12, color: '#9ca3af' }}>{filteredEvidence.length} items</span>
            )}
          </div>
          {isActivityTab && (
            <button
              onClick={() => setShowAllEvidence(prev => !prev)}
              style={{
                marginTop: 6, fontSize: 12, color: NAVY, background: 'none', border: 'none',
                cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontWeight: 500,
              }}
            >
              {showAllEvidence ? 'Show activity evidence only' : 'Show all evidence'}
            </button>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Activities list — shown on project-level tabs */}
          {!isActivityTab && activities.length > 0 && (
            <div>
              <div style={{
                padding: '10px 16px 4px', fontSize: 11, fontWeight: 700,
                color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                Activities ({activities.length})
              </div>
              {activities.map(act => {
                return (
                  <div
                    key={act.id}
                    onClick={() => { setActiveTab(`activity_${act.id}`); setShowAllEvidence(false); }}
                    style={{
                      padding: '10px 16px', borderBottom: '1px solid #f0f0f0',
                      cursor: 'pointer', transition: 'background-color 0.12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fafbfc'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {act.name}
                      </span>
                      <span style={{
                        padding: '1px 5px', fontSize: 10, fontWeight: 600, borderRadius: 3, flexShrink: 0,
                        backgroundColor: act.source === 'ai' ? '#ede9fe' : '#ecfdf5',
                        color: act.source === 'ai' ? '#7c3aed' : '#059669',
                      }}>
                        {act.source === 'ai' ? 'AI' : 'Manual'}
                      </span>
                      <span style={{
                        padding: '1px 5px', fontSize: 10, fontWeight: 500, borderRadius: 3, flexShrink: 0,
                        backgroundColor: act.status === 'adopted' ? '#dcfce7' : '#fef9c3',
                        color: act.status === 'adopted' ? '#166534' : '#854d0e',
                      }}>
                        {act.status === 'adopted' ? 'Adopted' : 'Draft'}
                      </span>
                    </div>
                    {act.uncertainty && (
                      <p style={{
                        fontSize: 12, color: '#6b7280', margin: 0, lineHeight: 1.4,
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      }}>
                        {act.uncertainty}
                      </p>
                    )}
                  </div>
                );
              })}

              {/* Divider between activities and evidence */}
              <div style={{ padding: '10px 16px 4px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Evidence ({items.length})
              </div>
            </div>
          )}

          {/* Evidence list */}
          {filteredEvidence.length > 0 ? (
            filteredEvidence.map(ev => (
              <EvidenceRow
                key={ev.id}
                ev={ev}
                evidenceSteps={evidenceSteps}
                evidenceActivityTypes={evidenceActivityTypes}
                selected={selectedEvidenceId === ev.id}
                onClick={() => setSelectedEvidenceId(ev.id)}
              />
            ))
          ) : (
            <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              {isActivityTab ? 'No evidence linked to this activity yet' : 'No evidence yet'}
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel: Narrative ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, backgroundColor: 'white' }}>
        {/* Tab bar */}
        <div style={{
          display: 'flex', alignItems: 'center', borderBottom: '1px solid #f0f0f0',
          padding: '0 24px', flexShrink: 0, overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', flex: 1 }}>
            {tabs.map(tab => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setShowAllEvidence(false); }}
                  style={{
                    padding: '10px 14px', fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#111827' : '#9ca3af',
                    backgroundColor: 'transparent', border: 'none',
                    borderBottom: `2px solid ${isActive ? '#111827' : 'transparent'}`,
                    cursor: 'pointer', fontFamily: 'inherit',
                    whiteSpace: 'nowrap', flexShrink: 0,
                    marginBottom: -1, transition: 'all 0.12s',
                    maxWidth: tab.isActivity ? 140 : 'none',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                  }}
                  title={tab.label}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* More dropdown */}
          <div style={{ position: 'relative', flexShrink: 0, marginLeft: 4 }}>
            <button
              onClick={() => setShowMore(prev => !prev)}
              style={{
                padding: '10px 12px', fontSize: 13, fontWeight: 400, color: '#9ca3af',
                backgroundColor: 'transparent', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}
            >
              More ▾
            </button>
            {showMore && (
              <div onClick={e => e.stopPropagation()} style={{
                position: 'absolute', top: '100%', right: 0, zIndex: 50,
                backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 8,
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)', overflow: 'hidden', minWidth: 180,
              }}>
                {MORE_TABS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => { setActiveTab(tab.key); setShowMore(false); }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '9px 16px', fontSize: 13, color: activeTab === tab.key ? '#111827' : '#6b7280',
                      fontWeight: activeTab === tab.key ? 600 : 400,
                      backgroundColor: activeTab === tab.key ? '#f9fafb' : 'white',
                      border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={e => { if (activeTab !== tab.key) e.currentTarget.style.backgroundColor = 'white'; }}
                  >
                    {tab.label}
                  </button>
                ))}
                <div style={{ borderTop: '1px solid #f0f0f0' }}>
                  <button
                    onClick={() => { setShowCreateModal(true); setShowMore(false); }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '9px 16px', fontSize: 13, color: NAVY, fontWeight: 600,
                      backgroundColor: 'white', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0f4ff'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    + New Activity
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content area */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isActivityTab ? (
            <ActivityNarrativePanel
              activity={activeActivity}
              projectId={projectId}
              token={token}
              sections={sections}
              saveStatus={saveStatus}
              onSaveStatus={setSaveStatus}
              onGenerated={fetchSections}
            />
          ) : (
            (() => {
              const allSectionKeys = [...PROJECT_TABS, ...SUFFIX_TABS, ...MORE_TABS];
              const tab = allSectionKeys.find(t => t.key === activeTab);
              if (!tab) return null;
              return (
                <SectionPanel
                  sectionKey={tab.key}
                  sectionName={SECTION_NAMES[tab.key] || tab.label}
                  projectId={projectId}
                  sections={sections}
                  saveStatus={saveStatus}
                  onSaveStatus={setSaveStatus}
                />
              );
            })()
          )}
        </div>
      </div>

      {/* Create activity modal */}
      {showCreateModal && (
        <CreateActivityModal
          token={token}
          onCreated={handleActivityCreated}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Close more dropdown on outside click */}
      {showMore && (
        <div onClick={() => setShowMore(false)} style={{ position: 'fixed', inset: 0, zIndex: 25 }} />
      )}

      <style>{`
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
    </div>
  );
}
