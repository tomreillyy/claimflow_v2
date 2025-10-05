'use client';
import { useState } from 'react';

export default function SuggestionBanner({ suggestion, onSave, onDismiss }) {
  if (!suggestion) return null;

  const [isRenaming, setIsRenaming] = useState(false);
  const [name, setName] = useState(suggestion.name);
  const [uncertainty, setUncertainty] = useState(suggestion.uncertainty);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(name, uncertainty, suggestion.fingerprint);
    setSaving(false);
  }

  async function handleDismiss() {
    await onDismiss(suggestion.fingerprint);
  }

  if (isRenaming) {
    return (
      <div style={{
        padding: '16px 20px',
        backgroundColor: '#f0f9ff',
        border: '1px solid #bae6fd',
        borderRadius: 8,
        marginBottom: 20
      }}>
        <div style={{ marginBottom: 12 }}>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Short label (e.g., 'Queue-based API')"
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: 14,
              border: '1px solid #ddd',
              borderRadius: 6,
              outline: 'none',
              marginBottom: 8,
              boxSizing: 'border-box',
              color: '#1a1a1a',
              backgroundColor: 'white'
            }}
            onFocus={e => e.target.style.borderColor = '#007acc'}
            onBlur={e => e.target.style.borderColor = '#ddd'}
          />
          <textarea
            value={uncertainty}
            onChange={e => setUncertainty(e.target.value)}
            placeholder="1–2 sentences: the specific technical unknown this activity tests."
            rows={2}
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: 14,
              border: '1px solid #ddd',
              borderRadius: 6,
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
              color: '#1a1a1a',
              backgroundColor: 'white'
            }}
            onFocus={e => e.target.style.borderColor = '#007acc'}
            onBlur={e => e.target.style.borderColor = '#ddd'}
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !name.trim() || !uncertainty.trim()}
          style={{
            padding: '6px 12px',
            backgroundColor: (saving || !name.trim() || !uncertainty.trim()) ? '#ccc' : '#007acc',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            cursor: (saving || !name.trim() || !uncertainty.trim()) ? 'default' : 'pointer'
          }}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <style jsx>{`
          input::placeholder, textarea::placeholder {
            color: #666 !important;
            opacity: 1;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      padding: '16px 20px',
      backgroundColor: '#f0f9ff',
      border: '1px solid #bae6fd',
      borderRadius: 8,
      marginBottom: 20
    }}>
      <div style={{
        fontSize: 14,
        color: '#0c4a6e',
        marginBottom: 12,
        lineHeight: 1.5
      }}>
        Looks like a focused line of work: <strong>{suggestion.name}</strong> — {suggestion.uncertainty}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleSave}
          style={{
            padding: '6px 12px',
            backgroundColor: '#007acc',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          Save
        </button>
        <button
          onClick={() => setIsRenaming(true)}
          style={{
            padding: '6px 12px',
            backgroundColor: 'white',
            color: '#007acc',
            border: '1px solid #007acc',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          Rename
        </button>
        <button
          onClick={handleDismiss}
          style={{
            padding: '6px 12px',
            backgroundColor: 'white',
            color: '#666',
            border: '1px solid #ddd',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
