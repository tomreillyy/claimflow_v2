'use client';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { ProjectsDashboard } from '@/components/ProjectsDashboard';
import { useAuth } from '@/components/AuthProvider';
import { useEffect, useState } from 'react';

export default function Home() {
  const { user, loading } = useAuth();
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setRevealed(true));
  }, []);

  return (
    <>
      <style jsx global>{`
        :root {
          --ink: #0f1222;
          --muted: #5b6374;
          --line: #e6e8ee;
          --brand: #021048;
          --bg: #ffffff;
          --bg-soft: #fafbff;
          --radius: 12px;
          --hl-bg: rgba(2,16,72,0.18);
        }

        .highlight {
          position: relative;
          box-decoration-break: clone;
          -webkit-box-decoration-break: clone;
          padding: 0 0.12em;
          background-image: linear-gradient(to top, var(--hl-bg), var(--hl-bg));
          background-repeat: no-repeat;
          background-size: 100% 0;
          background-position: 0 88%;
          transition: background-size 0.7s cubic-bezier(0.2, 0.7, 0.2, 1);
        }

        .reveal .highlight {
          background-size: 100% 0.6em;
        }

        @media (prefers-reduced-motion: reduce) {
          .highlight {
            transition: none;
            background-size: 100% 0.6em;
          }
        }
      `}</style>

      <main style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
        color: 'var(--ink)'
      }}>
        <Header />

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ fontSize: 18, color: 'var(--muted)' }}>Loading...</div>
          </div>
        ) : user ? (
          <ProjectsDashboard />
        ) : (
          <div className={revealed ? 'reveal' : ''}>
            <Hero />

            {/* How it works */}
            <section style={{
              padding: '80px 24px',
              borderTop: '1px solid var(--line)'
            }} id="how">
              <div style={{ maxWidth: 960, margin: '0 auto' }}>
                <h2 style={{
                  margin: '0 0 12px',
                  fontSize: 'clamp(22px, 3.8vw, 34px)',
                  fontWeight: 700
                }}>
                  How Aird works
                </h2>
                <p style={{
                  color: 'var(--muted)',
                  maxWidth: 620,
                  marginBottom: 32
                }}>
                  Three honest steps. Thoughtful by design.
                </p>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: 16
                }}>
                  <div style={{
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius)',
                    padding: 18,
                    background: 'var(--bg-soft)'
                  }}>
                    <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600 }}>
                      1) Send updates
                    </h3>
                    <p style={{ margin: 0, color: 'var(--muted)', fontSize: 15, lineHeight: 1.6 }}>
                      Each project gets a unique address. Forward emails, upload files, or drop notes — Aird captures them automatically.
                    </p>
                  </div>

                  <div style={{
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius)',
                    padding: 18,
                    background: 'var(--bg-soft)'
                  }}>
                    <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600 }}>
                      2) We organize the evidence
                    </h3>
                    <p style={{ margin: 0, color: 'var(--muted)', fontSize: 15, lineHeight: 1.6 }}>
                      Aird classifies by Hypothesis, Experiment, Observation, or Evaluation — and keeps a clear, chronological record.
                    </p>
                  </div>

                  <div style={{
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius)',
                    padding: 18,
                    background: 'var(--bg-soft)'
                  }}>
                    <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600 }}>
                      3) Export when ready
                    </h3>
                    <p style={{ margin: 0, color: 'var(--muted)', fontSize: 15, lineHeight: 1.6 }}>
                      Generate clean, advisor-ready claim packs with sources, timestamps, and context intact.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* For teams */}
            <section style={{
              padding: '80px 24px',
              borderTop: '1px solid var(--line)'
            }} id="roles">
              <div style={{ maxWidth: 960, margin: '0 auto' }}>
                <h2 style={{
                  margin: '0 0 32px',
                  fontSize: 'clamp(22px, 3.8vw, 34px)',
                  fontWeight: 700
                }}>
                  Made for real teams
                </h2>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: 16
                }}>
                  <div style={{
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius)',
                    padding: 18,
                    background: 'var(--bg-soft)'
                  }}>
                    <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600 }}>
                      For founders
                    </h3>
                    <p style={{ margin: 0, color: 'var(--muted)', fontSize: 15, lineHeight: 1.6 }}>
                      Skip the admin. Capture as you go. Get claims out faster.
                    </p>
                  </div>

                  <div style={{
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius)',
                    padding: 18,
                    background: 'var(--bg-soft)'
                  }}>
                    <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600 }}>
                      For product & R&D
                    </h3>
                    <p style={{ margin: 0, color: 'var(--muted)', fontSize: 15, lineHeight: 1.6 }}>
                      Turn weekly updates into traceable, compliant documentation.
                    </p>
                  </div>

                  <div style={{
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius)',
                    padding: 18,
                    background: 'var(--bg-soft)'
                  }}>
                    <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600 }}>
                      For finance & advisors
                    </h3>
                    <p style={{ margin: 0, color: 'var(--muted)', fontSize: 15, lineHeight: 1.6 }}>
                      Access audit-ready data without digging through files or threads.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Pricing */}
            <section style={{
              padding: '80px 24px',
              borderTop: '1px solid var(--line)'
            }} id="pricing">
              <div style={{ maxWidth: 960, margin: '0 auto' }}>
                <h2 style={{
                  margin: '0 0 12px',
                  fontSize: 'clamp(22px, 3.8vw, 34px)',
                  fontWeight: 700
                }}>
                  Simple pricing
                </h2>
                <p style={{
                  color: 'var(--muted)',
                  maxWidth: 620,
                  marginBottom: 32
                }}>
                  Start free, upgrade when your workflow depends on it.
                </p>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: 16
                }}>
                  <div style={{
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius)',
                    padding: 24,
                    background: 'var(--bg-soft)'
                  }}>
                    <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700 }}>Free</h3>
                    <p style={{ margin: '0 0 20px', color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>
                      1 project · 100 evidence items · PDF export
                    </p>
                    <a href="/admin/new-project" style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '10px 18px',
                      borderRadius: 'var(--radius)',
                      background: 'var(--brand)',
                      color: '#fff',
                      fontWeight: 600,
                      textDecoration: 'none',
                      border: '1px solid var(--brand)',
                      fontSize: 14
                    }}>
                      Sign up free
                    </a>
                  </div>

                  <div style={{
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius)',
                    padding: 24,
                    background: 'var(--bg-soft)'
                  }}>
                    <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700 }}>Pro</h3>
                    <p style={{ margin: '0 0 20px', color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>
                      Unlimited projects · team access · CSV + attachments
                    </p>
                    <a href="/admin/new-project" style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '10px 18px',
                      borderRadius: 'var(--radius)',
                      background: 'var(--brand)',
                      color: '#fff',
                      fontWeight: 600,
                      textDecoration: 'none',
                      border: '1px solid var(--brand)',
                      fontSize: 14
                    }}>
                      Get Pro
                    </a>
                  </div>

                  <div style={{
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius)',
                    padding: 24,
                    background: 'var(--bg-soft)'
                  }}>
                    <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700 }}>Advisor</h3>
                    <p style={{ margin: '0 0 20px', color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>
                      Multi-client workspaces · bulk exports · white-label
                    </p>
                    <a href="/admin/new-project" style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '10px 18px',
                      borderRadius: 'var(--radius)',
                      background: 'var(--brand)',
                      color: '#fff',
                      fontWeight: 600,
                      textDecoration: 'none',
                      border: '1px solid var(--brand)',
                      fontSize: 14
                    }}>
                      Contact us
                    </a>
                  </div>
                </div>
              </div>
            </section>

            {/* Sign up */}
            <section style={{
              padding: '80px 24px',
              borderTop: '1px solid var(--line)'
            }} id="signup">
              <div style={{ maxWidth: 620, margin: '0 auto' }}>
                <h2 style={{
                  margin: '0 0 12px',
                  fontSize: 'clamp(22px, 3.8vw, 34px)',
                  fontWeight: 700
                }}>
                  Join early access
                </h2>
                <p style={{
                  color: 'var(--muted)',
                  marginBottom: 28
                }}>
                  Be the first to use Aird and shape how R&D documentation should work. No spam, ever.
                </p>

                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 10
                }}>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    style={{
                      padding: '10px 14px',
                      border: '1px solid var(--line)',
                      borderRadius: 'var(--radius)',
                      flex: '1',
                      minWidth: 220,
                      fontSize: 15,
                      fontFamily: 'inherit'
                    }}
                  />
                  <a href="/admin/new-project" style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '10px 18px',
                    borderRadius: 'var(--radius)',
                    background: 'var(--brand)',
                    color: '#fff',
                    fontWeight: 600,
                    textDecoration: 'none',
                    border: '1px solid var(--brand)',
                    fontSize: 14
                  }}>
                    Sign up
                  </a>
                </div>
              </div>
            </section>

            {/* Footer */}
            <footer style={{
              borderTop: '1px solid var(--line)',
              color: 'var(--muted)',
              fontSize: 13,
              padding: '32px 24px'
            }}>
              <div style={{
                maxWidth: 960,
                margin: '0 auto',
                display: 'flex',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12
              }}>
                <div>© {new Date().getFullYear()} aird</div>
                <div style={{ display: 'flex', gap: 14 }}>
                  <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy</a>
                  <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Terms</a>
                  <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Contact</a>
                </div>
              </div>
            </footer>
          </div>
        )}
      </main>
    </>
  );
}











