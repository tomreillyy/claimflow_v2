'use client';
import { Header } from '@/components/Header';
import { ProjectsDashboard } from '@/components/ProjectsDashboard';
import { useAuth } from '@/components/AuthProvider';

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <main style={{
      minHeight: '100vh',
      background: '#ffffff',
      color: '#1a1a1a',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      WebkitFontSmoothing: 'antialiased',
      position: 'relative',
      overflow: 'hidden'
    }}>

      <Header />

      {/* Show dashboard for authenticated users, otherwise show marketing content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 24px', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 18, color: '#666' }}>Loading...</div>
        </div>
      ) : user ? (
        <ProjectsDashboard />
      ) : (
        <>
          {/* Hero */}
          <section style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              maxWidth: 1280,
              margin: '0 auto',
              padding: '96px 24px 112px',
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: 64,
              alignItems: 'center'
            }}>
              <div>
                <h1 style={{
                  fontSize: 56,
                  fontWeight: 600,
                  lineHeight: 1.1,
                  letterSpacing: '-0.025em',
                  color: '#1a1a1a',
                  margin: 0
                }}>
                  R&D evidence collection for Australian tax claims
                </h1>

                <p style={{
                  marginTop: 24,
                  maxWidth: 600,
                  fontSize: 20,
                  lineHeight: 1.6,
                  color: '#666'
                }}>
                  Track R&D work as it happens. Email updates to your project. Export formatted claim packs for the ATO.
                </p>

                <div style={{
                  marginTop: 32
                }}>
                  <a
                    href="/admin/new-project"
                    style={{
                      display: 'inline-block',
                      padding: '12px 24px',
                      fontSize: 16,
                      fontWeight: 500,
                      color: '#fff',
                      background: '#007acc',
                      textDecoration: 'none',
                      borderRadius: 6,
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = '#0066aa';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = '#007acc';
                    }}
                  >
                    Start a project
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Problem → Outcome */}
          <section style={{
            position: 'relative',
            zIndex: 1,
            borderTop: '1px solid #e5e5e5',
            background: '#fafafa'
          }}>
            <div style={{
              maxWidth: 720,
              margin: '0 auto',
              padding: '80px 24px'
            }}>
              <h2 style={{
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: '#1a1a1a',
                lineHeight: 1.3,
                margin: '0 0 16px 0'
              }}>
                Stop reconstructing evidence months after the fact
              </h2>
              <p style={{
                fontSize: 18,
                lineHeight: 1.7,
                color: '#666',
                margin: 0
              }}>
                Most teams dig through git logs and Slack trying to remember what happened. ClaimFlow captures it as you work.
              </p>
            </div>
          </section>

          {/* How it works */}
          <section style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              maxWidth: 720,
              margin: '0 auto',
              padding: '80px 24px'
            }}>
              <h2 style={{
                fontSize: 24,
                fontWeight: 600,
                color: '#1a1a1a',
                margin: '0 0 40px 0'
              }}>
                How it works
              </h2>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 32
              }}>
                <div>
                  <h3 style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: '#1a1a1a',
                    margin: '0 0 8px 0'
                  }}>
                    Email updates to your project
                  </h3>
                  <p style={{
                    fontSize: 16,
                    lineHeight: 1.6,
                    color: '#666',
                    margin: 0
                  }}>
                    Each project gets a unique email address. Send notes about experiments, failures, technical challenges. Attach screenshots and documents.
                  </p>
                </div>

                <div>
                  <h3 style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: '#1a1a1a',
                    margin: '0 0 8px 0'
                  }}>
                    Upload payroll data
                  </h3>
                  <p style={{
                    fontSize: 16,
                    lineHeight: 1.6,
                    color: '#666',
                    margin: 0
                  }}>
                    Import payroll files and ClaimFlow automatically calculates R&D costs by matching people to activities.
                  </p>
                </div>

                <div>
                  <h3 style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: '#1a1a1a',
                    margin: '0 0 8px 0'
                  }}>
                    Export formatted claim packs
                  </h3>
                  <p style={{
                    fontSize: 16,
                    lineHeight: 1.6,
                    color: '#666',
                    margin: 0
                  }}>
                    Generate a complete evidence pack with timeline, cost breakdowns, and technical narratives formatted for ATO submission.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section style={{
            position: 'relative',
            zIndex: 1,
            borderTop: '1px solid #e5e5e5'
          }}>
            <div style={{
              maxWidth: 720,
              margin: '0 auto',
              padding: '80px 24px'
            }}>
              <h2 style={{
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: '#1a1a1a',
                margin: '0 0 16px 0'
              }}>
                Start tracking evidence
              </h2>
              <p style={{
                fontSize: 18,
                lineHeight: 1.6,
                color: '#666',
                margin: '0 0 24px 0'
              }}>
                Create a project and get your unique email address in under a minute.
              </p>
              <a
                href="/admin/new-project"
                style={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  fontSize: 16,
                  fontWeight: 500,
                  color: '#fff',
                  background: '#007acc',
                  textDecoration: 'none',
                  borderRadius: 6,
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#0066aa';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#007acc';
                }}
              >
                Create project
              </a>
            </div>
          </section>

          {/* Footer */}
          <footer style={{
            borderTop: '1px solid #e5e5e5',
            position: 'relative',
            zIndex: 1
          }}>
            <div style={{
              maxWidth: 1280,
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              padding: '40px 24px',
              fontSize: 14,
              color: '#666'
            }}>
              <p style={{ margin: 0 }}>© {new Date().getFullYear()} ClaimFlow. All rights reserved.</p>
            </div>
          </footer>
        </>
      )}
    </main>
  );
}
