'use client';
import { useState, use } from 'react';

export default function Upload({ params }) {
  const { token } = use(params);
  const [file, setFile] = useState(null);
  const [author, setAuthor] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!file) return;
    setSaving(true); setErr('');
    const fd = new FormData();
    fd.append('file', file);
    if (author) fd.append('author_email', author);
    const res = await fetch(`/api/evidence/${token}/upload`, { method: 'POST', body: fd });
    if (!res.ok) { setErr('Upload failed'); setSaving(false); return; }
    window.location.href = `/p/${token}`;
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e5e5',
        padding: '16px 0'
      }}>
        <div style={{
          maxWidth: 1000,
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <a href="/" style={{
              display: 'inline-flex',
              alignItems: 'center',
              textDecoration: 'none',
              marginRight: 12
            }}>
              <img
                src="/Aird Logo.png"
                alt="Aird"
                style={{
                  height: 28,
                  width: 'auto'
                }}
              />
            </a>
            <span style={{color: '#333'}}>→</span>
            <a href={`/p/${token}`} style={{
              marginLeft: 12,
              color: '#333',
              textDecoration: 'none'
            }}>Back to timeline</a>
          </div>
        </div>
      </header>

      <main style={{
        maxWidth: 600,
        margin: '60px auto',
        padding: '0 24px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: 12,
          padding: 40,
          border: '1px solid #e5e5e5'
        }}>
          <div style={{textAlign: 'center', marginBottom: 32}}>
            <h1 style={{
              fontSize: 28,
              fontWeight: 600,
              color: '#1a1a1a',
              margin: '0 0 8px 0'
            }}>Upload evidence</h1>
            <p style={{
              fontSize: 16,
              color: '#333',
              margin: 0
            }}>Add screenshots, logs, or documents to your project</p>
          </div>

          <form onSubmit={submit} style={{display: 'grid', gap: 24}}>
            {/* File Upload Area */}
            <div style={{
              border: '2px dashed #ddd',
              borderRadius: 12,
              padding: 40,
              textAlign: 'center',
              backgroundColor: '#fafafa',
              transition: 'border-color 0.2s'
            }}>
              <div style={{marginBottom: 16}}>
                <div style={{
                  fontSize: 32,
                  marginBottom: 8
                }}>📎</div>
                <p style={{
                  fontSize: 16,
                  color: '#333',
                  margin: '0 0 12px 0'
                }}>
                  {file ? file.name : 'Choose a file to upload'}
                </p>
                <p style={{
                  fontSize: 14,
                  color: '#555',
                  margin: 0
                }}>
                  Screenshots, PDFs, logs, or any other evidence
                </p>
              </div>

              <input
                type="file"
                onChange={e=>setFile(e.target.files?.[0]||null)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: 14,
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  color: '#1a1a1a'
                }}
              />
            </div>

            {/* Author Email */}
            <div>
              <label style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 500,
                color: '#333',
                marginBottom: 6
              }}>Your email (optional)</label>
              <input
                placeholder="john@company.com"
                value={author}
                onChange={e=>setAuthor(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: 15,
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  outline: 'none',
                  boxSizing: 'border-box',
                  color: '#1a1a1a'
                }}
                onFocus={e => e.target.style.borderColor = '#007acc'}
                onBlur={e => e.target.style.borderColor = '#ddd'}
              />
            </div>

            {/* Submit Button */}
            <div style={{display: 'flex', gap: 12, justifyContent: 'flex-end'}}>
              <a
                href={`/p/${token}`}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'white',
                  color: '#333',
                  textDecoration: 'none',
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 500,
                  border: '1px solid #ddd'
                }}
              >
                Cancel
              </a>
              <button
                disabled={saving || !file}
                type="submit"
                style={{
                  padding: '12px 24px',
                  backgroundColor: (saving || !file) ? '#ccc' : '#007acc',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 500,
                  cursor: (saving || !file) ? 'default' : 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                {saving ? 'Uploading...' : 'Upload file'}
              </button>
            </div>
          </form>

          {err && (
            <div style={{
              marginTop: 20,
              padding: 12,
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 8,
              fontSize: 14,
              color: '#dc2626'
            }}>
              {err}
            </div>
          )}
        </div>
      </main>

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
    </div>
  );
}