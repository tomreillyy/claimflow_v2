'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { SECTION_KEYS, SECTION_NAMES } from '@/lib/claimFlowMasterContext';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { marked } from 'marked';

const NAVY = '#021048';
const STAGES = ['Hypothesis', 'Experiment', 'Observation', 'Evaluation', 'Conclusion'];

const SOURCE_ICONS = {
  manual: 'M', note: 'M', email: '@', github: 'G',
  document: 'D', upload: 'U', jira: 'J',
};

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

function StageDots({ coverage }) {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {STAGES.map(s => {
        const count = (coverage[s] || []).length;
        return (
          <span key={s} title={`${s}: ${count} item${count !== 1 ? 's' : ''}`} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: count > 0 ? '#16a34a' : '#d1d5db',
            flexShrink: 0,
          }} />
        );
      })}
    </div>
  );
}

/* ── Pill filter button ── */
function PillButton({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 12px',
        fontSize: 12,
        fontWeight: 500,
        color: active ? 'white' : '#6b7280',
        backgroundColor: active ? NAVY : 'transparent',
        border: `1px solid ${active ? NAVY : '#e5e7eb'}`,
        borderRadius: 6,
        cursor: 'pointer',
        transition: 'all 0.15s',
        fontFamily: 'inherit',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
      }}
    >
      {label}
      {count != null && (
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          opacity: active ? 0.8 : 0.6,
        }}>
          {count}
        </span>
      )}
    </button>
  );
}

/* ── Evidence row (compact) ── */
function EvidenceRow({ ev, evidenceSteps, evidenceActivityTypes, selected, onClick }) {
  const step = evidenceSteps[ev.id]?.step || ev.systematic_step_primary;
  const actType = evidenceActivityTypes[ev.id]?.activity_type || ev.activity_type || 'core';

  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 16px',
        borderBottom: '1px solid #f0f0f0',
        cursor: 'pointer',
        backgroundColor: selected ? '#f0f4ff' : 'white',
        transition: 'background-color 0.12s',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.backgroundColor = '#fafbfc'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.backgroundColor = 'white'; }}
    >
      {/* Meta row */}
      <div style={{
        fontSize: 12, color: '#9ca3af', marginBottom: 5,
        display: 'flex', alignItems: 'center', gap: 6,
        fontFamily: 'ui-monospace, Monaco, monospace',
      }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 18, height: 18, borderRadius: 3,
          backgroundColor: '#f3f4f6', fontSize: 10, fontWeight: 700,
          color: '#6b7280', flexShrink: 0,
        }}>
          {SOURCE_ICONS[ev.source] || 'M'}
        </span>
        <span style={{ color: '#6b7280', fontWeight: 500 }}>
          {relativeTime(ev.created_at)}
        </span>
        {step && step !== 'Unknown' && (
          <>
            <span style={{ color: '#d1d5db' }}>·</span>
            <span style={{ color: '#374151', fontWeight: 600, fontSize: 11 }}>{step}</span>
          </>
        )}
        {actType && (
          <>
            <span style={{ color: '#d1d5db' }}>·</span>
            <span style={{
              padding: '1px 5px', fontSize: 10, fontWeight: 600, borderRadius: 3,
              backgroundColor: actType === 'core' ? NAVY : '#6b7280', color: 'white',
            }}>
              {actType === 'core' ? 'Core' : 'Supporting'}
            </span>
          </>
        )}
      </div>

      {/* Content */}
      {ev.content && (
        <p style={{
          fontSize: 13, color: '#1a1a1a', lineHeight: 1.5, margin: 0,
          overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {ev.content}
        </p>
      )}

      {/* Author + timestamp */}
      {ev.author_email && (
        <div style={{ fontSize: 11, color: '#c0c5ce', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{ev.author_email}</span>
          <span style={{ color: '#e5e7eb' }}>·</span>
          <span>{new Date(ev.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      )}
    </div>
  );
}

/* ── Activity accordion row ── */
function ActivityRow({ activity, token, expanded, onToggle, onSelect }) {
  const [coverage, setCoverage] = useState({});
  const [loading, setLoading] = useState(false);
  const [evidence, setEvidence] = useState([]);

  const isAI = activity.source === 'ai';

  const fetchEvidence = useCallback(async () => {
    if (evidence.length > 0) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/projects/${token}/core-activities/${activity.id}/evidence`, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setCoverage(data.steps || {});
        const all = [];
        Object.entries(data.steps || {}).forEach(([step, items]) => {
          items.forEach(item => {
            if (!all.find(e => e.id === item.id)) {
              all.push({ ...item, _step: step });
            }
          });
        });
        setEvidence(all);
      }
    } catch (err) {
      console.error('Failed to fetch activity evidence:', err);
    }
    setLoading(false);
  }, [token, activity.id, evidence.length]);

  useEffect(() => {
    if (expanded && evidence.length === 0) fetchEvidence();
  }, [expanded, fetchEvidence]);

  const totalEvidence = evidence.length;

  return (
    <div style={{ borderBottom: '1px solid #f0f0f0' }}>
      {/* Activity header */}
      <div
        onClick={onToggle}
        style={{
          padding: '12px 16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          transition: 'background-color 0.12s',
        }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fafbfc'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
      >
        {/* Chevron */}
        <span style={{
          fontSize: 11, color: '#9ca3af', marginTop: 2, flexShrink: 0,
          transition: 'transform 0.15s',
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          display: 'inline-block', width: 14, textAlign: 'center',
        }}>
          ›
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name + badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 13, fontWeight: 600, color: '#111827',
              ...(expanded ? {} : { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }),
            }}>
              {activity.name}
            </span>

            {/* AI / Manual badge */}
            <span style={{
              padding: '1px 6px', fontSize: 10, fontWeight: 600, borderRadius: 3,
              backgroundColor: isAI ? '#ede9fe' : '#ecfdf5',
              color: isAI ? '#7c3aed' : '#059669',
              flexShrink: 0,
            }}>
              {isAI ? 'AI' : 'Manual'}
            </span>

            {/* Status */}
            <span style={{
              padding: '1px 6px', fontSize: 10, fontWeight: 500, borderRadius: 3,
              backgroundColor: activity.status === 'adopted' ? '#dcfce7' : '#fef9c3',
              color: activity.status === 'adopted' ? '#166534' : '#854d0e',
              flexShrink: 0,
            }}>
              {activity.status === 'adopted' ? 'Adopted' : 'Draft'}
            </span>
          </div>

          {/* Uncertainty preview — full when expanded, truncated when collapsed */}
          {activity.uncertainty && (
            <p style={{
              fontSize: 12, color: '#6b7280', margin: 0, lineHeight: 1.5,
              ...(expanded
                ? {}
                : { overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }
              ),
            }}>
              {activity.uncertainty}
            </p>
          )}

          {/* Bottom meta */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginTop: 6,
            fontSize: 11, color: '#9ca3af',
          }}>
            <StageDots coverage={coverage} />
            <span>{totalEvidence} evidence item{totalEvidence !== 1 ? 's' : ''}</span>
            <span style={{ color: '#e5e7eb' }}>·</span>
            <span>{relativeTime(activity.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Expanded: full details + evidence */}
      {expanded && (
        <div style={{
          backgroundColor: '#f8f9fd',
          borderTop: '1px solid #e8eaf2',
          borderLeft: `3px solid ${NAVY}15`,
          marginLeft: 14,
        }}>
          {/* Full activity details */}
          {(activity.hypothesis_text || activity.conclusion_text) && (
            <div style={{ padding: '12px 16px 8px 28px' }}>
              {activity.hypothesis_text && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
                    Hypothesis
                  </div>
                  <p style={{ fontSize: 12, color: '#374151', margin: 0, lineHeight: 1.5 }}>
                    {activity.hypothesis_text}
                  </p>
                </div>
              )}
              {activity.conclusion_text && (
                <div style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
                    Expected outcome
                  </div>
                  <p style={{ fontSize: 12, color: '#374151', margin: 0, lineHeight: 1.5 }}>
                    {activity.conclusion_text}
                  </p>
                </div>
              )}
              <div style={{ borderBottom: '1px solid #eceef5', marginTop: 8 }} />
            </div>
          )}

          {/* Evidence list */}
          {loading ? (
            <div style={{ padding: '16px 28px', fontSize: 12, color: '#9ca3af' }}>
              Loading evidence...
            </div>
          ) : evidence.length > 0 ? (
            evidence.map(ev => (
              <div
                key={ev.id}
                onClick={() => onSelect(ev.id)}
                style={{
                  padding: '8px 16px 8px 28px',
                  borderBottom: '1px solid #eceef5',
                  cursor: 'pointer',
                  transition: 'background-color 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#eef0f9'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 11, color: '#9ca3af', marginBottom: 3,
                  fontFamily: 'ui-monospace, Monaco, monospace',
                }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 16, height: 16, borderRadius: 3,
                    backgroundColor: '#e5e7eb', fontSize: 9, fontWeight: 700,
                    color: '#6b7280', flexShrink: 0,
                  }}>
                    {SOURCE_ICONS[ev.source] || 'M'}
                  </span>
                  <span style={{ fontWeight: 500, color: '#6b7280' }}>
                    {relativeTime(ev.created_at)}
                  </span>
                  {ev._step && (
                    <>
                      <span style={{ color: '#d1d5db' }}>·</span>
                      <span style={{ color: '#374151', fontWeight: 600 }}>{ev._step}</span>
                    </>
                  )}
                  {ev.author_email && (
                    <>
                      <span style={{ color: '#d1d5db' }}>·</span>
                      <span>{ev.author_email}</span>
                    </>
                  )}
                </div>
                {ev.content && (
                  <p style={{
                    fontSize: 12, color: '#374151', margin: 0, lineHeight: 1.4,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    {ev.content}
                  </p>
                )}
              </div>
            ))
          ) : (
            <div style={{ padding: '12px 28px', fontSize: 12, color: '#9ca3af' }}>
              No evidence linked yet
            </div>
          )}
        </div>
      )}
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
    setSaving(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/projects/${token}/core-activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name: name.trim(), uncertainty: uncertainty.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to create');
      }
      const activity = await res.json();
      onCreated(activity);
      onClose();
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: 'white', borderRadius: 12,
          width: 460, maxWidth: '90vw',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #f0f0f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>
            New activity
          </h3>
          <button
            onClick={onClose}
            style={{
              border: 'none', background: 'none', fontSize: 18,
              color: '#9ca3af', cursor: 'pointer', padding: '0 4px',
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Activity name
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Isolation Forest Thresholding"
            maxLength={60}
            style={{
              width: '100%', padding: '8px 12px', fontSize: 13,
              border: '1px solid #e5e7eb', borderRadius: 8,
              outline: 'none', fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
            onFocus={e => e.target.style.borderColor = NAVY}
            onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            autoFocus
          />
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, textAlign: 'right' }}>
            {name.length}/60
          </div>

          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, marginTop: 12 }}>
            Technical uncertainty
          </label>
          <textarea
            value={uncertainty}
            onChange={e => setUncertainty(e.target.value)}
            placeholder="What technical unknown are you investigating? What can't be determined in advance?"
            maxLength={800}
            rows={3}
            style={{
              width: '100%', padding: '8px 12px', fontSize: 13,
              border: '1px solid #e5e7eb', borderRadius: 8,
              outline: 'none', fontFamily: 'inherit', resize: 'vertical',
              boxSizing: 'border-box', lineHeight: 1.5,
            }}
            onFocus={e => e.target.style.borderColor = NAVY}
            onBlur={e => e.target.style.borderColor = '#e5e7eb'}
          />
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, textAlign: 'right' }}>
            {uncertainty.length}/800
          </div>

          {error && (
            <div style={{ fontSize: 12, color: '#dc2626', marginTop: 8 }}>{error}</div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid #f0f0f0',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '7px 14px', fontSize: 13, fontWeight: 500,
              color: '#6b7280', backgroundColor: 'white',
              border: '1px solid #e5e7eb', borderRadius: 8,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !name.trim() || !uncertainty.trim()}
            style={{
              padding: '7px 16px', fontSize: 13, fontWeight: 600,
              color: 'white',
              backgroundColor: saving || !name.trim() || !uncertainty.trim() ? '#a5b4fc' : NAVY,
              border: 'none', borderRadius: 8,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {saving ? 'Creating...' : 'Create activity'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Claim Pack Panel (right side) ── */

const SECTIONS_ORDER = [
  SECTION_KEYS.PROJECT_OVERVIEW,
  SECTION_KEYS.CORE_ACTIVITIES,
  SECTION_KEYS.SUPPORTING_ACTIVITIES,
  SECTION_KEYS.EVIDENCE_INDEX,
  SECTION_KEYS.FINANCIALS,
  SECTION_KEYS.RD_BOUNDARY,
  SECTION_KEYS.OVERSEAS_CONTRACTED,
  SECTION_KEYS.REGISTRATION_TIEOUT,
  SECTION_KEYS.ATTESTATIONS,
];

const SHORT_NAMES = {
  [SECTION_KEYS.PROJECT_OVERVIEW]: 'Overview',
  [SECTION_KEYS.CORE_ACTIVITIES]: 'Core Activities',
  [SECTION_KEYS.SUPPORTING_ACTIVITIES]: 'Supporting',
  [SECTION_KEYS.EVIDENCE_INDEX]: 'Evidence Index',
  [SECTION_KEYS.FINANCIALS]: 'Financials',
  [SECTION_KEYS.RD_BOUNDARY]: 'R&D Boundary',
  [SECTION_KEYS.OVERSEAS_CONTRACTED]: 'Overseas',
  [SECTION_KEYS.REGISTRATION_TIEOUT]: 'Registration',
  [SECTION_KEYS.ATTESTATIONS]: 'Attestations',
};

function getSectionStatus(section) {
  if (!section || !section.content || section.content.replace(/<[^>]*>/g, '').trim().length < 10) return 'empty';
  if (section.ai_generated) return 'draft';
  return 'done';
}

// Extract searchable keywords from evidence/activity
function getSearchTerms(item) {
  if (!item) return [];
  // For activities, use the name
  if (item._type === 'activity') {
    return [item.name].filter(Boolean);
  }
  // For evidence, extract first sentence or meaningful snippet
  const text = (item.content || '').trim();
  if (!text) return [];
  // Take first sentence (up to period, question mark, or newline)
  const firstSentence = text.split(/[.\n?!]/)[0]?.trim();
  const terms = [];
  if (firstSentence && firstSentence.length > 15) {
    // Use meaningful phrases (first 80 chars, split into chunks)
    const words = firstSentence.split(/\s+/);
    // Try 5-word phrases for better matching
    for (let i = 0; i <= words.length - 4; i++) {
      terms.push(words.slice(i, i + 4).join(' '));
    }
  }
  // Also try the author email as a fallback
  if (item.author_email) terms.push(item.author_email);
  return terms;
}

// Find which section contains matching text
function findSectionWithText(sections, terms) {
  for (const key of SECTIONS_ORDER) {
    const content = sections[key]?.content;
    if (!content) continue;
    const plain = content.replace(/<[^>]*>/g, '').toLowerCase();
    for (const term of terms) {
      if (plain.includes(term.toLowerCase())) {
        return { sectionKey: key, matchedTerm: term };
      }
    }
  }
  return null;
}

// Highlight matching text in the ProseMirror DOM
function highlightInDOM(containerClass, searchText) {
  // Clear previous highlights
  const container = document.querySelector(`.${containerClass} .claimpack-content`);
  if (!container) return;

  // Remove old marks
  container.querySelectorAll('mark.workspace-highlight').forEach(el => {
    const parent = el.parentNode;
    parent.replaceChild(document.createTextNode(el.textContent), el);
    parent.normalize();
  });

  if (!searchText) return;

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const searchLower = searchText.toLowerCase();
  const nodesToProcess = [];

  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.textContent.toLowerCase().includes(searchLower)) {
      nodesToProcess.push(node);
    }
  }

  let firstHighlight = null;
  for (const node of nodesToProcess) {
    const text = node.textContent;
    const idx = text.toLowerCase().indexOf(searchLower);
    if (idx === -1) continue;

    const before = document.createTextNode(text.slice(0, idx));
    const mark = document.createElement('mark');
    mark.className = 'workspace-highlight';
    mark.textContent = text.slice(idx, idx + searchText.length);
    const after = document.createTextNode(text.slice(idx + searchText.length));

    const parent = node.parentNode;
    parent.insertBefore(before, node);
    parent.insertBefore(mark, node);
    parent.insertBefore(after, node);
    parent.removeChild(node);

    if (!firstHighlight) firstHighlight = mark;
    break; // Only highlight first match
  }

  // Scroll to highlight
  if (firstHighlight) {
    setTimeout(() => {
      firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }
}

/* ── Normalise content (markdown → HTML if needed) ── */
function normaliseContent(raw) {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (trimmed.startsWith('<')) return trimmed;
  return marked.parse(trimmed, { breaks: false });
}

/* ── Inline Section Editor with floating toolbar ── */
function InlineSectionEditor({ sectionKey, projectId, token, initialContent, onSaveStatus }) {
  const [saveTimer, setSaveTimer] = useState(null);
  const [toolbarPos, setToolbarPos] = useState(null);
  const isDirtyRef = useRef(false);
  const wrapperRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Placeholder.configure({
        placeholder: 'Start typing or generate this section with AI...',
      }),
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
      // Show toolbar when text is selected
      const { from, to } = editor.state.selection;
      if (from === to) {
        setToolbarPos(null);
        return;
      }
      // Get selection coordinates
      const domSelection = window.getSelection();
      if (!domSelection || domSelection.rangeCount === 0) return;
      const range = domSelection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const wrapperRect = wrapperRef.current?.getBoundingClientRect();
      if (!wrapperRect || rect.width === 0) return;
      setToolbarPos({
        top: rect.top - wrapperRect.top - 44,
        left: rect.left - wrapperRect.left + rect.width / 2,
      });
    },
  });

  // Hide toolbar on click outside or blur
  useEffect(() => {
    const hide = () => setTimeout(() => {
      if (editor && editor.state.selection.from === editor.state.selection.to) {
        setToolbarPos(null);
      }
    }, 200);
    document.addEventListener('mousedown', hide);
    return () => document.removeEventListener('mousedown', hide);
  }, [editor]);

  useEffect(() => {
    const normalised = normaliseContent(initialContent);
    if (editor && normalised) {
      editor.commands.setContent(normalised);
      isDirtyRef.current = false;
    }
  }, [initialContent, sectionKey]);

  const handleSave = useCallback(async (contentToSave) => {
    if (!contentToSave || contentToSave === '<p></p>') return;
    onSaveStatus?.('saving');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const res = await fetch(`/api/claim-pack-sections/${projectId}/${sectionKey}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ content: contentToSave }),
      });
      if (!res.ok) throw new Error('Save failed');
      onSaveStatus?.('saved');
      setTimeout(() => onSaveStatus?.(''), 2000);
    } catch {
      onSaveStatus?.('error');
    }
  }, [projectId, sectionKey, onSaveStatus]);

  if (!editor) return null;

  const ToolbarBtn = ({ label, title, action, active, style: extra = {} }) => (
    <button
      onMouseDown={e => { e.preventDefault(); action(); }}
      title={title}
      style={{
        padding: '4px 8px', minWidth: 28,
        backgroundColor: active ? 'white' : 'transparent',
        color: active ? '#111' : 'rgba(255,255,255,0.9)',
        border: 'none', borderRadius: 4,
        fontSize: 13, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'system-ui',
        lineHeight: 1.2,
        ...extra,
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="workspace-inline-editor" ref={wrapperRef} style={{ position: 'relative' }}>
      {/* Floating toolbar */}
      {toolbarPos && (
        <div
          onMouseDown={e => e.preventDefault()}
          style={{
            position: 'absolute',
            top: toolbarPos.top,
            left: toolbarPos.left,
            transform: 'translateX(-50%)',
            zIndex: 20,
            display: 'flex', alignItems: 'center', gap: 2,
            backgroundColor: '#1a1a1a', borderRadius: 8,
            padding: '4px 6px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            whiteSpace: 'nowrap',
          }}
        >
          <ToolbarBtn label="B" title="Bold" action={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} style={{ fontWeight: 800 }} />
          <ToolbarBtn label="I" title="Italic" action={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} style={{ fontStyle: 'italic' }} />
          <ToolbarBtn label="H2" title="Heading" action={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} style={{ fontSize: 11 }} />
          <div style={{ width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />
          <button
            onMouseDown={e => { e.preventDefault(); /* placeholder for rewrite */ }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px',
              backgroundColor: NAVY,
              color: 'white',
              border: 'none', borderRadius: 5,
              fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'system-ui',
            }}
          >
            <span style={{ fontSize: 14 }}>&#10022;</span> Rewrite
          </button>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

function ClaimPackPanel({ token, highlightItem }) {
  const [sections, setSections] = useState({});
  const [projectId, setProjectId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(SECTION_KEYS.PROJECT_OVERVIEW);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState(null);
  const [genSuccess, setGenSuccess] = useState(null);
  const [highlightTerm, setHighlightTerm] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');

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
    } catch (err) {
      console.error('Failed to fetch claim pack sections:', err);
    }
    setLoading(false);
  }, [token]);

  // Handle highlight when user clicks item on left panel
  useEffect(() => {
    if (!highlightItem || Object.keys(sections).length === 0) return;

    const terms = getSearchTerms(highlightItem);
    const match = findSectionWithText(sections, terms);

    if (match) {
      setActiveSection(match.sectionKey);
      setHighlightTerm(match.matchedTerm);
      // Delay highlight to let SectionEditor mount with new key
      setTimeout(() => {
        highlightInDOM('workspace-claimpack', match.matchedTerm);
      }, 300);
    } else {
      setHighlightTerm(null);
    }
  }, [highlightItem, sections]);

  useEffect(() => { fetchSections(); }, [fetchSections]);

  const completedCount = SECTIONS_ORDER.filter(k => getSectionStatus(sections[k]) !== 'empty').length;

  const handleGenerateAll = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setGenError(null);
    setGenSuccess(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/projects/${token}/claim-pack/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Generation failed');
      setGenSuccess(`${data.generated.length} section${data.generated.length !== 1 ? 's' : ''} generated`);
      await fetchSections();
      setTimeout(() => setGenSuccess(null), 4000);
    } catch (err) {
      setGenError(err.message);
      setTimeout(() => setGenError(null), 5000);
    }
    setIsGenerating(false);
  };

  const handleRegenerateSection = async (sectionKey) => {
    setIsGenerating(true);
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
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Generation failed');
      await fetchSections();
    } catch (err) {
      setGenError(err.message);
      setTimeout(() => setGenError(null), 5000);
    }
    setIsGenerating(false);
  };

  const sectionData = sections[activeSection] || {};
  const activeStatus = getSectionStatus(sectionData);

  if (loading) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        minWidth: 0, backgroundColor: '#fafbfc',
      }}>
        <div style={{ textAlign: 'center', color: '#9ca3af' }}>
          <p style={{ fontSize: 13, margin: 0 }}>Loading claim pack...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      minWidth: 0, backgroundColor: 'white',
    }}>
      {/* Breadcrumb header + stats */}
      <div style={{
        padding: '12px 28px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <span style={{ color: '#9ca3af', fontWeight: 500 }}>Claim Pack</span>
          <span style={{ color: '#d1d5db' }}>&rsaquo;</span>
          <span style={{ color: '#111827', fontWeight: 600 }}>{SHORT_NAMES[activeSection]}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#9ca3af' }}>
          <span><strong style={{ color: '#374151' }}>{completedCount}/{SECTIONS_ORDER.length}</strong> sections</span>
          <span style={{ color: '#e5e7eb' }}>|</span>
          <button
            onClick={handleGenerateAll}
            disabled={isGenerating}
            style={{
              padding: '5px 14px', fontSize: 12, fontWeight: 500,
              color: '#374151', backgroundColor: 'white',
              border: '1px solid #e5e7eb', borderRadius: 6,
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {isGenerating ? 'Generating...' : completedCount === 0 ? 'Generate All' : 'Regenerate'}
          </button>
        </div>
      </div>

      {/* Feedback banners */}
      {(genError || genSuccess) && (
        <div style={{ padding: '0 28px' }}>
          {genError && (
            <div style={{
              padding: '8px 12px', marginTop: 10,
              backgroundColor: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 6, fontSize: 12, color: '#991b1b',
            }}>
              {genError}
            </div>
          )}
          {genSuccess && (
            <div style={{
              padding: '8px 12px', marginTop: 10,
              backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: 6, fontSize: 12, color: '#166534',
            }}>
              {genSuccess}
            </div>
          )}
        </div>
      )}

      {/* Section tabs — underline style */}
      <div style={{
        display: 'flex', overflowX: 'auto',
        borderBottom: '1px solid #f0f0f0',
        padding: '0 28px',
        flexShrink: 0,
        scrollbarWidth: 'none',
      }}>
        {SECTIONS_ORDER.map(key => {
          const isActive = activeSection === key;
          return (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              style={{
                padding: '10px 14px',
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#111827' : '#9ca3af',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${isActive ? '#111827' : 'transparent'}`,
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.12s',
                marginBottom: -1,
              }}
            >
              {SHORT_NAMES[key]}
            </button>
          );
        })}
      </div>

      {/* Section content (inline editable) */}
      <div className="workspace-claimpack" style={{ flex: 1, overflowY: 'auto', padding: '28px 36px 36px' }}>
        {/* Section title */}
        <h1 style={{
          fontSize: 28, fontWeight: 700, color: '#111827',
          margin: '0 0 6px', lineHeight: 1.3,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          {SECTION_NAMES[activeSection]}
        </h1>

        {/* Edited metadata + save status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          {sectionData.last_edited_at && (
            <span style={{ fontSize: 13, color: '#9ca3af' }}>
              {sectionData.ai_generated !== false ? 'AI draft' : 'Edited'}{' '}
              {new Date(sectionData.last_edited_at).toLocaleDateString('en-AU', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </span>
          )}
          {saveStatus === 'saving' && <span style={{ fontSize: 12, color: '#9ca3af' }}>Saving...</span>}
          {saveStatus === 'saved' && <span style={{ fontSize: 12, color: '#10b981' }}>Saved</span>}
          {saveStatus === 'error' && <span style={{ fontSize: 12, color: '#ef4444' }}>Save failed</span>}
        </div>

        {projectId ? (
          <InlineSectionEditor
            key={activeSection}
            sectionKey={activeSection}
            projectId={projectId}
            token={token}
            initialContent={sectionData.content || null}
            onSaveStatus={setSaveStatus}
          />
        ) : (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#6b7280', fontWeight: 500, margin: '0 0 6px' }}>
              No content yet
            </p>
            <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 16px', lineHeight: 1.5 }}>
              Generate this section with AI to get started.
            </p>
            <button
              onClick={handleGenerateAll}
              disabled={isGenerating}
              style={{
                padding: '8px 16px', fontSize: 13, fontWeight: 600,
                color: 'white', backgroundColor: isGenerating ? '#9ca3af' : NAVY,
                border: 'none', borderRadius: 6,
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {isGenerating ? 'Generating...' : 'Generate All Sections'}
            </button>
          </div>
        )}

        <style>{`
          .workspace-inline-editor .ProseMirror {
            outline: none;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 16px;
            line-height: 1.8;
            color: #1a1a1a;
            min-height: 200px;
          }
          .workspace-inline-editor .ProseMirror p {
            margin: 0 0 16px 0;
          }
          .workspace-inline-editor .ProseMirror p:last-child {
            margin-bottom: 0;
          }
          .workspace-inline-editor .ProseMirror h2 {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #374151;
            margin: 28px 0 12px 0;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .workspace-inline-editor .ProseMirror h2::before {
            content: '—';
            color: #9ca3af;
            font-weight: 400;
          }
          .workspace-inline-editor .ProseMirror h3 {
            font-size: 13px;
            font-weight: 600;
            color: #1f2937;
            margin: 20px 0 8px 0;
          }
          .workspace-inline-editor .ProseMirror h4 {
            font-size: 12px;
            font-weight: 600;
            color: #374151;
            margin: 16px 0 6px 0;
          }
          .workspace-inline-editor .ProseMirror ul,
          .workspace-inline-editor .ProseMirror ol {
            margin: 0 0 12px 0;
            padding-left: 20px;
          }
          .workspace-inline-editor .ProseMirror li {
            margin-bottom: 4px;
          }
          .workspace-inline-editor .ProseMirror strong {
            font-weight: 600;
            color: #111827;
          }
          .workspace-inline-editor .ProseMirror blockquote {
            border-left: 3px solid #021048;
            padding-left: 14px;
            margin: 12px 0;
            color: #374151;
          }
          .workspace-inline-editor .ProseMirror p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: #d1d5db;
            pointer-events: none;
            height: 0;
            font-style: italic;
            font-size: 15px;
          }
          mark.workspace-highlight {
            background-color: #dbeafe;
            color: #1e3a5f;
            padding: 1px 2px;
            border-radius: 2px;
          }
        `}</style>
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
  const [filter, setFilter] = useState('all'); // 'all' | 'activities' | 'evidence'
  const [expandedActivity, setExpandedActivity] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [highlightItem, setHighlightItem] = useState(null);

  const handleActivityCreated = (newActivity) => {
    if (onActivitiesChange) {
      onActivitiesChange([...activities, newActivity]);
    }
  };

  const activityCount = activities.length;
  const evidenceCount = items.length;

  return (
    <div style={{ display: 'flex', gap: 0, height: 'calc(100vh - 160px)', minHeight: 500 }}>
      {/* ── Left panel ── */}
      <div style={{
        width: 360, minWidth: 300, flexShrink: 0,
        borderRight: '1px solid #e5e5e5',
        display: 'flex', flexDirection: 'column',
        backgroundColor: 'white',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 20px 12px',
          borderBottom: '1px solid #f0f0f0',
          flexShrink: 0,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 10,
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
              Activities
            </h2>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                padding: '5px 14px', fontSize: 13, fontWeight: 500,
                color: '#374151', backgroundColor: 'white',
                border: '1px solid #e5e7eb', borderRadius: 6,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}
            >
              <span style={{ fontSize: 15, lineHeight: 1 }}>+</span> New
            </button>
          </div>

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: 4 }}>
            <PillButton label="All" count={activityCount + evidenceCount} active={filter === 'all'} onClick={() => setFilter('all')} />
            <PillButton label="Activities" count={activityCount} active={filter === 'activities'} onClick={() => setFilter('activities')} />
            <PillButton label="Evidence" count={evidenceCount} active={filter === 'evidence'} onClick={() => setFilter('evidence')} />
          </div>
        </div>

        {/* List content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Activities section */}
          {(filter === 'all' || filter === 'activities') && activities.length > 0 && (() => {
            const core = activities.filter(a => a.status === 'adopted' || a.source !== 'supporting');
            const supporting = activities.filter(a => a.source === 'supporting');
            const renderActivity = (act) => (
              <ActivityRow
                key={act.id}
                activity={act}
                token={token}
                expanded={expandedActivity === act.id}
                onToggle={() => {
                  setExpandedActivity(prev => prev === act.id ? null : act.id);
                  setHighlightItem({ ...act, _type: 'activity', _ts: Date.now() });
                }}
                onSelect={(evidenceId) => {
                  setSelectedId(evidenceId);
                  const ev = items.find(e => e.id === evidenceId);
                  if (ev) setHighlightItem({ ...ev, _type: 'evidence', _ts: Date.now() });
                }}
              />
            );
            return (
              <div>
                {core.length > 0 && (
                  <>
                    <div style={{
                      padding: '12px 20px 6px', fontSize: 11, fontWeight: 700,
                      color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                      Core Activities
                    </div>
                    {core.map(renderActivity)}
                  </>
                )}
                {supporting.length > 0 && (
                  <>
                    <div style={{
                      padding: '16px 20px 6px', fontSize: 11, fontWeight: 700,
                      color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                      Supporting
                    </div>
                    {supporting.map(renderActivity)}
                  </>
                )}
              </div>
            );
          })()}

          {/* Evidence section */}
          {(filter === 'all' || filter === 'evidence') && (
            <div>
              {filter === 'all' && (
                <div style={{
                  padding: '16px 20px 6px', fontSize: 11, fontWeight: 700,
                  color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  Evidence
                </div>
              )}
              {items.length > 0 ? (
                items.map(ev => (
                  <EvidenceRow
                    key={ev.id}
                    ev={ev}
                    evidenceSteps={evidenceSteps}
                    evidenceActivityTypes={evidenceActivityTypes}
                    selected={selectedId === ev.id}
                    onClick={() => { setSelectedId(ev.id); setHighlightItem({ ...ev, _type: 'evidence', _ts: Date.now() }); }}
                  />
                ))
              ) : (
                <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>
                  <p style={{ fontSize: 13, margin: 0 }}>No evidence yet</p>
                </div>
              )}
            </div>
          )}

          {/* Empty state for activities filter */}
          {filter === 'activities' && activities.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 4px' }}>No activities yet</p>
              <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 16px' }}>
                Create your first R&D activity to start organising evidence
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 600,
                  color: 'white', backgroundColor: NAVY,
                  border: 'none', borderRadius: 8,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Create activity
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel — Claim Pack ── */}
      <ClaimPackPanel token={token} highlightItem={highlightItem} />

      {/* Create modal */}
      {showCreateModal && (
        <CreateActivityModal
          token={token}
          onCreated={handleActivityCreated}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
