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

            {/* For teams */}
            <section style={{
              padding: '120px 24px',
              background: 'linear-gradient(180deg, #021048 0%, #0a1a5c 60%, #1a2a6c 100%)',
              position: 'relative',
              overflow: 'hidden'
            }} id="roles">
              {/* Subtle grid overlay */}
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
                backgroundSize: '32px 32px',
                pointerEvents: 'none'
              }} />

              <div style={{ maxWidth: 960, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
                <h2 style={{
                  margin: '0 0 16px',
                  fontSize: 'clamp(26px, 4vw, 38px)',
                  fontWeight: 700,
                  color: '#fff'
                }}>
                  Built for the people doing the work.
                </h2>
                <p style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 18,
                  marginBottom: 80,
                  maxWidth: 600,
                  margin: '0 auto 60px'
                }}>
                  From founders to advisors, AIRD adapts to how real teams build.
                </p>

                <ParallaxRoles />
              </div>
            </section>

            {/* Sign up CTA */}
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

                <p style={{
                  marginTop: 24,
                  fontSize: 14,
                  color: 'var(--muted)'
                }}>
                  Are you an R&D advisor?{' '}
                  <a href="/advisors" style={{
                    color: 'var(--brand)',
                    textDecoration: 'none',
                    fontWeight: 500
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.textDecoration = 'none';
                  }}>
                    Learn about partnerships →
                  </a>
                </p>
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
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <a href="https://www.linkedin.com/company/109357134/" target="_blank" rel="noopener noreferrer" style={{
                    color: 'inherit',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                    </svg>
                    LinkedIn
                  </a>
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











