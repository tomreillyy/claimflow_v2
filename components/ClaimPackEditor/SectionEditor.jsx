'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useState, useCallback } from 'react';

export default function SectionEditor({
  sectionKey,
  sectionName,
  projectId,
  initialContent,
  aiGenerated,
  lastEditedAt,
  lastEditedBy,
  onRegenerateClick
}) {
  const [content, setContent] = useState(initialContent || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // 'saving', 'saved', 'error'
  const [isEditing, setIsEditing] = useState(false);

  // Auto-save debounce timer
  const [saveTimer, setSaveTimer] = useState(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4]
        }
      }),
      Placeholder.configure({
        placeholder: `${sectionName} content will appear here after generation...`
      })
    ],
    content: content,
    editable: true,
    onUpdate: ({ editor }) => {
      const newContent = editor.getHTML();
      setContent(newContent);
      setIsEditing(true);

      // Debounced auto-save
      if (saveTimer) clearTimeout(saveTimer);

      const timer = setTimeout(() => {
        handleSave(newContent);
      }, 2000); // 2 second debounce

      setSaveTimer(timer);
    }
  });

  // Update editor content when initialContent changes (from regeneration)
  useEffect(() => {
    if (editor && initialContent !== content) {
      editor.commands.setContent(initialContent || '');
      setContent(initialContent || '');
    }
  }, [initialContent]);

  const handleSave = useCallback(async (contentToSave) => {
    if (!contentToSave || contentToSave === '<p></p>') {
      return; // Don't save empty content
    }

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      const response = await fetch(`/api/claim-pack-sections/${projectId}/${sectionKey}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: contentToSave })
      });

      if (!response.ok) {
        throw new Error('Save failed');
      }

      setSaveStatus('saved');
      setIsEditing(false);

      // Clear "saved" status after 2 seconds
      setTimeout(() => {
        setSaveStatus('');
      }, 2000);

    } catch (error) {
      console.error('[SectionEditor] Save error:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }, [projectId, sectionKey]);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
  };

  if (!editor) {
    return null;
  }

  const hasContent = content && content !== '<p></p>' && content.length > 10;

  return (
    <div className="section-editor print-section" style={{
      marginBottom: 40,
      pageBreakInside: 'avoid'
    }}>
      {/* Section Header (hidden in print) */}
      <div className="print-hide" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        paddingBottom: 8,
        borderBottom: '1px solid #e5e5e5'
      }}>
        <h2 style={{
          fontSize: 16,
          fontWeight: 600,
          color: '#1a1a1a',
          margin: 0
        }}>
          {sectionName}
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Save status */}
          {saveStatus === 'saving' && (
            <span style={{ fontSize: 12, color: '#666' }}>Saving...</span>
          )}
          {saveStatus === 'saved' && (
            <span style={{ fontSize: 12, color: '#10b981' }}>✓ Saved</span>
          )}
          {saveStatus === 'error' && (
            <span style={{ fontSize: 12, color: '#ef4444' }}>Save failed</span>
          )}

          {/* Metadata */}
          {hasContent && (
            <span style={{ fontSize: 11, color: '#999', fontFamily: 'system-ui' }}>
              {aiGenerated === false ? '✏️ Edited' : '🤖 AI-generated'}
              {lastEditedAt && ` · ${formatTimestamp(lastEditedAt)}`}
            </span>
          )}

          {/* Regenerate button */}
          {onRegenerateClick && (
            <button
              onClick={onRegenerateClick}
              style={{
                padding: '6px 12px',
                backgroundColor: 'white',
                color: '#021048',
                border: '1px solid #021048',
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'system-ui'
              }}
            >
              Regenerate AI
            </button>
          )}
        </div>
      </div>

      {/* Print-only header */}
      <h2 className="print-only" style={{
        fontSize: 16,
        fontWeight: 600,
        color: '#1a1a1a',
        margin: '0 0 12px 0',
        borderBottom: '1px solid #333',
        paddingBottom: 4
      }}>
        {sectionName}
      </h2>

      {/* Editor Toolbar (hidden in print) */}
      {hasContent && (
        <div className="print-hide" style={{
          display: 'flex',
          gap: 8,
          marginBottom: 12,
          padding: 8,
          backgroundColor: '#f8fafc',
          borderRadius: 4,
          border: '1px solid #e2e8f0'
        }}>
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'is-active' : ''}
            style={{
              padding: '4px 8px',
              backgroundColor: editor.isActive('bold') ? '#021048' : 'white',
              color: editor.isActive('bold') ? 'white' : '#333',
              border: '1px solid #ddd',
              borderRadius: 3,
              fontSize: 12,
              cursor: 'pointer',
              fontWeight: editor.isActive('bold') ? 600 : 400
            }}
          >
            Bold
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'is-active' : ''}
            style={{
              padding: '4px 8px',
              backgroundColor: editor.isActive('italic') ? '#021048' : 'white',
              color: editor.isActive('italic') ? 'white' : '#333',
              border: '1px solid #ddd',
              borderRadius: 3,
              fontSize: 12,
              cursor: 'pointer',
              fontStyle: 'italic'
            }}
          >
            Italic
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
            style={{
              padding: '4px 8px',
              backgroundColor: editor.isActive('heading', { level: 2 }) ? '#021048' : 'white',
              color: editor.isActive('heading', { level: 2 }) ? 'white' : '#333',
              border: '1px solid #ddd',
              borderRadius: 3,
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            Heading
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'is-active' : ''}
            style={{
              padding: '4px 8px',
              backgroundColor: editor.isActive('bulletList') ? '#021048' : 'white',
              color: editor.isActive('bulletList') ? 'white' : '#333',
              border: '1px solid #ddd',
              borderRadius: 3,
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            • List
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? 'is-active' : ''}
            style={{
              padding: '4px 8px',
              backgroundColor: editor.isActive('orderedList') ? '#021048' : 'white',
              color: editor.isActive('orderedList') ? 'white' : '#333',
              border: '1px solid #ddd',
              borderRadius: 3,
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            1. List
          </button>
        </div>
      )}

      {/* Editor Content */}
      <div style={{
        fontSize: 14,
        lineHeight: 1.7,
        color: '#333',
        fontFamily: 'Georgia, "Times New Roman", serif',
        minHeight: hasContent ? 0 : 100
      }}>
        <EditorContent editor={editor} />
      </div>

      {/* Empty state message (hidden in print) */}
      {!hasContent && (
        <div className="print-hide" style={{
          padding: 24,
          textAlign: 'center',
          color: '#999',
          fontStyle: 'italic',
          fontSize: 13
        }}>
          No content yet. Click "Generate Claim Pack" to create AI-generated content.
        </div>
      )}

      <style jsx global>{`
        .ProseMirror {
          outline: none;
          padding: 12px;
          border: 1px solid #e5e5e5;
          border-radius: 4px;
          background: white;
          min-height: 100px;
        }

        .ProseMirror:focus {
          border-color: #021048;
          box-shadow: 0 0 0 1px #021048;
        }

        .ProseMirror p {
          margin: 0 0 12px 0;
        }

        .ProseMirror p:last-child {
          margin-bottom: 0;
        }

        .ProseMirror h2 {
          font-size: 18px;
          font-weight: 600;
          margin: 20px 0 12px 0;
          color: #1a1a1a;
        }

        .ProseMirror h3 {
          font-size: 16px;
          font-weight: 600;
          margin: 16px 0 10px 0;
          color: #333;
        }

        .ProseMirror h4 {
          font-size: 14px;
          font-weight: 600;
          margin: 12px 0 8px 0;
          color: #333;
        }

        .ProseMirror ul,
        .ProseMirror ol {
          margin: 0 0 12px 0;
          padding-left: 24px;
        }

        .ProseMirror li {
          margin-bottom: 4px;
        }

        .ProseMirror strong {
          font-weight: 600;
        }

        .ProseMirror em {
          font-style: italic;
        }

        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }

        @media print {
          .print-hide {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .ProseMirror {
            border: none;
            padding: 0;
          }
        }

        .print-only {
          display: none;
        }
      `}</style>
    </div>
  );
}
