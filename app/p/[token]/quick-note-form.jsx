'use client';
import { useState } from 'react';

export default function QuickNoteForm({ token }) {
  const [isOpen, setIsOpen] = useState(false);
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

    const data = await res.json();

    // Trigger classification (fire-and-forget, ignore failures)
    if (data.id) {
      fetch(`/api/classify?id=${data.id}`, { method: 'POST' })
        .catch(() => {}); // ignore errors
    }

    setContent(''); setSaving(false); setIsOpen(false);
    // reload to show new item
    window.location.reload();
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          padding: '6px 12px',
          fontSize: 13,
          fontWeight: 500,
          color: 'white',
          backgroundColor: '#007acc',
          border: 'none',
          borderRadius: 3,
          cursor: 'pointer'
        }}
      >
        + Add note
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 20
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: 4,
        padding: 20,
        maxWidth: 600,
        width: '100%',
        border: '1px solid #e5e5e5',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16
        }}>
          <h3 style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#1a1a1a',
            margin: 0
          }}>Add Evidence</h3>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              color: '#666',
              cursor: 'pointer',
              padding: 0,
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={submit} style={{display: 'grid', gap: 12}}>
          <textarea
            placeholder="What did you work on today? Quick notes about experiments, challenges, or breakthroughs..."
            value={content}
            onChange={e=>setContent(e.target.value)}
            rows={4}
            autoFocus
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: 14,
              border: '1px solid #ddd',
              borderRadius: 3,
              outline: 'none',
              resize: 'vertical',
              lineHeight: 1.4,
              fontFamily: 'inherit',
              boxSizing: 'border-box',
              color: '#1a1a1a',
              backgroundColor: 'white'
            }}
            onFocus={e => e.target.style.borderColor = '#007acc'}
            onBlur={e => e.target.style.borderColor = '#ddd'}
          />

          <input
            placeholder="Your email (optional)"
            value={author}
            onChange={e=>setAuthor(e.target.value)}
            style={{
              padding: '8px 12px',
              fontSize: 14,
              border: '1px solid #ddd',
              borderRadius: 3,
              outline: 'none',
              boxSizing: 'border-box',
              color: '#1a1a1a',
              backgroundColor: 'white'
            }}
            onFocus={e => e.target.style.borderColor = '#007acc'}
            onBlur={e => e.target.style.borderColor = '#ddd'}
          />

          <div style={{display: 'flex', gap: 8, justifyContent: 'flex-end'}}>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                padding: '7px 14px',
                fontSize: 13,
                fontWeight: 500,
                color: '#666',
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: 3,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              disabled={saving || !content.trim()}
              type="submit"
              style={{
                padding: '7px 14px',
                backgroundColor: (saving || !content.trim()) ? '#ccc' : '#007acc',
                color: 'white',
                border: 'none',
                borderRadius: 3,
                fontSize: 13,
                fontWeight: 500,
                cursor: (saving || !content.trim()) ? 'default' : 'pointer'
              }}
            >
              {saving ? 'Saving...' : 'Add note'}
            </button>
          </div>

          {err && (
            <div style={{
              padding: 10,
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 3,
              fontSize: 13,
              color: '#dc2626'
            }}>
              {err}
            </div>
          )}

          <style jsx>{`
            input::placeholder, textarea::placeholder {
              color: #666 !important;
              opacity: 1;
            }
          `}</style>
        </form>
      </div>
    </div>
  );
}