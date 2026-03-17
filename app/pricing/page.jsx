'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../landing.module.css';

const features = [
  'Unlimited projects',
  'Unlimited team members',
  'AI-generated claim pack sections',
  'Evidence capture & organization',
  'GitHub integration',
  'Export to PDF and Word',
  'Professional R&D narratives',
  'Priority support'
];

const faqs = [
  {
    question: "What can I do before committing?",
    answer: "You can sign up, create projects, add team members, capture evidence, and use AI to classify your R&D activities — all for free. You only pay when you're ready to generate and export your claim pack."
  },
  {
    question: "How does pricing work?",
    answer: "We tailor pricing to your practice size and needs. Get in touch and we'll walk you through the options — no obligation."
  },
  {
    question: "Is my data secure?",
    answer: "Absolutely. All data is encrypted in transit and at rest, with Australian data residency. We use bank-level security to protect your R&D documentation."
  }
];

const BOOK_DEMO_URL = '#'; // TODO: Replace with Calendly URL

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
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

      {/* HERO */}
      <section className={styles.hero} style={{ minHeight: 'auto' }}>
        <div className={styles['hero-inner']} style={{ gridTemplateColumns: '1fr', textAlign: 'center', maxWidth: 800, margin: '0 auto', padding: '140px 48px 80px' }}>
          <div>
            <h1 style={{ maxWidth: 'none' }}>Pricing that fits your practice</h1>
            <p className={styles['hero-sub']} style={{ maxWidth: 520, margin: '0 auto' }}>
              We work with advisory firms of all sizes. Get in touch and we&apos;ll tailor a plan to your needs.
            </p>
          </div>
        </div>
      </section>

      {/* PRICING CARD */}
      <section style={{
        background: 'var(--cream)',
        padding: '80px 24px'
      }}>
        <div style={{
          maxWidth: 440,
          margin: '0 auto',
          background: 'var(--white)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '40px 32px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          textAlign: 'center'
        }}>
          <h3 style={{
            fontFamily: 'var(--serif)',
            fontSize: '1.4rem',
            fontWeight: 400,
            color: 'var(--text-dark)',
            marginBottom: 8
          }}>
            ClaimFlow Pro
          </h3>
          <p style={{
            fontSize: '0.95rem',
            color: 'var(--text-mid)',
            marginBottom: 28,
            lineHeight: 1.6
          }}>
            Everything you need to build defensible R&D claim packs
          </p>

          <a
            href="mailto:hello@aird.io?subject=ClaimFlow pricing enquiry"
            className={styles['btn-primary']}
            style={{
              width: '100%',
              display: 'block',
              marginBottom: 12
            }}
          >
            Get in Touch
          </a>
          <a
            href={BOOK_DEMO_URL}
            className={styles['btn-ghost']}
            style={{
              width: '100%',
              display: 'block',
              marginBottom: 28,
              color: 'var(--text-dark)',
              borderColor: 'var(--border)'
            }}
          >
            Book a Demo
          </a>

          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            textAlign: 'left',
            borderTop: '1px solid var(--border)',
            paddingTop: 20
          }}>
            {features.map((feature, i) => (
              <li key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontSize: '0.92rem',
                color: 'var(--text-dark)',
                padding: '8px 0'
              }}>
                <span style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: 'rgba(44,82,130,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '0.65rem',
                  color: 'var(--accent)'
                }}>&#10003;</span>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className={styles.faq}>
        <div className={styles['faq-inner']}>
          <div className={styles['faq-header']}>
            <div className={styles['faq-eyebrow']}>Questions</div>
            <h2>Frequently asked</h2>
          </div>

          <div>
            {faqs.map((item, i) => (
              <div
                key={i}
                className={`${styles['faq-item']} ${openFaq === i ? styles['faq-item-open'] : ''}`}
              >
                <button className={styles['faq-question']} onClick={() => toggleFaq(i)}>
                  <span>{item.question}</span>
                  <span className={styles['faq-toggle']}>
                    <svg
                      viewBox="0 0 14 14"
                      fill="none"
                      stroke="#2C5282"
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
                  className={styles['faq-answer']}
                  style={{ maxHeight: openFaq === i ? 200 : 0 }}
                >
                  <div className={styles['faq-answer-inner']}>
                    {item.answer}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className={styles['final-cta']}>
        <div>
          <h2>Ready to get started?</h2>
          <p>
            Join advisory firms using ClaimFlow to build stronger,
            more defensible claims with less manual effort.
          </p>
          <div className={styles['final-cta-buttons']}>
            <a href="mailto:hello@aird.io?subject=ClaimFlow pricing enquiry" className={styles['btn-primary']}>
              Get in Touch
            </a>
            <a href={BOOK_DEMO_URL} className={styles['btn-ghost']}>Book Demo</a>
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
