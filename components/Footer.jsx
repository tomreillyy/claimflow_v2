'use client';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const linkStyle = {
    color: 'rgba(255, 255, 255, 0.7)',
    textDecoration: 'none',
    fontSize: 14,
    transition: 'color 0.15s ease'
  };

  return (
    <footer style={{
      background: '#021048',
      color: '#fff',
      padding: '60px 16px 32px'
    }}>
      <div style={{
        maxWidth: 1100,
        margin: '0 auto'
      }}>
        {/* Main footer content */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '40px 32px',
          marginBottom: 48
        }}>
          {/* Brand column */}
          <div style={{ gridColumn: 'span 1' }}>
            <a href="/" style={{ display: 'inline-block', marginBottom: 16 }}>
              <img
                src="/claimflow-white-text-and-icon.png"
                alt="ClaimFlow"
                style={{
                  height: 56,
                  width: 'auto'
                }}
              />
            </a>
            <p style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: 14,
              lineHeight: 1.6,
              margin: 0,
              maxWidth: 240
            }}>
              AI-powered R&D documentation that writes itself. Capture innovation as it happens.
            </p>
          </div>

          {/* Product column */}
          <div>
            <h4 style={{
              fontSize: 13,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'rgba(255, 255, 255, 0.5)',
              marginBottom: 16,
              marginTop: 0
            }}>
              Product
            </h4>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <a href="#how" style={linkStyle} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'rgba(255, 255, 255, 0.7)'}>
                How it works
              </a>
              <a href="#roles" style={linkStyle} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'rgba(255, 255, 255, 0.7)'}>
                For teams
              </a>
              <a href="/pricing" style={linkStyle} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'rgba(255, 255, 255, 0.7)'}>
                Pricing
              </a>
              <a href="/demo" style={linkStyle} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'rgba(255, 255, 255, 0.7)'}>
                Demo
              </a>
            </nav>
          </div>

          {/* Company column */}
          <div>
            <h4 style={{
              fontSize: 13,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'rgba(255, 255, 255, 0.5)',
              marginBottom: 16,
              marginTop: 0
            }}>
              Company
            </h4>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <a href="/blog" style={linkStyle} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'rgba(255, 255, 255, 0.7)'}>
                Blog
              </a>
              <a href="/advisors" style={linkStyle} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'rgba(255, 255, 255, 0.7)'}>
                R&D Advisors
              </a>
              <a href="mailto:hello@aird.io" style={linkStyle} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'rgba(255, 255, 255, 0.7)'}>
                Contact
              </a>
            </nav>
          </div>

          {/* Legal column */}
          <div>
            <h4 style={{
              fontSize: 13,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'rgba(255, 255, 255, 0.5)',
              marginBottom: 16,
              marginTop: 0
            }}>
              Legal
            </h4>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <a href="/privacy" style={linkStyle} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'rgba(255, 255, 255, 0.7)'}>
                Privacy Policy
              </a>
              <a href="/terms" style={linkStyle} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'rgba(255, 255, 255, 0.7)'}>
                Terms of Service
              </a>
            </nav>
          </div>
        </div>

        {/* Divider */}
        <div style={{
          height: 1,
          background: 'rgba(255, 255, 255, 0.1)',
          marginBottom: 24
        }} />

        {/* Bottom bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <p style={{
            margin: 0,
            fontSize: 13,
            color: 'rgba(255, 255, 255, 0.5)'
          }}>
            © {currentYear} ClaimFlow. All rights reserved.
          </p>

          {/* Social links */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <a
              href="https://www.linkedin.com/company/109357134/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'rgba(255, 255, 255, 0.5)',
                transition: 'color 0.15s ease',
                display: 'flex',
                alignItems: 'center'
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'}
              aria-label="LinkedIn"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
