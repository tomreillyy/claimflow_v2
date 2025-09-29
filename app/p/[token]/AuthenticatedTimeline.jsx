'use client';
import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { Header } from '@/components/Header';
import QuickNoteForm from './quick-note-form';

export function AuthenticatedTimeline({ project, items, token }) {
  const { user, loading } = useAuth();
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [authError, setAuthError] = useState('');
  const [email, setEmail] = useState('');

  const handleJoinProject = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    setAuthMessage('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?project_token=${token}`,
        },
      });

      if (error) {
        setAuthError(error.message);
      } else {
        setAuthMessage('Check your email for the magic link to join this project!');
      }
    } catch (error) {
      setAuthError('An unexpected error occurred');
    } finally {
      setAuthLoading(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'white',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
      }}>
        <Header projectName={project.name} projectToken={token} />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh'
        }}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'white',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
      }}>
        <Header projectName={project.name} />

        <main style={{
          maxWidth: 500,
          margin: '0 auto',
          padding: '60px 24px'
        }}>
          <div style={{
            backgroundColor: '#f8f9fa',
            borderRadius: 12,
            padding: 32,
            marginBottom: 32,
            border: '1px solid #e5e5e5',
            textAlign: 'center'
          }}>
            <h1 style={{
              fontSize: 24,
              fontWeight: 600,
              color: '#1a1a1a',
              margin: '0 0 16px 0'
            }}>Join {project.name}</h1>

            <p style={{
              fontSize: 16,
              color: '#333',
              margin: '0 0 24px 0',
              lineHeight: 1.5
            }}>
              You've been invited to view this R&D project timeline. Enter your email to get instant access.
            </p>

            <form onSubmit={handleJoinProject}>
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
                disabled={authLoading}
                style={{
                  width: '100%',
                  padding: '12px 24px',
                  fontSize: 16,
                  fontWeight: 500,
                  color: 'white',
                  backgroundColor: authLoading ? '#ccc' : '#007acc',
                  border: 'none',
                  borderRadius: 8,
                  cursor: authLoading ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                {authLoading ? 'Sending magic link...' : 'Join project'}
              </button>
            </form>

            {authMessage && (
              <div style={{
                marginTop: 20,
                padding: 16,
                backgroundColor: '#f0f9ff',
                border: '1px solid #bfdbfe',
                borderRadius: 8,
                fontSize: 14,
                color: '#1e40af'
              }}>
                {authMessage}
              </div>
            )}

            {authError && (
              <div style={{
                marginTop: 20,
                padding: 16,
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 8,
                fontSize: 14,
                color: '#dc2626'
              }}>
                {authError}
              </div>
            )}
          </div>

          <div style={{
            textAlign: 'center',
            fontSize: 14,
            color: '#666'
          }}>
            <p style={{ margin: 0 }}>
              No password needed. We'll send you a secure link that gives you instant access.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Show the authenticated timeline
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
    }}>
      <Header projectName={project.name} projectToken={token} />

      <main style={{
        maxWidth: 1000,
        margin: '0 auto',
        padding: '40px 24px'
      }}>
        {/* Project Header */}
        <div style={{
          backgroundColor: '#f8f9fa',
          borderRadius: 12,
          padding: 32,
          marginBottom: 32,
          border: '1px solid #e5e5e5'
        }}>
          <h1 style={{
            fontSize: 32,
            fontWeight: 600,
            color: '#1a1a1a',
            margin: '0 0 8px 0'
          }}>{project.name}</h1>

          <p style={{
            fontSize: 16,
            color: '#333',
            margin: '0 0 24px 0'
          }}>Evidence timeline for {project.year}</p>

          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: 16
          }}>
            <p style={{
              fontSize: 14,
              color: '#333',
              margin: '0 0 4px 0',
              fontWeight: 500
            }}>Send updates via email:</p>
            <code style={{
              fontSize: 14,
              backgroundColor: '#e2e8f0',
              padding: '4px 8px',
              borderRadius: 4,
              fontFamily: 'Monaco, monospace',
              color: '#1a1a1a'
            }}>
              {project.inbound_email_local}@{process.env.NEXT_PUBLIC_INBOUND_DOMAIN}
            </code>
          </div>
        </div>

        {/* Quick Note Form */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: 12,
          padding: 32,
          marginBottom: 32,
          border: '1px solid #e5e5e5'
        }}>
          <h2 style={{
            fontSize: 20,
            fontWeight: 600,
            color: '#1a1a1a',
            margin: '0 0 16px 0'
          }}>Add quick note</h2>
          <QuickNoteForm token={token} />
        </div>

        {/* Timeline content */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: 12,
          border: '1px solid #e5e5e5',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '24px 32px',
            borderBottom: '1px solid #e5e5e5'
          }}>
            <h2 style={{
              fontSize: 20,
              fontWeight: 600,
              color: '#1a1a1a',
              margin: 0
            }}>Evidence Timeline</h2>
          </div>

          {items && items.length > 0 ? (
            <div>
              {items.map((ev, index) => (
                <div
                  key={ev.id}
                  style={{
                    padding: 24,
                    borderBottom: index < items.length - 1 ? '1px solid #f0f0f0' : 'none'
                  }}
                >
                  <div style={{
                    fontSize: 13,
                    color: '#555',
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    <span>{new Date(ev.created_at).toLocaleDateString()}</span>
                    <span style={{color: '#ddd'}}>•</span>
                    <span>{new Date(ev.created_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
                    {ev.author_email && (
                      <>
                        <span style={{color: '#ddd'}}>•</span>
                        <span>{ev.author_email}</span>
                      </>
                    )}
                  </div>

                  {ev.content && (
                    <p style={{
                      fontSize: 15,
                      color: '#333',
                      lineHeight: 1.5,
                      margin: '0 0 12px 0',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {ev.content}
                    </p>
                  )}

                  {ev.file_url && (
                    <a
                      href={ev.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        color: '#007acc',
                        textDecoration: 'none',
                        fontSize: 14,
                        fontWeight: 500,
                        padding: '6px 12px',
                        backgroundColor: '#f0f9ff',
                        borderRadius: 6,
                        border: '1px solid #e0f2fe'
                      }}
                    >
                      📎 View attachment
                    </a>
                  )}

                  {ev.category && (
                    <span style={{
                      display: 'inline-block',
                      fontSize: 12,
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      padding: '4px 8px',
                      borderRadius: 4,
                      marginTop: 8,
                      fontWeight: 500
                    }}>
                      {ev.category}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              padding: 60,
              textAlign: 'center',
              color: '#555'
            }}>
              <p style={{
                fontSize: 16,
                margin: '0 0 8px 0'
              }}>No evidence yet</p>
              <p style={{
                fontSize: 14,
                margin: 0
              }}>Add your first note or email updates to get started</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}