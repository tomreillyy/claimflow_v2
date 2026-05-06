'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { marked } from 'marked';

const NAVY = '#021048';

export function normaliseContent(raw) {
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

/* ── Organic blob loader ── */
export function BlobLoader() {
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

export default InlineEditor;
