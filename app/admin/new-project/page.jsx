'use client';
import { useState } from 'react';

export default function NewProject() {
  const [name, setName] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [participants, setParticipants] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setResult(null);
    const resp = await fetch('/api/admin/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        year: Number(year),
        participants: participants
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
      }),
    });
    const json = await resp.json();
    if (!resp.ok) { setError(json.error || 'Failed'); return; }
    setResult(json);
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
    }}>
      <main style={{
        maxWidth: 480,
        margin: '0 auto',
        padding: '60px 24px',
        lineHeight: 1.5
      }}>
      <header style={{textAlign: 'center', marginBottom: 40}}>
        <h1 style={{
          fontSize: 28,
          fontWeight: 500,
          color: '#1a1a1a',
          margin: 0,
          marginBottom: 8
        }}>Start a new project</h1>
        <p style={{
          fontSize: 16,
          color: '#333',
          margin: 0
        }}>Track your R&D work and build evidence as you go</p>
      </header>

      <form onSubmit={onSubmit} style={{display: 'grid', gap: 20}}>
        <div>
          <label style={{
            display: 'block',
            fontSize: 14,
            fontWeight: 500,
            color: '#333',
            marginBottom: 6
          }}>Project name</label>
          <input
            value={name}
            onChange={e=>setName(e.target.value)}
            required
            placeholder="e.g. Vision model v2"
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: 16,
              border: '1px solid #ddd',
              borderRadius: 6,
              outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box',
              color: '#1a1a1a'
            }}
            onFocus={e => e.target.style.borderColor = '#007acc'}
            onBlur={e => e.target.style.borderColor = '#ddd'}
          />
        </div>

        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>
          <div>
            <label style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 500,
              color: '#333',
              marginBottom: 6
            }}>Year</label>
            <input
              type="number"
              value={year}
              onChange={e=>setYear(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 16,
                border: '1px solid #ddd',
                borderRadius: 6,
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={e => e.target.style.borderColor = '#007acc'}
              onBlur={e => e.target.style.borderColor = '#ddd'}
            />
          </div>
          <div></div>
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: 14,
            fontWeight: 500,
            color: '#333',
            marginBottom: 6
          }}>Team emails</label>
          <input
            value={participants}
            onChange={e=>setParticipants(e.target.value)}
            placeholder="tom@company.com, sara@company.com"
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: 16,
              border: '1px solid #ddd',
              borderRadius: 6,
              outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box',
              color: '#1a1a1a'
            }}
            onFocus={e => e.target.style.borderColor = '#007acc'}
            onBlur={e => e.target.style.borderColor = '#ddd'}
          />
          <p style={{
            fontSize: 13,
            color: '#555',
            margin: '4px 0 0 0'
          }}>Separate multiple emails with commas</p>
        </div>

        <button
          type="submit"
          style={{
            padding: '12px 24px',
            fontSize: 16,
            fontWeight: 500,
            color: 'white',
            backgroundColor: '#007acc',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            marginTop: 8,
            transition: 'background-color 0.2s'
          }}
          onMouseOver={e => e.target.style.backgroundColor = '#005fa3'}
          onMouseOut={e => e.target.style.backgroundColor = '#007acc'}
        >
          Create project
        </button>
      </form>

      {error && (
        <div style={{
          marginTop: 20,
          padding: 12,
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 6,
          fontSize: 14,
          color: '#dc2626'
        }}>{error}</div>
      )}

      {result && (
        <div style={{
          marginTop: 32,
          padding: 20,
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 8
        }}>
          <h3 style={{
            fontSize: 18,
            fontWeight: 500,
            color: '#1a1a1a',
            margin: '0 0 16px 0'
          }}>Your project is ready</h3>

          <div style={{fontSize: 14, lineHeight: 1.6}}>
            <p style={{margin: '0 0 8px 0'}}>
              <strong>Timeline:</strong>{' '}
              <a href={result.timelineUrl} style={{color: '#007acc', textDecoration: 'none'}}>
                {result.timelineUrl}
              </a>
            </p>

            <p style={{margin: '0 0 8px 0'}}>
              <strong>Quick upload:</strong>{' '}
              <a href={result.uploadUrl} style={{color: '#007acc', textDecoration: 'none'}}>
                {result.uploadUrl}
              </a>
            </p>

            <p style={{margin: '0 0 0 0'}}>
              <strong>Email for updates:</strong>{' '}
              <code style={{
                padding: '2px 6px',
                backgroundColor: '#e2e8f0',
                borderRadius: 4,
                fontSize: 13,
                fontFamily: 'Monaco, monospace'
              }}>{result.inboundEmail}</code>
            </p>
          </div>
        </div>
      )}
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