'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { SECTION_NAMES } from '@/lib/claimFlowMasterContext';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { marked } from 'marked';
import FinancialsPage from './financials/FinancialsPage';

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

const STEPS = ['Hypothesis', 'Experiment', 'Observation', 'Evaluation', 'Conclusion', 'Unknown'];
const ACT_TYPES = [{ value: 'core', label: 'Core R&D' }, { value: 'supporting', label: 'Supporting R&D' }];

/* ── Evidence row (compact) with right-click context menu ── */
function EvidenceRow({ ev, evidenceSteps, evidenceActivityTypes, selected, onClick, contextActions, token, onEvidenceChange }) {
  const [ctxMenu, setCtxMenu] = useState(null);
  const [subMenu, setSubMenu] = useState(null); // 'step' | 'actType' | 'reassign' | null
  const [people, setPeople] = useState([]);
  const [newAuthor, setNewAuthor] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const step = evidenceSteps?.[ev.id]?.step || ev.systematic_step_primary;
  const actType = evidenceActivityTypes?.[ev.id]?.activity_type || ev.activity_type || 'core';

  const closeAll = () => { setCtxMenu(null); setSubMenu(null); setNewAuthor(''); };

  const handleContextMenu = (e) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY });
    setSubMenu(null);
  };

  // Fetch people when reassign sub-menu opens
  useEffect(() => {
    if (subMenu === 'reassign' && people.length === 0 && token) {
      fetch(`/api/projects/${token}/people`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.people) setPeople(d.people); })
        .catch(() => {});
    }
  }, [subMenu, token, people.length]);

  const handleStepSelect = async (newStep) => {
    if (onEvidenceChange) onEvidenceChange(ev.id, 'step', newStep);
    closeAll();
    try {
      await fetch(`/api/evidence/${token}/set-step`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidence_id: ev.id, step: newStep }),
      });
    } catch (err) { console.error('Failed to update step:', err); }
  };

  const handleActivityTypeSelect = async (newType) => {
    if (onEvidenceChange) onEvidenceChange(ev.id, 'activityType', newType);
    closeAll();
    try {
      await fetch(`/api/evidence/${token}/set-activity-type`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidence_id: ev.id, activity_type: newType }),
      });
    } catch (err) { console.error('Failed to update activity type:', err); }
  };

  const handleReassign = async () => {
    if (!newAuthor) return;
    setReassigning(true);
    try {
      const res = await fetch(`/api/evidence/${token}/reassign`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidence_id: ev.id, new_author_email: newAuthor }),
      });
      if (!res.ok) throw new Error('Failed to reassign');
      if (onEvidenceChange) onEvidenceChange(ev.id, 'reassign', newAuthor);
      closeAll();
    } catch (err) {
      console.error('Failed to reassign:', err);
      alert('Failed to reassign evidence');
    } finally { setReassigning(false); }
  };

  const handleDelete = async () => {
    if (onEvidenceChange) onEvidenceChange(ev.id, 'delete');
    closeAll();
    try {
      await fetch(`/api/evidence/${token}/delete`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidence_id: ev.id }),
      });
    } catch (err) { console.error('Failed to delete:', err); }
  };

  const menuBtnStyle = (danger) => ({
    display: 'block', width: '100%', textAlign: 'left',
    padding: '8px 14px', fontSize: 13,
    color: danger ? '#dc2626' : '#374151',
    fontWeight: 400, backgroundColor: 'white',
    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
  });

  return (
    <>
      <div
        onClick={onClick}
        onContextMenu={handleContextMenu}
        style={{
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
        {/* GitHub metadata */}
        {ev.source === 'github' && ev.meta && (
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 11 }}>
            <a href={ev.meta.commit_url} target="_blank" rel="noopener noreferrer" style={{ color: '#6b7280', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: 'ui-monospace, Monaco, monospace' }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
              {ev.meta.sha?.substring(0, 7)}
            </a>
            {ev.meta.files_changed > 0 && <span style={{ color: '#9ca3af' }}>{ev.meta.files_changed} file{ev.meta.files_changed !== 1 ? 's' : ''}</span>}
            {(ev.meta.additions > 0 || ev.meta.deletions > 0) && (
              <span>
                {ev.meta.additions > 0 && <span style={{ color: '#1a7f37' }}>+{ev.meta.additions}</span>}
                {ev.meta.additions > 0 && ev.meta.deletions > 0 && ' '}
                {ev.meta.deletions > 0 && <span style={{ color: '#cf222e' }}>-{ev.meta.deletions}</span>}
              </span>
            )}
          </div>
        )}
        {/* Jira metadata */}
        {ev.meta?.type === 'jira' && (
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 11 }}>
            <a href={ev.meta.jira_url} target="_blank" rel="noopener noreferrer" style={{ color: '#6b7280', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#2684FF"><path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.35V2.84A.84.84 0 0021.16 2H11.53zM6.77 6.8a4.362 4.362 0 004.34 4.34h1.8v1.72a4.362 4.362 0 004.34 4.34V7.63a.84.84 0 00-.83-.83H6.77zM2 11.6a4.362 4.362 0 004.35 4.36h1.78v1.7C8.13 20.06 10.1 22 12.48 22V12.44a.84.84 0 00-.84-.84H2z"/></svg>
              {ev.meta.jira_key}
            </a>
            {ev.meta.issue_type && <span style={{ padding: '1px 5px', fontSize: 10, borderRadius: 3, backgroundColor: '#f3f4f6', color: '#6b7280' }}>{ev.meta.issue_type}</span>}
            {ev.meta.status && <span style={{ padding: '1px 5px', fontSize: 10, borderRadius: 3, backgroundColor: '#dbeafe', color: '#1e40af' }}>{ev.meta.status}</span>}
            {ev.meta.story_points && <span style={{ color: '#9ca3af' }}>{ev.meta.story_points} pts</span>}
          </div>
        )}
      </div>

      {/* Right-click context menu */}
      {ctxMenu && (
        <>
          <div onClick={closeAll} style={{ position: 'fixed', inset: 0, zIndex: 60 }} />
          <div style={{
            position: 'fixed', top: ctxMenu.y, left: ctxMenu.x, zIndex: 70,
            backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)', overflow: 'visible', minWidth: 180,
          }}>
            {/* Link/unlink actions from parent */}
            {contextActions.map((action, i) => (
              <button
                key={i}
                onClick={() => { action.action(); closeAll(); }}
                style={menuBtnStyle(action.danger)}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = action.danger ? '#fef2f2' : '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
              >
                {action.label}
              </button>
            ))}
            {contextActions.length > 0 && <div style={{ borderTop: '1px solid #f0f0f0' }} />}

            {/* Re-classify step */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setSubMenu(subMenu === 'step' ? null : 'step')}
                style={{ ...menuBtnStyle(false), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
              >
                Re-classify step <span style={{ fontSize: 10, color: '#9ca3af' }}>▸</span>
              </button>
              {subMenu === 'step' && (
                <div style={{
                  position: 'absolute', left: '100%', top: 0, zIndex: 80,
                  backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)', overflow: 'hidden', minWidth: 150,
                }}>
                  {STEPS.map(s => (
                    <button key={s} onClick={() => handleStepSelect(s)}
                      style={{ ...menuBtnStyle(false), fontWeight: s === step ? 600 : 400 }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                    >{s}{s === step ? ' ✓' : ''}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Re-classify activity type */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setSubMenu(subMenu === 'actType' ? null : 'actType')}
                style={{ ...menuBtnStyle(false), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
              >
                Change activity type <span style={{ fontSize: 10, color: '#9ca3af' }}>▸</span>
              </button>
              {subMenu === 'actType' && (
                <div style={{
                  position: 'absolute', left: '100%', top: 0, zIndex: 80,
                  backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)', overflow: 'hidden', minWidth: 150,
                }}>
                  {ACT_TYPES.map(t => (
                    <button key={t.value} onClick={() => handleActivityTypeSelect(t.value)}
                      style={{ ...menuBtnStyle(false), fontWeight: t.value === actType ? 600 : 400 }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                    >{t.label}{t.value === actType ? ' ✓' : ''}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Reassign person */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setSubMenu(subMenu === 'reassign' ? null : 'reassign')}
                style={{ ...menuBtnStyle(false), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
              >
                Reassign person <span style={{ fontSize: 10, color: '#9ca3af' }}>▸</span>
              </button>
              {subMenu === 'reassign' && (
                <div style={{
                  position: 'absolute', left: '100%', top: 0, zIndex: 80,
                  backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)', overflow: 'hidden', minWidth: 200, padding: 10,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Reassign to:</div>
                  <select
                    value={newAuthor}
                    onChange={e => setNewAuthor(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', fontSize: 12, borderRadius: 5, border: '1px solid #d1d5db', marginBottom: 8, fontFamily: 'inherit' }}
                  >
                    <option value="">Select person...</option>
                    {people.map(p => (
                      <option key={p.email} value={p.email}>{p.name || p.email}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleReassign}
                    disabled={!newAuthor || reassigning}
                    style={{
                      width: '100%', padding: '6px', fontSize: 12, fontWeight: 600,
                      backgroundColor: newAuthor ? NAVY : '#e5e7eb', color: newAuthor ? 'white' : '#9ca3af',
                      border: 'none', borderRadius: 5, cursor: newAuthor ? 'pointer' : 'default', fontFamily: 'inherit',
                    }}
                  >{reassigning ? 'Reassigning...' : 'Reassign'}</button>
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid #f0f0f0' }} />

            {/* Delete */}
            <button
              onClick={handleDelete}
              style={menuBtnStyle(true)}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
            >
              Delete evidence
            </button>
          </div>
        </>
      )}
    </>
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

/* ── Organic blob loader ── */
function BlobLoader() {
  return (
    <div style={{
      position: 'sticky', top: 0, left: 0, right: 0, height: 0,
      zIndex: 10, display: 'flex', justifyContent: 'center',
    }}>
    <div style={{
      marginTop: 120, width: 80, height: 80,
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    }}>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle className="blob-main" cx="24" cy="24" r="10" fill={NAVY} />
        <circle className="blob-orbit1" cx="24" cy="8" r="4" fill={NAVY} opacity="0.5" />
        <circle className="blob-orbit2" cx="24" cy="40" r="3" fill={NAVY} opacity="0.3" />
      </svg>
      <style>{`
        .blob-main {
          animation: blob-pulse 1.4s ease-in-out infinite;
          transform-origin: center;
        }
        .blob-orbit1 {
          animation: blob-orbit 1.4s ease-in-out infinite;
          transform-origin: 24px 24px;
        }
        .blob-orbit2 {
          animation: blob-orbit 1.4s ease-in-out infinite 0.7s;
          transform-origin: 24px 24px;
        }
        @keyframes blob-pulse {
          0%, 100% { r: 10; }
          50% { r: 13; }
        }
        @keyframes blob-orbit {
          0%, 100% { transform: rotate(0deg) scale(1); opacity: 0.5; }
          50% { transform: rotate(180deg) scale(0.6); opacity: 0.2; }
        }
      `}</style>
    </div>
    </div>
  );
}

/* ── Per-activity narrative panel ── */
function ActivityNarrativePanel({ activity, projectId, token, sections, saveStatus, onSaveStatus, onGenerated }) {
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);
  const isAI = activity.source === 'ai';

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
    <div style={{ padding: '28px 36px 36px', position: 'relative', minHeight: '100%' }}>
      {generating && <BlobLoader />}

      {/* Activity header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4, gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
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
          {activity.uncertainty && (
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
              {activity.uncertainty}
            </p>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{
            padding: '7px 16px', fontSize: 13, fontWeight: 600,
            color: 'white', backgroundColor: generating ? '#9ca3af' : NAVY,
            border: 'none', borderRadius: 8,
            cursor: generating ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            flexShrink: 0, whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: 15 }}>&#10022;</span> {hasContent ? 'Regenerate with AI' : 'Generate with AI'}
        </button>
      </div>

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

/* ── Attestations & Sign-offs Panel ── */
const SIGN_OFF_ROLES = [
  { key: 'technical_lead', title: 'Technical Lead / CTO', description: 'I confirm that the activities described in this claim pack constitute genuine R&D involving technical uncertainty that could not be resolved by a competent professional using existing knowledge.' },
  { key: 'cfo', title: 'CFO / Finance', description: 'I confirm that the expenditure figures in this claim pack are accurate, the apportionment methodology has been applied consistently, and costs are substantiated by underlying records.' },
  { key: 'ceo', title: 'CEO / Managing Director', description: 'I confirm that this claim pack is complete and accurate to the best of my knowledge, and that the company is entitled to claim the R&D Tax Incentive for the activities and expenditure described.' },
];

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

  // Re-sync from sections prop when it changes (e.g. after fetchSections)
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
      console.log('[Attestations] Saving to:', `/api/claim-pack-sections/${projectId}/${sectionKey}`, 'data length:', JSON.stringify(data).length);
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

  // Dynamic import of SignatureCanvas (it uses <canvas> which is client-only)
  const [SignatureCanvas, setSignatureCanvas] = useState(null);
  useEffect(() => {
    import('react-signature-canvas').then(mod => setSignatureCanvas(() => mod.default));
  }, []);

  const signedCount = SIGN_OFF_ROLES.filter(r => signatures[r.key]?.signature).length;

  return (
    <div style={{ padding: '28px 36px 36px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>
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
            {/* Header */}
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

            {/* Body */}
            <div style={{ padding: '16px 20px' }}>
              <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, margin: '0 0 16px' }}>
                {role.description}
              </p>

              {isSigned ? (
                /* Signed state — show signature image */
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
                /* Unsigned state — show canvas + name input */
                <div>
                  {/* Name input */}
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

                  {/* Signature canvas */}
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

                  {/* Actions */}
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

/* ── Add Evidence Modal ── */
function AddEvidenceModal({ token, activities = [], onCreated, onClose }) {
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [linkedActivityId, setLinkedActivityId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!content.trim() && !file) return;
    setSaving(true); setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = { Authorization: `Bearer ${session.access_token}` };

      if (file) {
        // File upload
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`/api/evidence/${token}/upload`, { method: 'POST', headers, body: formData });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Upload failed'); }
      }

      let createdEvidenceId = null;

      if (content.trim()) {
        // Text note
        const res = await fetch(`/api/evidence/${token}/add`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: content.trim() }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to add'); }
        const data = await res.json();
        createdEvidenceId = data.id;
        // Trigger AI classification (fire-and-forget)
        fetch(`/api/classify?id=${data.id}`, { method: 'POST', headers }).catch(() => {});
        fetch(`/api/evidence/classify-activity-type?id=${data.id}`, { method: 'POST', headers }).catch(() => {});
      }

      // Link to activity if one was selected
      if (linkedActivityId && createdEvidenceId) {
        await fetch(`/api/evidence/${token}/link`, {
          method: 'PATCH',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ evidence_id: createdEvidenceId, activity_id: linkedActivityId }),
        });
      }

      onCreated();
      onClose();
    } catch (err) { setError(err.message); }
    setSaving(false);
  };

  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf', 'text/csv', 'text/plain', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_FILE_SIZE) { setError('File must be under 10MB'); return; }
    if (!ALLOWED_TYPES.includes(f.type)) { setError('Unsupported file type'); return; }
    setFile(f);
    setError('');
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: 12, width: 480, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>Add evidence</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 18, color: '#9ca3af', cursor: 'pointer', padding: '0 4px' }}>×</button>
        </div>
        <div style={{ padding: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Note</label>
          <textarea
            value={content} onChange={e => setContent(e.target.value)}
            placeholder="What did you work on? Describe your experiment, observation, or finding..."
            rows={4} autoFocus
            style={{ width: '100%', padding: '10px 12px', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 }}
            onFocus={e => e.target.style.borderColor = NAVY} onBlur={e => e.target.style.borderColor = '#e5e7eb'}
          />

          <div style={{ marginTop: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Attach file <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span>
            </label>
            {file ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                <span style={{ fontSize: 13, color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>{(file.size / 1024).toFixed(0)} KB</span>
                <button onClick={() => setFile(null)} style={{ border: 'none', background: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 14 }}>×</button>
              </div>
            ) : (
              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '16px', border: '1px dashed #d1d5db', borderRadius: 8,
                cursor: 'pointer', color: '#9ca3af', fontSize: 13,
              }}>
                <input type="file" onChange={handleFileChange} style={{ display: 'none' }} accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.csv,.txt,.xls,.xlsx" />
                Drop a file or click to upload
              </label>
            )}
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>PNG, JPEG, PDF, CSV, TXT, XLS — max 10MB</div>
          </div>

          {activities.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Link to activity <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span>
              </label>
              <select
                value={linkedActivityId}
                onChange={e => setLinkedActivityId(e.target.value)}
                style={{
                  width: '100%', padding: '9px 12px', fontSize: 13, border: '1px solid #e5e7eb',
                  borderRadius: 8, outline: 'none', fontFamily: 'inherit', backgroundColor: 'white',
                  color: linkedActivityId ? '#111827' : '#9ca3af', cursor: 'pointer', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = NAVY}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              >
                <option value="">None — AI will suggest</option>
                {activities.map(act => (
                  <option key={act.id} value={act.id}>{act.name}</option>
                ))}
              </select>
            </div>
          )}

          {error && <div style={{ fontSize: 12, color: '#dc2626', marginTop: 8 }}>{error}</div>}

          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 12, padding: '8px 10px', backgroundColor: '#f9fafb', borderRadius: 6 }}>
            {linkedActivityId
              ? 'Evidence will be linked to the selected activity.'
              : 'AI will automatically classify this evidence into the R&D systematic progression and suggest which activity it belongs to.'}
          </div>
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '7px 14px', fontSize: 13, fontWeight: 500, color: '#6b7280', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving || (!content.trim() && !file)} style={{ padding: '7px 16px', fontSize: 13, fontWeight: 600, color: 'white', backgroundColor: saving || (!content.trim() && !file) ? '#a5b4fc' : NAVY, border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {saving ? 'Adding...' : 'Add evidence'}
          </button>
        </div>
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
  project = {},
  onActivitiesChange,
}) {
  const [activeTab, setActiveTab] = useState('project_overview');
  const [sections, setSections] = useState({});
  const [projectId, setProjectId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('');
  const [selectedEvidenceId, setSelectedEvidenceId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null); // null | 'activities' | 'more'
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const [showAllEvidence, setShowAllEvidence] = useState(false);
  const [activityEvidence, setActivityEvidence] = useState({});
  const [actCtxMenu, setActCtxMenu] = useState(null); // { x, y, activity }
  const [showAddMenu, setShowAddMenu] = useState(false); // false | { x, y }
  const [panelWidth, setPanelWidth] = useState(340);
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef(null);

  const handleDragStart = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    const startX = e.clientX;
    const startWidth = panelWidth;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    const onMove = (e) => {
      const newWidth = Math.min(600, Math.max(200, startWidth + e.clientX - startX));
      setPanelWidth(newWidth);
    };
    const onUp = () => {
      setIsDragging(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [panelWidth]);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const activitiesBtnRef = useRef(null);
  const moreBtnRef = useRef(null);
  const addBtnRef = useRef(null);

  const toggleDropdown = (which) => {
    if (openDropdown === which) { setOpenDropdown(null); return; }
    const ref = which === 'activities' ? activitiesBtnRef : moreBtnRef;
    const rect = ref.current?.getBoundingClientRect();
    if (rect) {
      setDropdownPos({
        top: rect.bottom + 4,
        left: which === 'more' ? undefined : rect.left,
        right: which === 'more' ? (window.innerWidth - rect.right) : undefined,
      });
    }
    setOpenDropdown(which);
  };

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

  // Determine if current tab is an activity
  const activeActivity = activities.find(a => `activity_${a.id}` === activeTab);
  const isActivityTab = !!activeActivity;

  // Fetch activity evidence when switching to activity tab
  useEffect(() => {
    if (activeActivity) fetchActivityEvidence(activeActivity.id);
  }, [activeActivity, fetchActivityEvidence]);


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

  const handleEvidenceChange = useCallback((evidenceId, changeType, value) => {
    if (changeType === 'delete') {
      window.location.reload();
    } else if (changeType === 'step' || changeType === 'activityType' || changeType === 'reassign') {
      window.location.reload();
    }
  }, []);

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
      {/* ── Left panel ── */}
      <div style={{
        width: panelWidth, flexShrink: 0,
        display: 'flex', flexDirection: 'column', backgroundColor: 'white',
      }}>
        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
          {/* Title row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isActivityTab ? 8 : 0 }}>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>
                {isActivityTab ? 'Evidence' : 'Activities & Evidence'}
              </h2>
              {isActivityTab && !showAllEvidence && (
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeActivity.name} · {filteredEvidence.length} items
                </div>
              )}
              {isActivityTab && showAllEvidence && (
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                  All evidence · {filteredEvidence.length} items
                </div>
              )}
            </div>
            <button
              ref={addBtnRef}
              onClick={() => {
                const rect = addBtnRef.current?.getBoundingClientRect();
                setShowAddMenu(prev => prev ? false : { top: rect?.bottom + 4, left: rect?.left });
              }}
              style={{
                padding: '4px 10px', fontSize: 12, fontWeight: 500,
                color: '#374151', backgroundColor: 'white',
                border: '1px solid #e5e7eb', borderRadius: 5,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', gap: 4,
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 13, lineHeight: 1 }}>+</span> Add
            </button>
          </div>
          {/* Action links */}
          {isActivityTab && (
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowAllEvidence(prev => !prev)}
                style={{
                  fontSize: 12, color: NAVY, background: 'none', border: 'none',
                  cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontWeight: 500,
                }}
              >
                {showAllEvidence ? 'Show linked only' : 'Link more evidence'}
              </button>
            </div>
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
                    onContextMenu={e => { e.preventDefault(); setActCtxMenu({ x: e.clientX, y: e.clientY, activity: act }); }}
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
                      <span style={{
                        padding: '1px 5px', fontSize: 10, fontWeight: 600, borderRadius: 3, flexShrink: 0,
                        backgroundColor: (act.activity_type || 'core') === 'core' ? NAVY : '#6b7280',
                        color: 'white',
                      }}>
                        {(act.activity_type || 'core') === 'core' ? 'Core' : 'Supporting'}
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
            filteredEvidence.map(ev => {
              // Build context menu actions
              const contextActions = [];
              if (isActivityTab && activeActivity) {
                const linkedIds = new Set((activityEvidence[activeActivity.id] || []).map(e => e.id));
                const isLinked = linkedIds.has(ev.id);
                if (isLinked) {
                  contextActions.push({
                    label: `Unlink from ${activeActivity.name}`,
                    danger: true,
                    action: () => handleUnlinkEvidence(ev.id, activeActivity.id),
                  });
                } else {
                  contextActions.push({
                    label: `Link to ${activeActivity.name}`,
                    action: () => handleLinkEvidence(ev.id, activeActivity.id),
                  });
                }
              } else if (!isActivityTab && activities.length > 0) {
                // On overview: offer to link to any activity
                activities.forEach(act => {
                  contextActions.push({
                    label: `Link to ${act.name}`,
                    action: () => handleLinkEvidence(ev.id, act.id),
                  });
                });
              }
              return (
                <EvidenceRow
                  key={ev.id}
                  ev={ev}
                  evidenceSteps={evidenceSteps}
                  evidenceActivityTypes={evidenceActivityTypes}
                  selected={selectedEvidenceId === ev.id}
                  onClick={() => setSelectedEvidenceId(ev.id)}
                  contextActions={contextActions}
                  token={token}
                  onEvidenceChange={handleEvidenceChange}
                />
              );
            })
          ) : (
            <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              {isActivityTab ? 'No evidence linked to this activity yet' : 'No evidence yet'}
            </div>
          )}
        </div>
      </div>

      {/* Drag handle */}
      <div
        onMouseDown={handleDragStart}
        style={{
          width: 4, flexShrink: 0, cursor: 'col-resize',
          backgroundColor: isDragging ? '#d1d5db' : 'transparent',
          borderLeft: '1px solid #e5e5e5',
          transition: isDragging ? 'none' : 'background-color 0.15s',
        }}
        onMouseEnter={e => { if (!isDragging) e.currentTarget.style.backgroundColor = '#e5e7eb'; }}
        onMouseLeave={e => { if (!isDragging) e.currentTarget.style.backgroundColor = 'transparent'; }}
      />

      {/* ── Right panel: Narrative ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, backgroundColor: 'white' }}>
        {/* Tab bar */}
        <div style={{
          display: 'flex', alignItems: 'center', borderBottom: '1px solid #f0f0f0',
          padding: '0 12px', flexShrink: 0, gap: 0,
          overflowX: 'auto', scrollbarWidth: 'none',
        }}>
          {/* Overview tab */}
          <button
            onClick={() => { setActiveTab('project_overview'); setShowAllEvidence(false); }}
            style={{
              padding: '10px 12px', fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0,
              fontWeight: activeTab === 'project_overview' ? 600 : 400,
              color: activeTab === 'project_overview' ? '#111827' : '#9ca3af',
              backgroundColor: 'transparent', border: 'none',
              borderBottom: `2px solid ${activeTab === 'project_overview' ? '#111827' : 'transparent'}`,
              cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1,
            }}
          >
            Overview
          </button>

          {/* Activity selector dropdown */}
          <button
            ref={activitiesBtnRef}
            onClick={() => toggleDropdown('activities')}
            style={{
              padding: '10px 14px', fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0,
              fontWeight: isActivityTab ? 600 : 400,
              color: isActivityTab ? '#111827' : '#9ca3af',
              backgroundColor: 'transparent', border: 'none',
              borderBottom: `2px solid ${isActivityTab ? '#111827' : 'transparent'}`,
              cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            {isActivityTab
              ? `Activity ${activities.indexOf(activeActivity) + 1}`
              : 'Activities'}
            <span style={{ fontSize: 10, opacity: 0.6 }}>▾</span>
          </button>

          {/* Financials + R&D Boundary */}
          {SUFFIX_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setShowAllEvidence(false); }}
              style={{
                padding: '10px 12px', fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0,
                fontWeight: activeTab === tab.key ? 600 : 400,
                color: activeTab === tab.key ? '#111827' : '#9ca3af',
                backgroundColor: 'transparent', border: 'none',
                borderBottom: `2px solid ${activeTab === tab.key ? '#111827' : 'transparent'}`,
                cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1,
              }}
            >
              {tab.label}
            </button>
          ))}

          {/* More dropdown */}
          <button
            ref={moreBtnRef}
            onClick={() => toggleDropdown('more')}
            style={{
              padding: '10px 14px', fontSize: 13, fontWeight: 400, color: '#9ca3af',
              backgroundColor: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4,
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            More <span style={{ fontSize: 10, opacity: 0.6 }}>▾</span>
          </button>

          {/* Export PDF */}
          <button
            onClick={() => window.print()}
            style={{
              padding: '10px 14px', fontSize: 13, fontWeight: 500, color: '#9ca3af',
              backgroundColor: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
              marginLeft: 'auto',
            }}
          >
            Export PDF
          </button>
        </div>

        {/* Dropdown menus — rendered outside tab bar to avoid overflow clipping */}
        {openDropdown && (
          <>
            {/* Backdrop to close */}
            <div onClick={() => setOpenDropdown(null)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />

            {/* Activities dropdown */}
            {openDropdown === 'activities' && (
              <div style={{
                position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, zIndex: 100,
                backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 8,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden',
                width: 280, maxWidth: 'calc(100vw - 40px)',
                maxHeight: 360, overflowY: 'auto',
              }}>
                {activities.map((act, i) => (
                  <button
                    key={act.id}
                    onClick={() => { setActiveTab(`activity_${act.id}`); setOpenDropdown(null); setShowAllEvidence(false); }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '10px 16px', fontSize: 13,
                      color: activeTab === `activity_${act.id}` ? '#111827' : '#374151',
                      fontWeight: activeTab === `activity_${act.id}` ? 600 : 400,
                      backgroundColor: activeTab === `activity_${act.id}` ? '#f3f4f6' : 'white',
                      border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={e => { if (activeTab !== `activity_${act.id}`) e.currentTarget.style.backgroundColor = 'white'; }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>Activity {i + 1}: {act.name}</div>
                    {act.uncertainty && (
                      <div style={{ fontSize: 11, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {act.uncertainty}
                      </div>
                    )}
                  </button>
                ))}
                <div style={{ borderTop: '1px solid #f0f0f0' }}>
                  <button
                    onClick={() => { setShowCreateModal(true); setOpenDropdown(null); }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '10px 16px', fontSize: 13, color: NAVY, fontWeight: 600,
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

            {/* More dropdown */}
            {openDropdown === 'more' && (
              <div style={{
                position: 'fixed', top: dropdownPos.top, right: dropdownPos.right, zIndex: 100,
                backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 8,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden', minWidth: 200,
              }}>
                {MORE_TABS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => { setActiveTab(tab.key); setOpenDropdown(null); }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '10px 16px', fontSize: 13,
                      color: activeTab === tab.key ? '#111827' : '#6b7280',
                      fontWeight: activeTab === tab.key ? 600 : 400,
                      backgroundColor: activeTab === tab.key ? '#f3f4f6' : 'white',
                      border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={e => { if (activeTab !== tab.key) e.currentTarget.style.backgroundColor = 'white'; }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

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
          ) : activeTab === 'financials' ? (
            <FinancialsPage token={token} activities={activities} />
          ) : activeTab === 'attestations' ? (
            <AttestationsPanel
              projectId={projectId}
              sections={sections}
              token={token}
              onSaved={fetchSections}
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

      {/* Activity right-click context menu */}
      {actCtxMenu && (
        <>
          <div onClick={() => setActCtxMenu(null)} style={{ position: 'fixed', inset: 0, zIndex: 60 }} />
          <div style={{
            position: 'fixed', top: actCtxMenu.y, left: actCtxMenu.x, zIndex: 70,
            backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)', overflow: 'visible', minWidth: 180,
          }}>
            <button
              onClick={() => { setActiveTab(`activity_${actCtxMenu.activity.id}`); setShowAllEvidence(false); setActCtxMenu(null); }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 13, color: '#374151', fontWeight: 400, backgroundColor: 'white', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
            >
              Open narrative
            </button>
            <button
              onClick={async () => {
                const act = actCtxMenu.activity;
                setActCtxMenu(null);
                try {
                  const { data: { session } } = await supabase.auth.getSession();
                  await fetch(`/api/projects/${token}/core-activities/${act.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                    body: JSON.stringify({ status: act.status === 'adopted' ? 'draft' : 'adopted' }),
                  });
                  if (onActivitiesChange) {
                    onActivitiesChange(activities.map(a => a.id === act.id ? { ...a, status: act.status === 'adopted' ? 'draft' : 'adopted' } : a));
                  }
                } catch (err) { console.error('Status change failed:', err); }
              }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 13, color: '#374151', fontWeight: 400, backgroundColor: 'white', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
            >
              {actCtxMenu.activity.status === 'adopted' ? 'Revert to draft' : 'Adopt activity'}
            </button>
            {/* Activity type sub-menu */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setActCtxMenu(prev => ({ ...prev, showTypePicker: !prev.showTypePicker }))}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 13, color: '#374151', fontWeight: 400, backgroundColor: 'white', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
              >
                {(actCtxMenu.activity.activity_type || 'core') === 'core' ? 'Core R&D' : 'Supporting R&D'} <span style={{ fontSize: 10, color: '#9ca3af' }}>▸</span>
              </button>
              {actCtxMenu.showTypePicker && (
                <div style={{
                  position: 'absolute', left: '100%', top: 0, zIndex: 80,
                  backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)', overflow: 'hidden', minWidth: 150,
                }}>
                  {ACT_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={async () => {
                        const act = actCtxMenu.activity;
                        setActCtxMenu(null);
                        try {
                          const { data: { session } } = await supabase.auth.getSession();
                          await fetch(`/api/projects/${token}/core-activities/${act.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                            body: JSON.stringify({ activity_type: t.value }),
                          });
                          if (onActivitiesChange) {
                            onActivitiesChange(activities.map(a => a.id === act.id ? { ...a, activity_type: t.value } : a));
                          }
                        } catch (err) { console.error('Activity type change failed:', err); }
                      }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 13,
                        color: '#374151', fontWeight: t.value === (actCtxMenu.activity.activity_type || 'core') ? 600 : 400,
                        backgroundColor: 'white', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                    >
                      {t.label}{t.value === (actCtxMenu.activity.activity_type || 'core') ? ' ✓' : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ borderTop: '1px solid #f0f0f0' }} />
            <button
              onClick={async () => {
                const act = actCtxMenu.activity;
                setActCtxMenu(null);
                if (!confirm(`Delete "${act.name}"? This cannot be undone.`)) return;
                try {
                  const { data: { session } } = await supabase.auth.getSession();
                  await fetch(`/api/projects/${token}/core-activities/${act.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                    body: JSON.stringify({ status: 'archived' }),
                  });
                  if (onActivitiesChange) {
                    onActivitiesChange(activities.filter(a => a.id !== act.id));
                  }
                  if (activeTab === `activity_${act.id}`) setActiveTab('project_overview');
                } catch (err) { console.error('Archive failed:', err); }
              }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 13, color: '#dc2626', fontWeight: 400, backgroundColor: 'white', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
            >
              Archive activity
            </button>
          </div>
        </>
      )}

      {/* Add menu dropdown */}
      {showAddMenu && (
        <>
          <div onClick={() => setShowAddMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 60 }} />
          <div style={{
            position: 'fixed', top: showAddMenu.top, left: showAddMenu.left, zIndex: 70,
            backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)', overflow: 'hidden', minWidth: 160,
          }}>
            <button
              onClick={() => { setShowCreateModal(true); setShowAddMenu(false); }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 13, color: '#374151', backgroundColor: 'white', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
            >
              Activity
            </button>
            <button
              onClick={() => { setShowEvidenceModal(true); setShowAddMenu(false); }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 13, color: '#374151', backgroundColor: 'white', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
            >
              Evidence
            </button>
            <button
              onClick={() => { setShowAddMenu(false); window.location.href = `/p/${token}/upload`; }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 13, color: '#374151', backgroundColor: 'white', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
            >
              Upload file
            </button>
          </div>
        </>
      )}

      {/* Add evidence modal */}
      {showEvidenceModal && (
        <AddEvidenceModal
          token={token}
          activities={activities}
          onCreated={() => { window.location.reload(); }}
          onClose={() => setShowEvidenceModal(false)}
        />
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
            <div dangerouslySetInnerHTML={{ __html: sections.project_overview.content }} />
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
            {ACTIVITY_STEPS.map(({ key, label }) => {
              const content = sections[`activity_${act.id}_${key}`]?.content;
              if (!content || content.replace(/<[^>]*>/g, '').trim().length < 5) return null;
              return (
                <div key={key} style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#374151', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#9ca3af' }}>—</span> {label}
                  </h3>
                  <div dangerouslySetInnerHTML={{ __html: content }} />
                </div>
              );
            })}
          </div>
        ))}

        {/* Financials */}
        {sections.financials?.content && (
          <div className="print-section" style={{ pageBreakBefore: 'always' }}>
            <h2 className="print-section-title">Financials & Notional Deductions</h2>
            <div dangerouslySetInnerHTML={{ __html: sections.financials.content }} />
          </div>
        )}

        {/* R&D Boundary */}
        {sections.rd_boundary?.content && (
          <div className="print-section">
            <h2 className="print-section-title">R&D vs Non-R&D Boundary</h2>
            <div dangerouslySetInnerHTML={{ __html: sections.rd_boundary.content }} />
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
