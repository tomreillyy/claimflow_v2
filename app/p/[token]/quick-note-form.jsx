'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';

export default function QuickNoteForm({ token }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [people, setPeople] = useState([]);
  const [showCustomEmail, setShowCustomEmail] = useState(false);

  // Fetch people when form opens
  useEffect(() => {
    if (isOpen && people.length === 0) {
      fetch(`/api/projects/${token}/people`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.people) {
            setPeople(data.people);

            // Auto-populate with logged-in user's email if they're in the team
            if (user?.email) {
              const userInTeam = data.people.find(p => p.email.toLowerCase() === user.email.toLowerCase());
              if (userInTeam) {
                setAuthor(userInTeam.email);
              }
            }
          }
        })
        .catch(err => console.error('Failed to fetch people:', err));
    }
  }, [isOpen, token, people.length, user]);

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

          {/* Person Picker */}
          <div>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 500,
              color: '#333',
              marginBottom: 6
            }}>
              Who worked on this? (optional)
            </label>

            {!showCustomEmail ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={author}
                  onChange={e => {
                    if (e.target.value === '__custom__') {
                      setShowCustomEmail(true);
                      setAuthor('');
                    } else {
                      setAuthor(e.target.value);
                    }
                  }}
                  style={{
                    flex: 1,
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
                >
                  <option value="">Select person...</option>
                  {people.map(person => (
                    <option key={person.email} value={person.email}>
                      {person.name} ({person.email})
                    </option>
                  ))}
                  <option value="__custom__">+ Add someone else...</option>
                </select>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="email"
                  value={author}
                  onChange={e => setAuthor(e.target.value)}
                  placeholder="person@company.com"
                  autoFocus
                  style={{
                    flex: 1,
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
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomEmail(false);
                    setAuthor('');
                  }}
                  style={{
                    padding: '8px 12px',
                    fontSize: 13,
                    color: '#666',
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    borderRadius: 3,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
            {author && (
              <div style={{
                fontSize: 12,
                color: '#666',
                marginTop: 6
              }}>
                Evidence will be attributed to {author}
              </div>
            )}
          </div>

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