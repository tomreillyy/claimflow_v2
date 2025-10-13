'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Header } from '@/components/Header';

export default function NewProject() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [hypothesis, setHypothesis] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [participants, setParticipants] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!user) {
      setError('You must be signed in to create a project');
      return;
    }

    // Validate hypothesis length
    const trimmedHypothesis = hypothesis.trim();
    if (trimmedHypothesis.length > 280) {
      setError('Hypothesis must be 280 characters or less');
      return;
    }

    // Get the current session to access the access token
    const { data: { session } } = await supabase.auth.getSession();

    const resp = await fetch('/api/admin/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      },
      body: JSON.stringify({
        name,
        current_hypothesis: trimmedHypothesis || null,
        year: Number(year),
        participants: participants
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
        owner_email: user.email,
      }),
    });
    const json = await resp.json();
    if (!resp.ok) { setError(json.error || 'Failed'); return; }
    setResult(json);

    // Redirect to dashboard after a brief delay to show success
    setTimeout(() => {
      router.push('/');
    }, 2000);
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'white',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
    }}>
      <Header />
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
            onFocus={e => e.target.style.borderColor = '#021048'}
            onBlur={e => e.target.style.borderColor = '#ddd'}
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: 14,
            fontWeight: 500,
            color: '#333',
            marginBottom: 6
          }}>Project hypothesis (one sentence)</label>
          <input
            value={hypothesis}
            onChange={e=>setHypothesis(e.target.value)}
            placeholder="If we <approach> under <conditions>, we expect <measurable outcome> because <technical reason>."
            maxLength={280}
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
            onFocus={e => e.target.style.borderColor = '#021048'}
            onBlur={e => e.target.style.borderColor = '#ddd'}
          />
          <p style={{
            fontSize: 13,
            color: '#555',
            margin: '4px 0 0 0'
          }}>Technical and testable (not a business goal). 35 words max.</p>
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
            <select
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
                boxSizing: 'border-box',
                color: '#1a1a1a',
                backgroundColor: 'white'
              }}
              onFocus={e => e.target.style.borderColor = '#021048'}
              onBlur={e => e.target.style.borderColor = '#ddd'}
            >
              {Array.from({length: 10}, (_, i) => {
                const yearOption = new Date().getFullYear() - i;
                return <option key={yearOption} value={yearOption}>{yearOption}</option>
              })}
            </select>
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
              color: '#1a1a1a',
              backgroundColor: 'white'
            }}
            onFocus={e => e.target.style.borderColor = '#021048'}
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
            backgroundColor: '#021048',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            marginTop: 8,
            transition: 'background-color 0.2s'
          }}
          onMouseOver={e => e.target.style.backgroundColor = '#010a2e'}
          onMouseOut={e => e.target.style.backgroundColor = '#021048'}
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
              <a href={result.timelineUrl} style={{color: '#021048', textDecoration: 'none', fontWeight: 500}}>
                {result.timelineUrl}
              </a>
            </p>

            <p style={{margin: '0 0 8px 0'}}>
              <strong>Quick upload:</strong>{' '}
              <a href={result.uploadUrl} style={{color: '#021048', textDecoration: 'none', fontWeight: 500}}>
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
                fontFamily: 'Monaco, monospace',
                color: '#1a1a1a'
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