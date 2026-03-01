'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function LoginContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref');

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [branding, setBranding] = useState(null);

  // Fetch consultant branding if ref param is present
  useEffect(() => {
    if (!ref) return;
    fetch(`/api/consultant/branding/${ref}`)
      .then(res => res.json())
      .then(data => {
        if (data.company_name || data.logo_url) {
          setBranding(data);
        }
      })
      .catch(() => {});
  }, [ref]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to send sign-in link');
      } else {
        setMessage('Check your email for the magic link!');
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const renderLogo = () => {
    if (branding?.logo_url) {
      return (
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img
            src={branding.logo_url}
            alt={branding.company_name || 'Logo'}
            style={{ maxHeight: 80, width: 'auto', objectFit: 'contain' }}
          />
          {branding.company_name && (
            <h2 style={{
              fontSize: 20,
              fontWeight: 600,
              color: '#1a1a1a',
              margin: '12px 0 0',
            }}>
              {branding.company_name}
            </h2>
          )}
        </div>
      );
    }

    if (branding?.company_name) {
      return (
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2 style={{
            fontSize: 24,
            fontWeight: 600,
            color: '#1a1a1a',
            margin: '0 0 8px',
          }}>
            {branding.company_name}
          </h2>
        </div>
      );
    }

    return (
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <a href="/" style={{ textDecoration: 'none', display: 'inline-block' }}>
          <img
            src="/claimflow-logo-full.png"
            alt="ClaimFlow"
            style={{ maxWidth: 260, height: 'auto', width: '100%' }}
          />
        </a>
        <p style={{
          color: '#6b7280',
          fontSize: 15,
          lineHeight: 1.5,
          maxWidth: 320,
          margin: '16px auto 0'
        }}>
          ClaimFlow automatically captures and structures your R&D evidence as you build.
        </p>
      </div>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fff',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <main style={{
        maxWidth: 400,
        margin: '0 auto',
        padding: '80px 24px'
      }}>
        {!message ? (
          <>
            {renderLogo()}

            {/* Card */}
            <div style={{
              background: '#fff',
              borderRadius: 12,
              padding: '32px 24px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <h1 style={{
                fontSize: 20,
                fontWeight: 600,
                color: '#1a1a1a',
                margin: '0 0 24px 0',
                textAlign: 'center'
              }}>
                Sign in to your account
              </h1>

              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{
                    display: 'block',
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#374151',
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
                      padding: '12px 14px',
                      fontSize: 15,
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      outline: 'none',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                      boxSizing: 'border-box',
                      color: '#1a1a1a',
                      backgroundColor: '#fff'
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = '#021048';
                      e.target.style.boxShadow = '0 0 0 3px rgba(2, 16, 72, 0.1)';
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <p style={{
                  fontSize: 13,
                  color: '#6b7280',
                  margin: '0 0 20px 0',
                  lineHeight: 1.5
                }}>
                  No password needed. We'll email you a secure sign-in link.
                </p>

                {error && (
                  <div style={{
                    padding: 12,
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 8,
                    fontSize: 14,
                    color: '#dc2626',
                    marginBottom: 16
                  }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 24px',
                    fontSize: 15,
                    fontWeight: 600,
                    color: 'white',
                    backgroundColor: loading ? '#9ca3af' : '#021048',
                    border: 'none',
                    borderRadius: 8,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={e => {
                    if (!loading) e.target.style.backgroundColor = '#010a2e';
                  }}
                  onMouseOut={e => {
                    if (!loading) e.target.style.backgroundColor = '#021048';
                  }}
                >
                  {loading ? 'Sending...' : 'Sign in'}
                </button>
              </form>
            </div>

            {/* Outside card */}
            {branding ? (
              <p style={{
                textAlign: 'center',
                marginTop: 24,
                fontSize: 12,
                color: '#9ca3af'
              }}>
                Powered by{' '}
                <a
                  href="/"
                  style={{
                    color: '#9ca3af',
                    textDecoration: 'underline',
                    fontWeight: 500
                  }}
                >
                  ClaimFlow
                </a>
              </p>
            ) : (
              <p style={{
                textAlign: 'center',
                marginTop: 24,
                fontSize: 14,
                color: '#6b7280'
              }}>
                Not a member?{' '}
                <a
                  href="/admin/new-project"
                  style={{
                    color: '#021048',
                    textDecoration: 'none',
                    fontWeight: 500
                  }}
                  onMouseOver={e => e.target.style.textDecoration = 'underline'}
                  onMouseOut={e => e.target.style.textDecoration = 'none'}
                >
                  Start a 14 day free trial
                </a>
              </p>
            )}
          </>
        ) : (
          <>
            {/* Logo on success screen */}
            {branding?.logo_url ? (
              <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <img
                  src={branding.logo_url}
                  alt={branding.company_name || 'Logo'}
                  style={{ maxHeight: 80, width: 'auto', objectFit: 'contain' }}
                />
              </div>
            ) : (
              <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <a href="/" style={{ textDecoration: 'none', display: 'inline-block' }}>
                  <img
                    src="/claimflow-logo-full.png"
                    alt="ClaimFlow"
                    style={{ maxWidth: 260, height: 'auto', width: '100%' }}
                  />
                </a>
              </div>
            )}

            {/* Success Card */}
            <div style={{
              background: '#fff',
              borderRadius: 12,
              padding: '40px 24px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              textAlign: 'center'
            }}>
              <div style={{
                width: 56,
                height: 56,
                margin: '0 auto 20px',
                backgroundColor: '#ecfdf5',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <h1 style={{
                fontSize: 22,
                fontWeight: 600,
                color: '#1a1a1a',
                margin: '0 0 12px 0'
              }}>
                Check your email
              </h1>
              <p style={{
                fontSize: 15,
                color: '#4b5563',
                margin: '0 0 8px 0',
                lineHeight: 1.6
              }}>
                We sent a magic link to
              </p>
              <p style={{
                fontSize: 15,
                fontWeight: 600,
                color: '#1a1a1a',
                margin: '0 0 20px 0'
              }}>
                {email}
              </p>
              <p style={{
                fontSize: 14,
                color: '#6b7280',
                margin: 0
              }}>
                Click the link in the email to sign in.
              </p>
            </div>

            {/* Outside card */}
            {branding ? (
              <p style={{
                textAlign: 'center',
                marginTop: 24,
                fontSize: 12,
                color: '#9ca3af'
              }}>
                Powered by{' '}
                <a
                  href="/"
                  style={{
                    color: '#9ca3af',
                    textDecoration: 'underline',
                    fontWeight: 500
                  }}
                >
                  ClaimFlow
                </a>
              </p>
            ) : (
              <p style={{
                textAlign: 'center',
                marginTop: 24,
                fontSize: 14,
                color: '#6b7280'
              }}>
                <a
                  href="/"
                  style={{
                    color: '#021048',
                    textDecoration: 'none',
                    fontWeight: 500
                  }}
                  onMouseOver={e => e.target.style.textDecoration = 'underline'}
                  onMouseOut={e => e.target.style.textDecoration = 'none'}
                >
                  ← Back to home
                </a>
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <p style={{ color: '#6b7280' }}>Loading...</p>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
