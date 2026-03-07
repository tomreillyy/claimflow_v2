'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useState, useRef, useCallback } from 'react';
import { marked } from 'marked';
import { supabase } from '@/lib/supabaseClient';
import SectionStrengthener from './SectionStrengthener';

// Convert markdown to HTML if content looks like markdown (not already HTML)
function normaliseContent(raw) {
  if (!raw) return '';
  const trimmed = raw.trim();
  // If it starts with an HTML tag, treat as already-HTML (Tiptap output)
  if (trimmed.startsWith('<')) return trimmed;
  // Otherwise parse as markdown
  return marked.parse(trimmed, { breaks: false });
}

// Sections that support AI gap detection
const STRENGTHEN_SUPPORTED = new Set(['supporting_activities', 'project_overview', 'core_activities', 'rd_boundary']);

export default function SectionEditor({
  sectionKey,
  sectionName,
  projectId,
  token,
  initialContent,
  aiGenerated,
  lastEditedAt,
  lastEditedBy,
  onRegenerateClick
}) {
  const [content, setContent] = useState(normaliseContent(initialContent));
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [saveTimer, setSaveTimer] = useState(null);
  const [showStrengthener, setShowStrengthener] = useState(false);
  // Only auto-save after the user has made at least one edit — prevents spurious
  // saves triggered by Tiptap normalising HTML on initial render.
  const isDirtyRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      Placeholder.configure({
        placeholder: `Click "Generate All Sections" to create this section, or type here to write it manually.`,
      }),
    ],
    content: normaliseContent(initialContent),
    editable: true,
    onUpdate: ({ editor }) => {
      const newContent = editor.getHTML();
      setContent(newContent);
      if (!isDirtyRef.current) return; // ignore initialisation-time normalisation
      if (saveTimer) clearTimeout(saveTimer);
      const timer = setTimeout(() => handleSave(newContent), 2000);
      setSaveTimer(timer);
    },
    onSelectionUpdate: () => {
      // First user interaction (cursor move / click) marks the editor as dirty
      // so subsequent onUpdate calls will trigger saves.
      isDirtyRef.current = true;
    },
  });

  useEffect(() => {
    const normalised = normaliseContent(initialContent);
    if (editor && normalised !== content) {
      editor.commands.setContent(normalised);
      setContent(normalised);
    }
  }, [initialContent]);

  const handleSave = useCallback(async (contentToSave) => {
    if (!contentToSave || contentToSave === '<p></p>') return;
    setIsSaving(true);
    setSaveStatus('saving');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const response = await fetch(`/api/claim-pack-sections/${projectId}/${sectionKey}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ content: contentToSave }),
      });
      if (!response.ok) throw new Error('Save failed');
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (error) {
      console.error('[SectionEditor] Save error:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }, [projectId, sectionKey]);

  const handleInsertContent = useCallback((html) => {
    if (!editor) return;
    isDirtyRef.current = true; // programmatic insert counts as a user edit
    const htmlContent = html.startsWith('<') ? html : `<p>${html}</p>`;
    editor.commands.insertContentAt(editor.state.doc.content.size, htmlContent);
  }, [editor]);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMins = Math.floor((now - date) / 60000);
    const diffHours = Math.floor((now - date) / 3600000);
    const diffDays = Math.floor((now - date) / 86400000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
  };

  if (!editor) return null;

  // Strip tags to get plain text length for has-content check
  const plainTextLength = content.replace(/<[^>]*>/g, '').trim().length;
  const hasContent = plainTextLength > 10;

  const toolbarButtons = [
    {
      label: 'B',
      title: 'Bold',
      style: { fontWeight: 700 },
      action: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive('bold'),
    },
    {
      label: 'I',
      title: 'Italic',
      style: { fontStyle: 'italic' },
      action: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive('italic'),
    },
    {
      label: 'H2',
      title: 'Heading',
      style: { fontSize: 11 },
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: editor.isActive('heading', { level: 2 }),
    },
    {
      label: '—',
      title: 'Bullet list',
      style: {},
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: editor.isActive('bulletList'),
    },
    {
      label: '1.',
      title: 'Numbered list',
      style: { fontSize: 11 },
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: editor.isActive('orderedList'),
    },
  ];

  return (
    <div className="section-editor print-section" style={{
      marginBottom: 12,
      pageBreakInside: 'avoid',
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      {/* Section header — screen only */}
      <div className="print-hide" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        borderBottom: '1px solid #f3f4f6',
        backgroundColor: '#fafafa',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <h2 style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#111827',
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {sectionName}
          </h2>
          {hasContent && (
            <span style={{
              fontSize: 10,
              color: '#9ca3af',
              backgroundColor: '#f3f4f6',
              padding: '2px 6px',
              borderRadius: 3,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}>
              {aiGenerated === false ? 'Edited' : 'AI draft'}
              {lastEditedAt ? ` · ${formatTimestamp(lastEditedAt)}` : ''}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {saveStatus === 'saving' && (
            <span style={{ fontSize: 11, color: '#9ca3af' }}>Saving...</span>
          )}
          {saveStatus === 'saved' && (
            <span style={{ fontSize: 11, color: '#10b981' }}>Saved</span>
          )}
          {saveStatus === 'error' && (
            <span style={{ fontSize: 11, color: '#ef4444' }}>Save failed</span>
          )}
          {token && STRENGTHEN_SUPPORTED.has(sectionKey) && (
            <button
              onClick={() => setShowStrengthener(s => !s)}
              style={{
                padding: '4px 10px',
                backgroundColor: showStrengthener ? '#dbeafe' : 'transparent',
                color: showStrengthener ? '#1d4ed8' : '#6b7280',
                border: '1px solid',
                borderColor: showStrengthener ? '#93c5fd' : '#e5e7eb',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'system-ui',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                if (!showStrengthener) {
                  e.currentTarget.style.borderColor = '#93c5fd';
                  e.currentTarget.style.color = '#1d4ed8';
                }
              }}
              onMouseLeave={e => {
                if (!showStrengthener) {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.color = '#6b7280';
                }
              }}
            >
              ✦ Strengthen
            </button>
          )}
          {onRegenerateClick && (
            <button
              onClick={onRegenerateClick}
              style={{
                padding: '4px 10px',
                backgroundColor: 'transparent',
                color: '#6b7280',
                border: '1px solid #e5e7eb',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'system-ui',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#021048';
                e.currentTarget.style.color = '#021048';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.color = '#6b7280';
              }}
            >
              Regenerate
            </button>
          )}
        </div>
      </div>

      {/* Print-only section header */}
      <h2 className="print-only" style={{
        fontSize: 16,
        fontWeight: 600,
        color: '#1a1a1a',
        margin: '0 0 12px 0',
        borderBottom: '1px solid #333',
        paddingBottom: 4,
      }}>
        {sectionName}
      </h2>

      {/* Toolbar — screen only, only if has content */}
      {hasContent && (
        <div className="print-hide" style={{
          display: 'flex',
          gap: 2,
          padding: '6px 14px',
          borderBottom: '1px solid #f3f4f6',
          backgroundColor: 'white',
        }}>
          {toolbarButtons.map(({ label, title, style, action, active }) => (
            <button
              key={label}
              onClick={action}
              title={title}
              style={{
                padding: '3px 7px',
                minWidth: 26,
                backgroundColor: active ? '#021048' : 'transparent',
                color: active ? 'white' : '#6b7280',
                border: '1px solid',
                borderColor: active ? '#021048' : 'transparent',
                borderRadius: 3,
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: 'system-ui',
                lineHeight: 1.4,
                ...style,
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                }
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Strengthen panel */}
      {showStrengthener && token && (
        <SectionStrengthener
          sectionKey={sectionKey}
          projectToken={token}
          currentContent={content}
          onInsertContent={handleInsertContent}
          onClose={() => setShowStrengthener(false)}
        />
      )}

      {/* Editor content */}
      <div className="section-body" style={{ padding: '14px 16px' }}>
        <EditorContent editor={editor} />
      </div>

      <style jsx global>{`
        .ProseMirror {
          outline: none;
          min-height: 60px;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 14px;
          line-height: 1.7;
          color: #374151;
        }

        .ProseMirror p {
          margin: 0 0 10px 0;
        }
        .ProseMirror p:last-child {
          margin-bottom: 0;
        }
        .ProseMirror h2 {
          font-size: 16px;
          font-weight: 600;
          margin: 18px 0 10px 0;
          color: #111827;
        }
        .ProseMirror h3 {
          font-size: 14px;
          font-weight: 600;
          margin: 14px 0 8px 0;
          color: #1f2937;
        }
        .ProseMirror h4 {
          font-size: 13px;
          font-weight: 600;
          margin: 12px 0 6px 0;
          color: #374151;
        }
        .ProseMirror ul, .ProseMirror ol {
          margin: 0 0 10px 0;
          padding-left: 22px;
        }
        .ProseMirror li {
          margin-bottom: 3px;
        }
        .ProseMirror strong {
          font-weight: 600;
          color: #111827;
        }
        .ProseMirror em {
          font-style: italic;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #d1d5db;
          pointer-events: none;
          height: 0;
          font-style: italic;
          font-size: 13px;
        }

        @media print {
          .print-hide { display: none !important; }
          .print-only { display: block !important; }
          .ProseMirror {
            min-height: 0;
          }
        }

        .print-only { display: none; }
      `}</style>
    </div>
  );
}
