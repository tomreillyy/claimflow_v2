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
      {/* Background decorations */}
      {!user && !loading && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
          {/* Radial glow */}
          <div style={{
            position: 'absolute',
            left: '50%',
            top: '-10%',
            height: 600,
            width: 600,
            transform: 'translateX(-50%)',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0, 122, 204, 0.08), rgba(0, 122, 204, 0.03), transparent 70%)',
            filter: 'blur(60px)'
          }} />
        </div>
      )}

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
                {/* Badge */}
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  borderRadius: 9999,
                  border: '1px solid rgba(0, 122, 204, 0.2)',
                  background: 'rgba(0, 122, 204, 0.05)',
                  padding: '4px 12px',
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#007acc'
                }}>
                  <span style={{
                    display: 'inline-block',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#007acc'
                  }} />
                  Australian R&D Tax • ATO‑ready
                </span>

                <h1 style={{
                  marginTop: 16,
                  fontSize: 60,
                  fontWeight: 600,
                  lineHeight: 1.05,
                  letterSpacing: '-0.03em',
                  color: '#1a1a1a'
                }}>
                  Stop scrambling for R&D evidence at tax time.
                </h1>

                <p style={{
                  marginTop: 20,
                  maxWidth: 640,
                  fontSize: 20,
                  lineHeight: 1.7,
                  color: '#525252'
                }}>
                  Your team is already doing the work. <span style={{ color: '#1a1a1a', fontWeight: 500 }}>ClaimFlow captures the evidence as it happens</span>—from email, quick notes, and uploads—then exports an ATO‑ready pack in minutes.
                </p>

                <div style={{
                  marginTop: 32,
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 12
                }}>
                  <a
                    href="/admin/new-project"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      borderRadius: 16,
                      border: '1px solid #007acc',
                      background: '#007acc',
                      padding: '12px 20px',
                      fontSize: 16,
                      fontWeight: 600,
                      color: '#fff',
                      textDecoration: 'none',
                      boxShadow: '0 4px 16px rgba(0, 122, 204, 0.3)',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = '#0088e6';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 122, 204, 0.4)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = '#007acc';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 122, 204, 0.3)';
                    }}
                  >
                    Start your first project →
                  </a>
                </div>

                <div style={{
                  marginTop: 32,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 24,
                  fontSize: 14,
                  color: '#666'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>🛡️</span> Your data stays in Australia
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>✨</span> Built for founders & engineers
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Problem → Outcome */}
          <section style={{
            position: 'relative',
            zIndex: 1,
            borderTop: '1px solid #e5e5e5',
            borderBottom: '1px solid #e5e5e5',
            background: '#fafafa'
          }}>
            <div style={{
              maxWidth: 768,
              margin: '0 auto',
              padding: '96px 24px 112px'
            }}>
              <p style={{
                fontSize: 19,
                lineHeight: 2,
                color: '#525252',
                margin: 0
              }}>
                Most teams try to reconstruct their R&D work months later—digging through git logs, Slack, and half‑remembered conversations. It's exhausting. Evidence is weak. Claims get underpaid.
              </p>
              <h2 style={{
                marginTop: 24,
                fontSize: 36,
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: '#1a1a1a',
                lineHeight: 1.3
              }}>
                ClaimFlow captures evidence in real‑time, when details are accurate.
              </h2>
            </div>
          </section>

          {/* How it works */}
          <section style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              maxWidth: 1152,
              margin: '0 auto',
              padding: '96px 24px 112px'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: 40
              }}>
                {/* Feature 1 */}
                <div style={{
                  position: 'relative',
                  borderRadius: 16,
                  border: '1px solid #e5e5e5',
                  background: '#fff',
                  padding: 24,
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#007acc';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 122, 204, 0.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = '#e5e5e5';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 16
                  }}>
                    <div style={{
                      marginTop: 4,
                      borderRadius: 12,
                      border: '1px solid #e5e5e5',
                      background: '#f9f9f9',
                      padding: 8,
                      fontSize: 20
                    }}>
                      📧
                    </div>
                    <div>
                      <h3 style={{
                        fontSize: 20,
                        fontWeight: 600,
                        color: '#1a1a1a',
                        margin: 0
                      }}>
                        Send updates as you work
                      </h3>
                      <p style={{
                        marginTop: 8,
                        fontSize: 15,
                        lineHeight: 1.6,
                        color: '#525252',
                        margin: '8px 0 0 0'
                      }}>
                        Email your project's unique address with what you tried, what failed, and what you learned. Everything is timestamped and organized automatically.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Feature 2 */}
                <div style={{
                  position: 'relative',
                  borderRadius: 16,
                  border: '1px solid #e5e5e5',
                  background: '#fff',
                  padding: 24,
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#007acc';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 122, 204, 0.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = '#e5e5e5';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 16
                  }}>
                    <div style={{
                      marginTop: 4,
                      borderRadius: 12,
                      border: '1px solid #e5e5e5',
                      background: '#f9f9f9',
                      padding: 8,
                      fontSize: 20
                    }}>
                      💰
                    </div>
                    <div>
                      <h3 style={{
                        fontSize: 20,
                        fontWeight: 600,
                        color: '#1a1a1a',
                        margin: 0
                      }}>
                        Upload payroll once
                      </h3>
                      <p style={{
                        marginTop: 8,
                        fontSize: 15,
                        lineHeight: 1.6,
                        color: '#525252',
                        margin: '8px 0 0 0'
                      }}>
                        Drop in payroll files and ClaimFlow apportions costs across R&D activities. No more spreadsheet archaeology.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Feature 3 */}
                <div style={{
                  position: 'relative',
                  borderRadius: 16,
                  border: '1px solid #e5e5e5',
                  background: '#fff',
                  padding: 24,
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#007acc';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 122, 204, 0.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = '#e5e5e5';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 16
                  }}>
                    <div style={{
                      marginTop: 4,
                      borderRadius: 12,
                      border: '1px solid #e5e5e5',
                      background: '#f9f9f9',
                      padding: 8,
                      fontSize: 20
                    }}>
                      📄
                    </div>
                    <div>
                      <h3 style={{
                        fontSize: 20,
                        fontWeight: 600,
                        color: '#1a1a1a',
                        margin: 0
                      }}>
                        Export ATO‑ready packs
                      </h3>
                      <p style={{
                        marginTop: 8,
                        fontSize: 15,
                        lineHeight: 1.6,
                        color: '#525252',
                        margin: '8px 0 0 0'
                      }}>
                        At year‑end, export a clean evidence timeline, cost breakdowns, and technical narratives—ready for the Australian R&D Tax Incentive.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              maxWidth: 1024,
              margin: '0 auto',
              padding: '96px 24px 112px',
              textAlign: 'center'
            }}>
              <h2 style={{
                fontSize: 48,
                fontWeight: 600,
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
                color: '#1a1a1a',
                margin: 0
              }}>
                Start building evidence today
              </h2>
              <p style={{
                maxWidth: 640,
                margin: '16px auto 0',
                fontSize: 19,
                lineHeight: 1.7,
                color: '#525252'
              }}>
                Create a project in under a minute. Email your first update. Claim season becomes a non‑event.
              </p>
              <div style={{
                marginTop: 32,
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: 12
              }}>
                <a
                  href="/admin/new-project"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    borderRadius: 16,
                    border: '1px solid #007acc',
                    background: '#007acc',
                    padding: '12px 24px',
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#fff',
                    textDecoration: 'none',
                    boxShadow: '0 4px 16px rgba(0, 122, 204, 0.3)',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#0088e6';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 122, 204, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = '#007acc';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 122, 204, 0.3)';
                  }}
                >
                  Get started →
                </a>
              </div>
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
