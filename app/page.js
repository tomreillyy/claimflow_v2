'use client';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { ScrollTimeline } from '@/components/ScrollTimeline';
import { ParallaxRoles } from '@/components/ParallaxRoles';
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
              padding: '120px 24px',
              borderTop: '1px solid var(--line)',
              background: 'var(--bg-soft)'
            }} id="how">
              <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
                <h2 style={{
                  margin: '0 0 12px',
                  fontSize: 'clamp(26px, 4vw, 38px)',
                  fontWeight: 700
                }}>
                  R&D documentation that writes itself.
                </h2>
                <p style={{
                  color: 'var(--muted)',
                  fontSize: 18,
                  marginBottom: 80
                }}>
                  Three steps, zero admin.
                </p>

                <ScrollTimeline />
              </div>
            </section>

            {/* Integrations */}
            <section style={{
              padding: '60px 24px',
              borderTop: '1px solid var(--line)',
              background: 'var(--bg)'
            }}>
              <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
                <p style={{
                  color: 'var(--muted)',
                  fontSize: 13,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 24
                }}>
                  Integrates with
                </p>
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 48,
                  flexWrap: 'wrap'
                }}>
                  {/* GitHub */}
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      textDecoration: 'none',
                      color: 'var(--muted)',
                      transition: 'color 0.2s ease',
                      filter: 'grayscale(1)',
                      opacity: 0.6
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.filter = 'grayscale(0)';
                      e.currentTarget.style.opacity = '1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.filter = 'grayscale(1)';
                      e.currentTarget.style.opacity = '0.6';
                    }}
                  >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>GitHub</span>
                  </a>

                  {/* Placeholder for future integrations */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: 'var(--muted)',
                    opacity: 0.3,
                    fontSize: 15,
                    fontWeight: 600
                  }}>
                    More coming soon
                  </div>
                </div>
              </div>
            </section>

            {/* For teams */}
            <section style={{
              padding: '120px 24px',
              borderTop: '1px solid var(--line)',
              position: 'relative',
              overflow: 'hidden'
            }} id="roles">
              <div style={{ maxWidth: 960, margin: '0 auto', textAlign: 'center' }}>
                <h2 style={{
                  margin: '0 0 16px',
                  fontSize: 'clamp(26px, 4vw, 38px)',
                  fontWeight: 700
                }}>
                  Built for the people doing the work.
                </h2>
                <p style={{
                  color: 'var(--muted)',
                  fontSize: 18,
                  marginBottom: 80,
                  maxWidth: 600,
                  margin: '0 auto 80px'
                }}>
                  From founders to advisors, AIRD adapts to how real teams build.
                </p>

                <ParallaxRoles />
              </div>
            </section>

            {/* Sign up */}
            <section style={{
              padding: '100px 24px',
              borderTop: '1px solid var(--line)',
              background: 'var(--bg-soft)'
            }} id="signup">
              <div style={{ maxWidth: 620, margin: '0 auto', textAlign: 'center' }}>
                <h2 style={{
                  margin: '0 0 16px',
                  fontSize: 'clamp(28px, 4vw, 42px)',
                  fontWeight: 700,
                  letterSpacing: '-0.02em'
                }}>
                  Start documenting your R&D today
                </h2>
                <p style={{
                  color: 'var(--muted)',
                  fontSize: 18,
                  marginBottom: 32,
                  lineHeight: 1.6
                }}>
                  Free during beta. No credit card required.
                </p>

                <a href="/admin/new-project" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '16px 32px',
                  borderRadius: 'var(--radius)',
                  background: 'var(--brand)',
                  color: '#fff',
                  fontWeight: 600,
                  textDecoration: 'none',
                  border: '1px solid var(--brand)',
                  fontSize: 17,
                  boxShadow: '0 4px 12px rgba(2,16,72,0.25)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(2,16,72,0.35)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(2,16,72,0.25)';
                }}>
                  Start a project
                </a>
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











