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











