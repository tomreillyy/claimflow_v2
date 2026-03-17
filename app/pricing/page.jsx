'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import styles from '../landing.module.css';

const faqs = [
  {
    question: "Do I need to commit to a long-term contract?",
    answer: "No. ClaimFlow is month-to-month."
  },
  {
    question: "Can I try it with one client first?",
    answer: "Yes. Most firms start with a single client engagement to see how it fits their workflow."
  },
  {
    question: "What integrations are included?",
    answer: "GitHub, Jira, and Slack — all included. No add-on fees."
  },
  {
    question: "How long does setup take?",
    answer: "Most firms are capturing evidence within a week of onboarding."
  }
];

const BOOK_DEMO_URL = 'mailto:tom@getclaimflow.com?subject=ClaimFlow Demo Request&body=Hi Tom,%0D%0A%0D%0AI\'d like to book a demo of ClaimFlow.%0D%0A%0D%0AName: %0D%0AFirm: %0D%0ANumber of clients: %0D%0A%0D%0AThanks';

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const faqRefs = useRef([]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleFaq = (index) => {
    if (openFaq === index) {
      setOpenFaq(null);
    } else {
      setOpenFaq(index);
      requestAnimationFrame(() => {
        const el = faqRefs.current[index];
        if (el) {
          el.style.maxHeight = el.scrollHeight + 'px';
        }
      });
    }
  };

  return (
    <div className={styles.landingRoot}>

      {/* NAV */}
      <nav className={`${styles['site-nav']} ${scrolled ? styles['site-nav-scrolled'] : ''}`}>
        <Link href="/" className={styles['nav-logo']}>
          <img src="/landing/logo-white.png" alt="ClaimFlow" />
        </Link>
        <div className={styles['nav-center']}>
          <Link href="/">Home</Link>
          <Link href="/#how">Features</Link>
          <Link href="/pricing">Pricing</Link>
          <a href={BOOK_DEMO_URL}>Book Demo</a>
        </div>
        <div className={styles['nav-right']}>
          <Link href="/auth/login" className={styles['nav-login']}>Login</Link>
          <a href={BOOK_DEMO_URL} className={styles['nav-cta']}>Book Demo</a>
        </div>
      </nav>

      {/* PRICING */}
      <section style={{
        background: 'radial-gradient(ellipse at 20% 50%, rgba(30,60,114,0.3) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(30,60,114,0.15) 0%, transparent 50%), linear-gradient(180deg, #0a1628 0%, #0f1d33 100%)',
        paddingTop: 72,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Main pricing block */}
        <div style={{
          maxWidth: 680,
          margin: '0 auto',
          padding: '140px 48px 80px',
          textAlign: 'center',
          flex: '0 0 auto'
        }}>
          <h1 style={{
            fontFamily: "'Manrope', var(--sans)",
            fontSize: 'clamp(2.4rem, 4.5vw, 3.8rem)',
            lineHeight: 1.05,
            letterSpacing: '-0.045em',
            fontWeight: 800,
            color: 'var(--white)',
            marginBottom: 24
          }}>
            Simple pricing that<br />fits your firm.
          </h1>
          <p style={{
            fontSize: '1.08rem',
            color: 'var(--text-muted-dark)',
            lineHeight: 1.75,
            maxWidth: 520,
            margin: '0 auto 40px'
          }}>
            Every firm is different. We&apos;ll put together a plan based on how you work and how many clients you manage. No lock-in contracts, no per-seat fees.
          </p>
          <a
            href={BOOK_DEMO_URL}
            className={styles['btn-primary']}
          >
            Book a Demo
          </a>
          <p style={{
            fontSize: '0.88rem',
            color: 'var(--text-muted-dark)',
            marginTop: 20,
            opacity: 0.7
          }}>
            Most firms are set up and running within a week.
          </p>
        </div>

        {/* FAQ */}
        <div style={{
          maxWidth: 700,
          margin: '0 auto',
          padding: '80px 48px 140px',
          width: '100%'
        }}>
          <div style={{
            marginBottom: 48
          }}>
            <div style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--accent-muted)',
              marginBottom: 20
            }}>
              Questions
            </div>
            <h2 style={{
              fontFamily: 'var(--serif)',
              fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)',
              fontWeight: 400,
              lineHeight: 1.2,
              color: 'var(--white)'
            }}>
              Frequently asked
            </h2>
          </div>

          <div>
            {faqs.map((item, i) => (
              <div
                key={i}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.08)'
                }}
              >
                <button
                  onClick={() => toggleFaq(i)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    padding: '28px 0',
                    fontSize: '1.02rem',
                    fontWeight: 600,
                    color: 'var(--text-on-dark)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    gap: 16,
                    fontFamily: 'var(--sans)'
                  }}
                >
                  <span>{item.question}</span>
                  <span style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <svg
                      viewBox="0 0 14 14"
                      fill="none"
                      stroke="var(--accent-muted)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      style={{
                        width: 14,
                        height: 14,
                        transition: 'transform .3s',
                        transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0deg)'
                      }}
                    >
                      <line x1="7" y1="1" x2="7" y2="13" />
                      <line x1="1" y1="7" x2="13" y2="7" />
                    </svg>
                  </span>
                </button>
                <div
                  ref={(el) => { faqRefs.current[i] = el; }}
                  style={{
                    maxHeight: openFaq === i ? (faqRefs.current[i]?.scrollHeight || 200) + 'px' : '0px',
                    overflow: 'hidden',
                    transition: 'max-height .35s ease'
                  }}
                >
                  <div style={{
                    paddingBottom: 28,
                    fontSize: '0.98rem',
                    lineHeight: 1.8,
                    color: 'var(--text-muted-dark)'
                  }}>
                    {item.answer}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles['site-footer']}>
        <div className={styles['footer-inner']}>
          <div className={styles['footer-grid']}>
            <div>
              <div className={styles['footer-brand']}>
                <img src="/landing/logo-white.png" alt="ClaimFlow" />
              </div>
              <p className={styles['footer-tagline']}>
                Smarter R&D claim substantiation for advisory practices.
                Built for Australian R&D Tax Incentive claims.
              </p>
            </div>
            <div>
              <div className={styles['footer-col-title']}>Product</div>
              <ul className={styles['footer-links']}>
                <li><Link href="/#how">How it works</Link></li>
                <li><Link href="/#how">Features</Link></li>
                <li><Link href="/pricing">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <div className={styles['footer-col-title']}>Company</div>
              <ul className={styles['footer-links']}>
                <li><Link href="/advisors">Advisors</Link></li>
                <li><Link href="/blog">Blog</Link></li>
                <li><a href="mailto:hello@aird.io">Contact</a></li>
              </ul>
            </div>
            <div>
              <div className={styles['footer-col-title']}>Legal</div>
              <ul className={styles['footer-links']}>
                <li><Link href="/privacy">Privacy</Link></li>
              </ul>
            </div>
          </div>
          <div className={styles['footer-bottom']}>
            &copy; 2026 ClaimFlow. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
