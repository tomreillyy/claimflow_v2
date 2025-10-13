'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage('Check your email for the magic link!');
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
    }}>
      <main style={{
        maxWidth: 400,
        margin: '0 auto',
        padding: '80px 24px',
        textAlign: 'center'
      }}>
        <header style={{ marginBottom: 40 }}>
          <h1 style={{
            fontSize: 28,
            fontWeight: 600,
            color: '#1a1a1a',
            margin: '0 0 8px 0'
          }}>
            Sign in to Aird
          </h1>
          <p style={{
            fontSize: 16,
            color: '#333',
            margin: 0
          }}>
            We'll send you a magic link to sign in
          </p>
        </header>

        <form onSubmit={handleLogin} style={{ marginBottom: 32 }}>
          <div style={{ marginBottom: 20, textAlign: 'left' }}>
            <label style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 500,
              color: '#333',
              marginBottom: 6
            }}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: 16,
                border: '1px solid #ddd',
                borderRadius: 8,
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
                color: '#1a1a1a',
                backgroundColor: 'white'
              }}
              onFocus={e => e.target.style.borderColor = '#007acc'}
              onBlur={e => e.target.style.borderColor = '#ddd'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 24px',
              fontSize: 16,
              fontWeight: 500,
              color: 'white',
              backgroundColor: loading ? '#ccc' : '#007acc',
              border: 'none',
              borderRadius: 8,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={e => {
              if (!loading) e.target.style.backgroundColor = '#005fa3';
            }}
            onMouseOut={e => {
              if (!loading) e.target.style.backgroundColor = '#007acc';
            }}
          >
            {loading ? 'Sending magic link...' : 'Send magic link'}
          </button>
        </form>

        {message && (
          <div style={{
            padding: 16,
            backgroundColor: '#f0f9ff',
            border: '1px solid #bfdbfe',
            borderRadius: 8,
            fontSize: 14,
            color: '#1e40af',
            marginBottom: 20
          }}>
            {message}
          </div>
        )}

        {error && (
          <div style={{
            padding: 16,
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            fontSize: 14,
            color: '#dc2626',
            marginBottom: 20
          }}>
            {error}
          </div>
        )}

        <div style={{
          fontSize: 14,
          color: '#666',
          lineHeight: 1.5
        }}>
          <p style={{ margin: '0 0 8px 0' }}>
            No password needed. We'll send you a secure link that signs you in instantly.
          </p>
          <p style={{ margin: 0 }}>
            <a href="/" style={{ color: '#007acc', textDecoration: 'none' }}>
              ← Back to home
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}