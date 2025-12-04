'use client';
import { Header } from '@/components/Header';

export default function AdvisorsPage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
      color: 'var(--ink)'
    }}>
      <Header />

      {/* Hero */}
      <section style={{
        background: 'linear-gradient(180deg, #021048 0%, #0a1a5c 60%, #1a2a6c 100%)',
        padding: '160px 24px 100px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          pointerEvents: 'none'
        }} />

        <div style={{
          maxWidth: 800,
          margin: '0 auto',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{
            display: 'inline-block',
            padding: '6px 14px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.8)',
            marginBottom: 24
          }}>
            For R&D Tax Advisors
          </div>

          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 48px)',
            margin: '0 0 20px',
            lineHeight: 1.15,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: '#fff'
          }}>
            Deliver stronger claims, faster
          </h1>

          <p style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: 18,
            maxWidth: 600,
            margin: '0 auto 40px',
            lineHeight: 1.7
          }}>
            AIRD helps R&D advisors standardise documentation, eliminate reconstruction, and deliver audit-ready claim packs at scale. Work smarter with your clients, not harder.
          </p>

          <a
            href="#contact"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '16px 32px',
              borderRadius: 8,
              background: '#fff',
              color: '#021048',
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: 16,
              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Partner with AIRD
          </a>
        </div>
      </section>

      {/* Value Props */}
      <section style={{
        padding: '100px 24px',
        borderBottom: '1px solid var(--line)'
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(24px, 4vw, 36px)',
            fontWeight: 700,
            textAlign: 'center',
            margin: '0 0 16px'
          }}>
            Why advisors choose AIRD
          </h2>
          <p style={{
            color: 'var(--muted)',
            fontSize: 17,
            textAlign: 'center',
            maxWidth: 600,
            margin: '0 auto 60px'
          }}>
            Spend less time chasing evidence and more time adding strategic value.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 32
          }}>
            <div style={{
              padding: 32,
              background: 'var(--bg-soft)',
              borderRadius: 12,
              border: '1px solid var(--line)'
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 10,
                background: 'var(--brand)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <h3 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 600 }}>
                Client folders
              </h3>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: 15, lineHeight: 1.6 }}>
                Each client gets a dedicated workspace. Evidence flows in automatically via email, GitHub sync, or direct upload. No more chasing documents.
              </p>
            </div>

            <div style={{
              padding: 32,
              background: 'var(--bg-soft)',
              borderRadius: 12,
              border: '1px solid var(--line)'
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 10,
                background: 'var(--brand)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M3 9h18M9 21V9"/>
                </svg>
              </div>
              <h3 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 600 }}>
                Advisor dashboard
              </h3>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: 15, lineHeight: 1.6 }}>
                Manage all your clients from one place. Track documentation progress, review AI classifications, and export claim packs when ready.
              </p>
            </div>

            <div style={{
              padding: 32,
              background: 'var(--bg-soft)',
              borderRadius: 12,
              border: '1px solid var(--line)'
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 10,
                background: 'var(--brand)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </div>
              <h3 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 600 }}>
                Audit-ready exports
              </h3>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: 15, lineHeight: 1.6 }}>
                Generate structured claim packs with sources, timestamps, and classifications. Everything your clients need for submission or ATO review.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Whitelabel */}
      <section style={{
        padding: '100px 24px',
        background: 'var(--bg-soft)',
        borderBottom: '1px solid var(--line)'
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 60,
            alignItems: 'center'
          }}>
            <div>
              <div style={{
                display: 'inline-block',
                padding: '6px 12px',
                background: 'var(--brand)',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                color: '#fff',
                marginBottom: 20,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Whitelabel Available
              </div>
              <h2 style={{
                fontSize: 'clamp(24px, 4vw, 32px)',
                fontWeight: 700,
                margin: '0 0 16px'
              }}>
                Your brand, our technology
              </h2>
              <p style={{
                color: 'var(--muted)',
                fontSize: 16,
                lineHeight: 1.7,
                margin: '0 0 24px'
              }}>
                Offer AIRD to your clients under your own brand. We handle the infrastructure, AI, and compliance — you deliver the value and maintain your client relationships.
              </p>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}>
                {['Custom branding & domain', 'Your logo on exports', 'Direct client onboarding', 'Dedicated support'].map((item, i) => (
                  <li key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 15,
                    color: 'var(--ink)'
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div style={{
              background: '#fff',
              borderRadius: 12,
              padding: 32,
              border: '1px solid var(--line)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 24,
                paddingBottom: 24,
                borderBottom: '1px solid var(--line)'
              }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: 'var(--line)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--muted)'
                }}>
                  YB
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>Your Brand</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>R&D Tax Portal</div>
                </div>
              </div>
              <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 8 }}>Client Projects</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['Acme Corp - FY2024', 'TechStart Pty Ltd', 'Innovation Labs'].map((client, i) => (
                  <div key={i} style={{
                    padding: '12px 16px',
                    background: 'var(--bg-soft)',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 500
                  }}>
                    {client}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section style={{
        padding: '100px 24px',
        borderBottom: '1px solid var(--line)'
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(24px, 4vw, 36px)',
            fontWeight: 700,
            textAlign: 'center',
            margin: '0 0 16px'
          }}>
            Flexible pricing for advisors
          </h2>
          <p style={{
            color: 'var(--muted)',
            fontSize: 17,
            textAlign: 'center',
            maxWidth: 600,
            margin: '0 auto 60px'
          }}>
            Choose the model that works for your practice.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 24
          }}>
            {/* Volume Pricing */}
            <div style={{
              padding: 32,
              background: '#fff',
              borderRadius: 12,
              border: '1px solid var(--line)'
            }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 600 }}>
                Volume pricing
              </h3>
              <p style={{ margin: '0 0 24px', color: 'var(--muted)', fontSize: 14 }}>
                For firms with multiple clients
              </p>
              <div style={{
                fontSize: 36,
                fontWeight: 700,
                marginBottom: 8,
                color: 'var(--brand)'
              }}>
                Custom
              </div>
              <p style={{ margin: '0 0 24px', color: 'var(--muted)', fontSize: 14 }}>
                Per-client pricing with volume discounts
              </p>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 10
              }}>
                {['Tiered pricing structure', 'Unlimited team members', 'Priority support', 'Quarterly reviews'].map((item, i) => (
                  <li key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 14,
                    color: 'var(--ink)'
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Revenue Share */}
            <div style={{
              padding: 32,
              background: 'var(--brand)',
              borderRadius: 12,
              color: '#fff',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: -12,
                right: 24,
                padding: '4px 12px',
                background: '#fff',
                color: 'var(--brand)',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600
              }}>
                Popular
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 600 }}>
                Revenue share
              </h3>
              <p style={{ margin: '0 0 24px', opacity: 0.8, fontSize: 14 }}>
                Align incentives, share success
              </p>
              <div style={{
                fontSize: 36,
                fontWeight: 700,
                marginBottom: 8
              }}>
                5%
              </div>
              <p style={{ margin: '0 0 24px', opacity: 0.8, fontSize: 14 }}>
                Of your fee on AIRD-supported claims
              </p>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 10
              }}>
                {['No upfront costs', 'Pay only on success', 'Full platform access', 'Whitelabel included'].map((item, i) => (
                  <li key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 14
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Whitelabel */}
            <div style={{
              padding: 32,
              background: '#fff',
              borderRadius: 12,
              border: '1px solid var(--line)'
            }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 600 }}>
                Full whitelabel
              </h3>
              <p style={{ margin: '0 0 24px', color: 'var(--muted)', fontSize: 14 }}>
                Your brand, complete control
              </p>
              <div style={{
                fontSize: 36,
                fontWeight: 700,
                marginBottom: 8,
                color: 'var(--brand)'
              }}>
                Enterprise
              </div>
              <p style={{ margin: '0 0 24px', color: 'var(--muted)', fontSize: 14 }}>
                Annual licensing + revenue share
              </p>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 10
              }}>
                {['Custom domain & branding', 'API access', 'Dedicated success manager', 'Custom integrations'].map((item, i) => (
                  <li key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 14,
                    color: 'var(--ink)'
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section style={{
        padding: '100px 24px',
        background: 'var(--bg-soft)'
      }} id="contact">
        <div style={{
          maxWidth: 500,
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <h2 style={{
            fontSize: 'clamp(24px, 4vw, 32px)',
            fontWeight: 700,
            margin: '0 0 16px'
          }}>
            Let's talk
          </h2>
          <p style={{
            color: 'var(--muted)',
            fontSize: 16,
            lineHeight: 1.7,
            margin: '0 0 32px'
          }}>
            Whether you're exploring a partnership or ready to get started, we'd love to hear from you.
          </p>

          <a
            href="mailto:partners@aird.com.au"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '16px 32px',
              borderRadius: 8,
              background: 'var(--brand)',
              color: '#fff',
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: 16,
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
            }}
          >
            Contact partnerships
          </a>

          <p style={{
            marginTop: 20,
            fontSize: 14,
            color: 'var(--muted)'
          }}>
            Or email us directly at{' '}
            <a href="mailto:partners@aird.com.au" style={{ color: 'var(--brand)', textDecoration: 'none' }}>
              partners@aird.com.au
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
          <div>&copy; {new Date().getFullYear()} aird</div>
          <div style={{ display: 'flex', gap: 14 }}>
            <a href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Home</a>
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy</a>
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Terms</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
