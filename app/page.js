'use client';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { ScrollTimeline } from '@/components/ScrollTimeline';
import { ParallaxRoles } from '@/components/ParallaxRoles';
import { ProjectsDashboard } from '@/components/ProjectsDashboard';
import { Footer } from '@/components/Footer';
import { Spinner } from '@/components/Spinner';
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
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 24px' }}>
            <Spinner />
          </div>
        ) : user ? (
          <DashboardOverview />
        ) : (
          <div className={revealed ? 'reveal' : ''}>
            <Hero />

            {/* How it works */}
            <section style={{
              padding: 'clamp(60px, 15vw, 120px) 16px',
              borderTop: '1px solid var(--line)',
              background: 'var(--bg-soft)'
            }} id="how">
              <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
                <h2 style={{
                  margin: '0 0 12px',
                  fontSize: 'clamp(24px, 5vw, 38px)',
                  fontWeight: 700
                }}>
                  R&D documentation that writes itself.
                </h2>
                <p style={{
                  color: 'var(--muted)',
                  fontSize: 'clamp(15px, 3.5vw, 18px)',
                  marginBottom: 'clamp(40px, 10vw, 80px)'
                }}>
                  Three steps, zero admin.
                </p>

                <ScrollTimeline />
              </div>
            </section>

            {/* For teams */}
            <section style={{
              padding: 'clamp(24px, 6vw, 48px) 16px',
              background: 'var(--bg-soft)',
              borderTop: '1px solid var(--line)'
            }} id="roles">
              <div style={{ maxWidth: 960, margin: '0 auto', textAlign: 'center' }}>
                <h2 style={{
                  margin: '0 0 16px',
                  fontSize: 'clamp(24px, 5vw, 38px)',
                  fontWeight: 700,
                  color: 'var(--ink)'
                }}>
                  Built for the people doing the work.
                </h2>
                <p style={{
                  color: 'var(--muted)',
                  fontSize: 'clamp(15px, 3.5vw, 18px)',
                  marginBottom: 'clamp(40px, 10vw, 80px)',
                  maxWidth: 600,
                  margin: '0 auto clamp(32px, 8vw, 60px)'
                }}>
                  From founders to advisors, AIRD adapts to how real teams build.
                </p>

                <ParallaxRoles />
              </div>
            </section>

            {/* Sign up CTA */}
            <section style={{
              padding: 'clamp(60px, 12vw, 100px) 16px',
              borderTop: '1px solid var(--line)',
              background: 'var(--bg-soft)'
            }} id="signup">
              <div style={{ maxWidth: 896, margin: '0 auto' }}>
                <div className="relative w-full overflow-hidden rounded-[40px] p-6 sm:p-10 md:p-20" style={{ background: '#021048' }}>
                  {/* Decorative circles */}
                  <div className="absolute inset-0 hidden h-full w-full overflow-hidden md:block">
                    <div className="absolute top-1/2 right-[-45%] aspect-square h-[800px] w-[800px] -translate-y-1/2">
                      <div className="absolute inset-0 rounded-full opacity-30" style={{ background: '#0a2060' }}></div>
                      <div className="absolute inset-0 scale-[0.8] rounded-full opacity-30" style={{ background: '#1a3080' }}></div>
                      <div className="absolute inset-0 scale-[0.6] rounded-full opacity-30" style={{ background: '#2a40a0' }}></div>
                      <div className="absolute inset-0 scale-[0.4] rounded-full opacity-30" style={{ background: '#4060c0' }}></div>
                      <div className="absolute inset-0 scale-[0.2] rounded-full opacity-30" style={{ background: '#6080e0' }}></div>
                      <div className="absolute inset-0 scale-[0.1] rounded-full opacity-30" style={{ background: 'rgba(255,255,255,0.5)' }}></div>
                    </div>
                  </div>

                  <div className="relative z-10">
                    <h2 className="mb-3 text-3xl font-bold text-white sm:text-4xl md:mb-4 md:text-5xl">
                      Start documenting your R&D today.
                    </h2>
                    <p className="mb-6 max-w-md text-base text-white/90 sm:text-lg md:mb-8">
                      Free during beta. No credit card required.
                    </p>

                    <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
                      <a href="/auth/login" className="flex w-full items-center justify-between rounded-full bg-white px-5 py-3 text-[#021048] sm:w-[240px] hover:bg-gray-100 transition-colors">
                        <span className="font-medium">Get started</span>
                        <span className="h-5 w-5 flex-shrink-0 rounded-full bg-[#021048]"></span>
                      </a>
                      <a href="/advisors" className="flex w-full items-center justify-between rounded-full bg-white/10 border border-white/20 px-5 py-3 text-white sm:w-[240px] hover:bg-white/20 transition-colors">
                        <span className="font-medium">R&D Advisors</span>
                        <span className="h-5 w-5 flex-shrink-0 rounded-full bg-white"></span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <Footer />
          </div>
        )}
      </main>
    </>
  );
}











