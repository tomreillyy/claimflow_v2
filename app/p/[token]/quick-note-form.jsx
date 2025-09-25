'use client';
import { useState } from 'react';

export default function QuickNoteForm({ token }) {
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true); setErr('');
    const res = await fetch(`/api/evidence/${token}/add`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ author_email: author || null, content })
    });
    if (!res.ok) { setErr('Failed to save'); setSaving(false); return; }
    setContent(''); setSaving(false);
    // reload to show new item
    window.location.reload();
  }

  return (
    <form onSubmit={submit} style={{display: 'grid', gap: 16}}>
      <textarea
        placeholder="What did you work on today? Quick notes about experiments, challenges, or breakthroughs..."
        value={content}
        onChange={e=>setContent(e.target.value)}
        rows={3}
        style={{
          width: '100%',
          padding: '12px 16px',
          fontSize: 15,
          border: '1px solid #ddd',
          borderRadius: 8,
          outline: 'none',
          resize: 'vertical',
          lineHeight: 1.4,
          fontFamily: 'inherit',
          boxSizing: 'border-box',
          color: '#1a1a1a'
        }}
        onFocus={e => e.target.style.borderColor = '#007acc'}
        onBlur={e => e.target.style.borderColor = '#ddd'}
      />

      <div style={{display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap'}}>
        <input
          placeholder="Your email (optional)"
          value={author}
          onChange={e=>setAuthor(e.target.value)}
          style={{
            padding: '8px 12px',
            fontSize: 14,
            border: '1px solid #ddd',
            borderRadius: 6,
            outline: 'none',
            minWidth: 200,
            boxSizing: 'border-box',
            color: '#1a1a1a'
          }}
          onFocus={e => e.target.style.borderColor = '#007acc'}
          onBlur={e => e.target.style.borderColor = '#ddd'}
        />

        <button
          disabled={saving}
          type="submit"
          style={{
            padding: '8px 16px',
            backgroundColor: saving ? '#ccc' : '#007acc',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 500,
            cursor: saving ? 'default' : 'pointer',
            transition: 'background-color 0.2s'
          }}
        >
          {saving ? 'Saving...' : 'Add note'}
        </button>
      </div>

      {err && (
        <div style={{
          padding: 12,
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 6,
          fontSize: 14,
          color: '#dc2626'
        }}>
          {err}
        </div>
      )}

      {/* Better placeholder contrast */}
      <style jsx>{`
        input::placeholder, textarea::placeholder {
          color: #666 !important;
          opacity: 1;
        }
        input::-webkit-input-placeholder, textarea::-webkit-input-placeholder {
          color: #666;
        }
        input::-moz-placeholder, textarea::-moz-placeholder {
          color: #666;
          opacity: 1;
        }
      `}</style>
    </form>
  );
}