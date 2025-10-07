'use client';
import { Header } from '@/components/Header';
import { ProjectsDashboard } from '@/components/ProjectsDashboard';
import { useAuth } from '@/components/AuthProvider';

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <main style={{
      minHeight: '100vh',
      background: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      WebkitFontSmoothing: 'antialiased'
    }}>
      <Header />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 24px' }}>
          <div style={{ fontSize: 18, color: '#666' }}>Loading...</div>
        </div>
      ) : user ? (
        <ProjectsDashboard />
      ) : (
        <>
          {/* Hero */}
          <section style={{
            position: 'relative',
            padding: '120px 24px 100px',
            background: 'linear-gradient(180deg, #fafbfc 0%, #fff 100%)'
          }}>
            {/* Subtle grid pattern */}
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)',
              backgroundSize: '48px 48px',
              opacity: 0.3,
              pointerEvents: 'none'
            }} />

            <div style={{
              maxWidth: 920,
              margin: '0 auto',
              position: 'relative'
            }}>
              {/* Animated accent */}
              <div style={{
                width: 48,
                height: 4,
                background: 'linear-gradient(90deg, #007acc 0%, #00d4ff 100%)',
                borderRadius: 2,
                marginBottom: 32,
                boxShadow: '0 0 20px rgba(0, 122, 204, 0.3)'
              }} />

              <h1 style={{
                fontSize: 68,
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
                color: '#111',
                margin: '0 0 28px 0',
                maxWidth: 800
              }}>
                R&D claims without the chaos
              </h1>

              <p style={{
                fontSize: 24,
                lineHeight: 1.5,
                color: '#555',
                margin: '0 0 48px 0',
                maxWidth: 680
              }}>
                Stop scrambling at year-end. <span style={{ color: '#111', fontWeight: 500 }}>Capture R&D evidence as you work.</span> Email updates, upload costs, export claim packs ready for the ATO.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <a
                  href="/admin/new-project"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '16px 32px',
                    fontSize: 17,
                    fontWeight: 600,
                    color: '#fff',
                    background: 'linear-gradient(135deg, #007acc 0%, #0066aa 100%)',
                    textDecoration: 'none',
                    borderRadius: 8,
                    boxShadow: '0 2px 8px rgba(0, 122, 204, 0.25), inset 0 1px 0 rgba(255,255,255,0.1)',
                    border: '1px solid rgba(0, 122, 204, 0.3)',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 122, 204, 0.35), inset 0 1px 0 rgba(255,255,255,0.1)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 122, 204, 0.25), inset 0 1px 0 rgba(255,255,255,0.1)';
                  }}
                >
                  Start a project
                </a>

                <div style={{ fontSize: 15, color: '#777', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span>Free to start</span>
                  <span style={{ opacity: 0.3 }}>•</span>
                  <span>ATO-ready exports</span>
                </div>
              </div>
            </div>
          </section>

          {/* Visual demo section */}
          <section style={{
            padding: '0 24px 80px',
            maxWidth: 1200,
            margin: '0 auto'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #f8f9fa 0%, #fff 100%)',
              border: '1px solid #e5e7eb',
              borderRadius: 16,
              padding: 48,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04)'
            }}>
              {/* Mock timeline */}
              <div style={{
                background: '#fff',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                padding: 32,
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #007acc 0%, #00d4ff 100%)',
                    boxShadow: '0 0 8px rgba(0, 122, 204, 0.4)'
                  }} />
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>Project Timeline</div>
                  <div style={{ marginLeft: 'auto', fontSize: 13, color: '#777' }}>vector-search-optimization</div>
                </div>

                {[
                  { date: 'Oct 5', title: 'Experimented with quantization approaches', type: 'Experiment' },
                  { date: 'Oct 3', title: 'Performance degradation with high-dimensional vectors', type: 'Observation' },
                  { date: 'Sep 28', title: 'Evaluated HNSW vs IVF indexing methods', type: 'Evaluation' }
                ].map((item, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    gap: 20,
                    padding: '20px 0',
                    borderBottom: i < 2 ? '1px solid #f3f4f6' : 'none'
                  }}>
                    <div style={{
                      minWidth: 60,
                      fontSize: 13,
                      color: '#999',
                      fontFamily: 'ui-monospace, monospace'
                    }}>{item.date}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, color: '#111', marginBottom: 4 }}>{item.title}</div>
                      <div style={{
                        display: 'inline-block',
                        fontSize: 12,
                        color: '#007acc',
                        background: 'rgba(0, 122, 204, 0.08)',
                        padding: '2px 8px',
                        borderRadius: 4
                      }}>{item.type}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{
                marginTop: 20,
                fontSize: 14,
                color: '#666',
                textAlign: 'center'
              }}>
                Evidence timeline auto-generated from emails and notes
              </div>
            </div>
          </section>

          {/* Value props */}
          <section style={{
            padding: '80px 24px',
            background: '#fafbfc',
            borderTop: '1px solid #e5e7eb'
          }}>
            <div style={{
              maxWidth: 920,
              margin: '0 auto'
            }}>
              <h2 style={{
                fontSize: 36,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: '#111',
                margin: '0 0 56px 0',
                textAlign: 'center'
              }}>
                Built for teams doing real R&D work
              </h2>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 40
              }}>
                <div>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #007acc 0%, #0066aa 100%)',
                    marginBottom: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0, 122, 204, 0.2)'
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </div>
                  <h3 style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: '#111',
                    margin: '0 0 12px 0'
                  }}>
                    Email your progress
                  </h3>
                  <p style={{
                    fontSize: 16,
                    lineHeight: 1.6,
                    color: '#666',
                    margin: 0
                  }}>
                    Each project gets a unique inbox. Forward updates from your actual work—experiments, failures, breakthroughs. Attachments included.
                  </p>
                </div>

                <div>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #007acc 0%, #0066aa 100%)',
                    marginBottom: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0, 122, 204, 0.2)'
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                  </div>
                  <h3 style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: '#111',
                    margin: '0 0 12px 0'
                  }}>
                    Import payroll automatically
                  </h3>
                  <p style={{
                    fontSize: 16,
                    lineHeight: 1.6,
                    color: '#666',
                    margin: 0
                  }}>
                    Upload payroll files and ClaimFlow maps costs to R&D activities. No spreadsheet archaeology required.
                  </p>
                </div>

                <div>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #007acc 0%, #0066aa 100%)',
                    marginBottom: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0, 122, 204, 0.2)'
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                  </div>
                  <h3 style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: '#111',
                    margin: '0 0 12px 0'
                  }}>
                    Export ATO-ready packs
                  </h3>
                  <p style={{
                    fontSize: 16,
                    lineHeight: 1.6,
                    color: '#666',
                    margin: 0
                  }}>
                    Generate formatted claim documentation with evidence timeline, cost ledger, and technical narratives. Print to PDF, submit to ATO.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Social proof / trust */}
          <section style={{
            padding: '80px 24px',
            borderTop: '1px solid #e5e7eb'
          }}>
            <div style={{
              maxWidth: 720,
              margin: '0 auto',
              textAlign: 'center'
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 16,
                padding: '12px 24px',
                background: 'rgba(0, 122, 204, 0.05)',
                border: '1px solid rgba(0, 122, 204, 0.1)',
                borderRadius: 8,
                marginBottom: 24
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#007acc" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span style={{ fontSize: 14, color: '#007acc', fontWeight: 500 }}>
                  Your data stays in Australia
                </span>
              </div>

              <h2 style={{
                fontSize: 32,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: '#111',
                margin: '0 0 16px 0'
              }}>
                Designed for Australian R&D Tax Incentive claims
              </h2>

              <p style={{
                fontSize: 18,
                lineHeight: 1.6,
                color: '#666',
                margin: '0 0 40px 0'
              }}>
                Export formats match ATO requirements. Evidence categories align with DSIR guidelines. Built by founders who've filed R&D claims.
              </p>

              <a
                href="/admin/new-project"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '16px 32px',
                  fontSize: 17,
                  fontWeight: 600,
                  color: '#fff',
                  background: 'linear-gradient(135deg, #007acc 0%, #0066aa 100%)',
                  textDecoration: 'none',
                  borderRadius: 8,
                  boxShadow: '0 2px 8px rgba(0, 122, 204, 0.25), inset 0 1px 0 rgba(255,255,255,0.1)',
                  border: '1px solid rgba(0, 122, 204, 0.3)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 122, 204, 0.35), inset 0 1px 0 rgba(255,255,255,0.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 122, 204, 0.25), inset 0 1px 0 rgba(255,255,255,0.1)';
                }}
              >
                Create your first project
              </a>
            </div>
          </section>

          {/* Footer */}
          <footer style={{
            borderTop: '1px solid #e5e7eb',
            padding: '40px 24px',
            textAlign: 'center'
          }}>
            <div style={{
              maxWidth: 920,
              margin: '0 auto',
              fontSize: 14,
              color: '#999'
            }}>
              © {new Date().getFullYear()} ClaimFlow · Australian R&D evidence collection
            </div>
          </footer>
        </>
      )}
    </main>
  );
}
