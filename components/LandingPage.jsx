'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import styles from '../app/landing.module.css';

const BOOK_DEMO_URL = '#'; // TODO: Replace with Calendly URL

const faqData = [
  {
    question: "How does ClaimFlow connect to my clients' tools?",
    answer: "ClaimFlow integrates with popular engineering platforms including GitHub, Jira, and project management tools. You invite your client to connect their workspace, and evidence begins flowing in automatically. Setup typically takes under ten minutes per client."
  },
  {
    question: "What evidence does ClaimFlow capture?",
    answer: "Code commits, pull requests, project tickets, test results, technical decisions, and experiment logs. Everything is timestamped and traced back to its source, giving you contemporaneous evidence rather than after-the-fact narratives."
  },
  {
    question: "How does this help with AusIndustry reviews?",
    answer: "ClaimFlow creates a structured, contemporaneous evidence trail that directly addresses what reviewers look for: proof that R&D activities occurred, when they occurred, and how they relate to eligible activities. No more scrambling to reconstruct evidence after the fact."
  },
  {
    question: "Can I manage multiple clients in one account?",
    answer: "Yes. ClaimFlow is designed for advisory practices. You can manage your entire client portfolio from a single dashboard, with each client's evidence kept separate and secure. Scale your practice without scaling your documentation workload."
  },
  {
    question: "Is my clients' data secure?",
    answer: "Absolutely. All data is encrypted in transit and at rest, with Australian data residency. Access controls ensure only authorised team members can view each client's evidence. We take data security as seriously as you take client confidentiality."
  },
  {
    question: "How is this different from a shared drive?",
    answer: "A shared drive stores files. ClaimFlow automatically captures evidence from engineering tools, maps it to R&D activities using AI, and structures it into a claim-ready format. It's the difference between a filing cabinet and an organised, searchable evidence system."
  }
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [revealed, setRevealed] = useState(new Set());
  const faqRefs = useRef([]);
  const revealRefs = useRef({});

  // Nav scroll effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll reveal observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.dataset.revealId;
            if (id) {
              const parent = entry.target.parentElement;
              let delay = 0;
              if (parent) {
                const siblings = Array.from(parent.children).filter(el =>
                  el.dataset.revealId !== undefined
                );
                const index = siblings.indexOf(entry.target);
                delay = index * 80;
              }
              setTimeout(() => {
                setRevealed(prev => new Set(prev).add(id));
              }, delay);
            }
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    Object.values(revealRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const setRevealRef = useCallback((id) => (el) => {
    if (el) revealRefs.current[id] = el;
  }, []);

  const revealClass = useCallback((id) => {
    return `${styles.reveal} ${revealed.has(id) ? styles['reveal-visible'] : ''}`;
  }, [revealed]);

  const toggleFaq = (index) => {
    if (openFaq === index) {
      setOpenFaq(null);
    } else {
      setOpenFaq(index);
      // Force re-measure after state update so scrollHeight is accurate
      requestAnimationFrame(() => {
        const el = faqRefs.current[index];
        if (el) {
          el.style.maxHeight = el.scrollHeight + 'px';
        }
      });
    }
  };

  const scrollToSection = (e, id) => {
    e.preventDefault();
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className={styles.landingRoot}>

      {/* ═══════════════ NAV ═══════════════ */}
      <nav className={`${styles['site-nav']} ${scrolled ? styles['site-nav-scrolled'] : ''}`}>
        <Link href="/" className={styles['nav-logo']}>
          <img src="/landing/logo-white.png" alt="ClaimFlow" />
        </Link>
        <div className={styles['nav-center']}>
          <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Home</a>
          <a href="#how" onClick={(e) => scrollToSection(e, 'how')}>Features</a>
          <Link href="/pricing">Pricing</Link>
          <a href={BOOK_DEMO_URL}>Book Demo</a>
        </div>
        <div className={styles['nav-right']}>
          <Link href="/auth/login" className={styles['nav-login']}>Login</Link>
          <a href={BOOK_DEMO_URL} className={styles['nav-cta']}>Book Demo</a>
        </div>
      </nav>


      {/* ═══════════════ HERO ═══════════════ */}
      <section className={styles.hero}>
        <div className={styles['hero-inner']}>
          <div className={styles['hero-copy']}>
            <h1>Every R&D claim you<br />prepare by hand<br />is margin you&apos;re leaving behind.</h1>
            <p className={styles['hero-sub']}>
              ClaimFlow auto-captures R&D evidence from your clients&apos; dev tools and structures it against RDTI criteria. Prepare more claims without growing your team.
            </p>
            <div className={styles['hero-ctas']}>
              <a href={BOOK_DEMO_URL} className={styles['btn-primary']}>Book Demo</a>
            </div>
          </div>
          <div className={styles['hero-visual']}>
            <img src="/landing/hero.png" alt="ClaimFlow dashboard" className={styles['hero-img']} />
          </div>
        </div>
      </section>


      {/* ═══════════════ INTEGRATIONS STRIP ═══════════════ */}
      <section className={styles['integrations-strip']}>
        <div className={styles['integrations-inner']}>
          <span className={styles['integrations-label']}>Integrates with</span>
          <div className={styles['integrations-icons']}>
            <div className={styles['integration-pill']}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              GitHub
            </div>
            <div className={styles['integration-pill']}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M11.53 2C6.066 2 2 6.066 2 11.53c0 5.464 4.066 9.53 9.53 9.53 5.464 0 9.53-4.066 9.53-9.53C21.06 6.066 16.994 2 11.53 2zM8.895 16.312c0 .262-.212.474-.474.474H6.158a.474.474 0 01-.474-.474V9.158c0-.262.212-.474.474-.474h2.263c.262 0 .474.212.474.474v7.154zm4.737 0c0 .262-.212.474-.474.474h-2.263a.474.474 0 01-.474-.474V7.632c0-.262.212-.474.474-.474h2.263c.262 0 .474.212.474.474v8.68zm4.737 0c0 .262-.212.474-.474.474h-2.263a.474.474 0 01-.474-.474v-5.417c0-.262.212-.474.474-.474h2.263c.262 0 .474.212.474.474v5.417z"/></svg>
              Jira
            </div>
            <div className={styles['integration-pill']}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M4.845 2.1L.378 6.57a.75.75 0 00.53 1.28h2.34l3.55 9.77a.75.75 0 00.7.48h8.99a.75.75 0 00.7-.48l3.55-9.77h2.34a.75.75 0 00.53-1.28L19.155 2.1a.75.75 0 00-.53-.22H5.375a.75.75 0 00-.53.22zM12 14.4a2.4 2.4 0 110-4.8 2.4 2.4 0 010 4.8z"/></svg>
              GitLab
            </div>
            <div className={styles['integration-pill']}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15H9v-2h2v2zm0-4H9V7h2v6zm4 4h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
              Bitbucket
            </div>
          </div>
        </div>
      </section>


      {/* ═══════════════ THE PROBLEM ═══════════════ */}
      <section className={styles.problem}>
        <div className={`${styles['problem-inner']} ${revealClass('problem')}`} data-reveal-id="problem" ref={setRevealRef('problem')}>
          <div className={styles['problem-eyebrow']}>The reality today</div>
          <h2>The documentation problem<br />every advisor knows</h2>
          <p className={styles['problem-text']}>
            Your clients do genuinely innovative work. But come claim time, the
            evidence is scattered across inboxes, Slack threads, and half-remembered
            conversations. You&apos;re left reconstructing a technical narrative months
            after the work happened. And hoping it holds up under review.
          </p>
        </div>
      </section>


      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section className={styles.how} id="how">
        <div className={`${styles['how-header']} ${revealClass('how-header')}`} data-reveal-id="how-header" ref={setRevealRef('how-header')}>
          <div className={styles['how-eyebrow']}>How it works</div>
          <h2>R&D documentation,<br />captured as it happens</h2>
          <p className={styles['how-subtitle']}>Three steps, zero admin.</p>
        </div>

        <div className={styles['how-steps']}>
          {/* Step 1 */}
          <div className={`${styles['how-step']} ${revealClass('step1')}`} data-reveal-id="step1" ref={setRevealRef('step1')}>
            <div className={styles['step-copy']}>
              <div className={styles['step-number']}>1</div>
              <div className={styles['step-title']}>Connect your client&apos;s tools</div>
              <p className={styles['step-desc']}>
                Link your client&apos;s GitHub, Jira, or other engineering tools to
                ClaimFlow. Setup takes minutes. From that point on, their R&D
                work is captured automatically as they go about their day.
              </p>
            </div>
            <div className={`${styles['step-visual']} ${styles['step-visual-integrations']}`}>
              <div className={styles['integrations-grid-visual']}>
                <div className={styles['integration-card']}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="#24292f"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                  <span className={styles['integration-card-name']}>GitHub</span>
                </div>
                <div className={styles['integration-card']}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="#2684FF"><path d="M11.53 2C6.066 2 2 6.066 2 11.53c0 5.464 4.066 9.53 9.53 9.53 5.464 0 9.53-4.066 9.53-9.53C21.06 6.066 16.994 2 11.53 2zM8.895 16.312c0 .262-.212.474-.474.474H6.158a.474.474 0 01-.474-.474V9.158c0-.262.212-.474.474-.474h2.263c.262 0 .474.212.474.474v7.154zm4.737 0c0 .262-.212.474-.474.474h-2.263a.474.474 0 01-.474-.474V7.632c0-.262.212-.474.474-.474h2.263c.262 0 .474.212.474.474v8.68zm4.737 0c0 .262-.212.474-.474.474h-2.263a.474.474 0 01-.474-.474v-5.417c0-.262.212-.474.474-.474h2.263c.262 0 .474.212.474.474v5.417z"/></svg>
                  <span className={styles['integration-card-name']}>Jira</span>
                </div>
                <div className={styles['integration-card']}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="#FC6D26"><path d="M4.845 2.1L.378 6.57a.75.75 0 00.53 1.28h2.34l3.55 9.77a.75.75 0 00.7.48h8.99a.75.75 0 00.7-.48l3.55-9.77h2.34a.75.75 0 00.53-1.28L19.155 2.1a.75.75 0 00-.53-.22H5.375a.75.75 0 00-.53.22zM12 14.4a2.4 2.4 0 110-4.8 2.4 2.4 0 010 4.8z"/></svg>
                  <span className={styles['integration-card-name']}>GitLab</span>
                </div>
                <div className={styles['integration-card']}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="#2684FF"><path d="M2.65 3C1.74 3 1 3.74 1 4.65v14.7C1 20.26 1.74 21 2.65 21h14.7c.91 0 1.65-.74 1.65-1.65V17h-2v2H3V5h14v2h2V4.65C19 3.74 18.26 3 17.35 3H2.65zM14 8l-1.41 1.41L15.17 12H7v2h8.17l-2.58 2.59L14 18l5-5-5-5z"/></svg>
                  <span className={styles['integration-card-name']}>Bitbucket</span>
                </div>
                <div className={styles['integration-card']}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="#4A154B"><path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.165 0a2.528 2.528 0 012.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.165 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52h6.313A2.527 2.527 0 0124 15.165a2.528 2.528 0 01-2.522 2.523h-6.313z"/></svg>
                  <span className={styles['integration-card-name']}>Slack</span>
                </div>
                <div className={`${styles['integration-card']} ${styles['integration-card-more']}`}>
                  <span className={styles['integration-card-plus']}>+</span>
                  <span className={styles['integration-card-name']}>More</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className={`${styles['how-step']} ${styles['how-step-reversed']} ${revealClass('step2')}`} data-reveal-id="step2" ref={setRevealRef('step2')}>
            <div className={styles['step-copy']}>
              <div className={styles['step-number']}>2</div>
              <div className={styles['step-title']}>Evidence is structured automatically</div>
              <p className={styles['step-desc']}>
                ClaimFlow uses specialised AI to classify each piece of technical
                work against RDTI criteria, mapping it to the right activities and
                categories. You get a clear, chronological evidence trail without
                chasing a single email.
              </p>
            </div>
            <div className={`${styles['step-visual']} ${styles['step-visual-img']}`}>
              <img src="/landing/evidence-dashboard.png" alt="ClaimFlow evidence dashboard showing classified R&D activities" className={styles['step-screenshot']} />
            </div>
          </div>

          {/* Step 3 */}
          <div className={`${styles['how-step']} ${revealClass('step3')}`} data-reveal-id="step3" ref={setRevealRef('step3')}>
            <div className={styles['step-copy']}>
              <div className={styles['step-number']}>3</div>
              <div className={styles['step-title']}>Export a defensible claim pack</div>
              <p className={styles['step-desc']}>
                When you are ready to lodge, export a structured, compliant claim
                pack. Sources, timestamps, classifications and technical narratives
                assembled into a clean document that aligns with RDTI requirements.
                Ready for submission, review, or audit.
              </p>
            </div>
            <div className={`${styles['step-visual']} ${styles['step-visual-img']}`}>
              <img src="/landing/claim-pack.png" alt="ClaimFlow claim pack export" className={styles['step-screenshot']} />
            </div>
          </div>
        </div>
      </section>


      {/* ═══════════════ COMPARISON ═══════════════ */}
      <section className={styles.comparison} id="comparison">
        <div className={styles['comparison-inner']}>
          <div className={`${styles['comparison-header']} ${revealClass('comp-header')}`} data-reveal-id="comp-header" ref={setRevealRef('comp-header')}>
            <div className={styles['comparison-eyebrow']}>Why switch</div>
            <h2>The old way vs. ClaimFlow</h2>
          </div>

          <div className={`${styles['comparison-grid']} ${revealClass('comp-grid')}`} data-reveal-id="comp-grid" ref={setRevealRef('comp-grid')}>
            <div className={`${styles['compare-col']} ${styles['compare-col-old']}`}>
              <div className={styles['compare-label']}>Without ClaimFlow</div>
              <div className={styles['compare-item']}>
                <span className={styles['compare-icon']}>&times;</span>
                <span>Chase clients for documentation weeks before lodgement</span>
              </div>
              <div className={styles['compare-item']}>
                <span className={styles['compare-icon']}>&times;</span>
                <span>Reconstruct technical narratives from memory</span>
              </div>
              <div className={styles['compare-item']}>
                <span className={styles['compare-icon']}>&times;</span>
                <span>Spreadsheets and shared drives for evidence management</span>
              </div>
              <div className={styles['compare-item']}>
                <span className={styles['compare-icon']}>&times;</span>
                <span>Inconsistent substantiation quality across clients</span>
              </div>
              <div className={styles['compare-item']}>
                <span className={styles['compare-icon']}>&times;</span>
                <span>Hours per client on documentation alone</span>
              </div>
            </div>

            <div className={`${styles['compare-col']} ${styles['compare-col-new']}`}>
              <div className={styles['compare-label']}>With ClaimFlow</div>
              <div className={styles['compare-item']}>
                <span className={styles['compare-icon']}>&#10003;</span>
                <span>Evidence collected continuously as work happens</span>
              </div>
              <div className={styles['compare-item']}>
                <span className={styles['compare-icon']}>&#10003;</span>
                <span>Contemporaneous records, not retrospective narratives</span>
              </div>
              <div className={styles['compare-item']}>
                <span className={styles['compare-icon']}>&#10003;</span>
                <span>Structured, searchable evidence linked to activities</span>
              </div>
              <div className={styles['compare-item']}>
                <span className={styles['compare-icon']}>&#10003;</span>
                <span>Consistent substantiation standard across your portfolio</span>
              </div>
              <div className={styles['compare-item']}>
                <span className={styles['compare-icon']}>&#10003;</span>
                <span>Minutes to generate an export-ready claim pack</span>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ═══════════════ METRICS ═══════════════ */}
      <section className={styles.metrics}>
        <div className={`${styles['metrics-inner']} ${revealClass('metrics')}`} data-reveal-id="metrics" ref={setRevealRef('metrics')}>
          <div className={styles['metrics-header']}>
            <div className={styles['metrics-eyebrow']}>By the numbers</div>
            <h2>Built for the way advisors<br />actually work</h2>
          </div>
          <div className={styles['metrics-grid']}>
            <div className={styles['metric-card']}>
              <div className={styles['metric-value']}>0</div>
              <div className={styles['metric-label']}>Follow-up emails. Evidence is captured automatically from your clients&apos; tools as they work.</div>
            </div>
            <div className={styles['metric-card']}>
              <div className={styles['metric-value']}>Real-time</div>
              <div className={styles['metric-label']}>Documentation recorded as work happens. No end-of-year reconstruction.</div>
            </div>
            <div className={styles['metric-card']}>
              <div className={styles['metric-value']}>1-click</div>
              <div className={styles['metric-label']}>Export a structured, audit-ready claim pack for any client.</div>
            </div>
          </div>
        </div>
      </section>


      {/* ═══════════════ FAQ ═══════════════ */}
      <section className={styles.faq} id="faq">
        <div className={styles['faq-inner']}>
          <div className={`${styles['faq-header']} ${revealClass('faq-header')}`} data-reveal-id="faq-header" ref={setRevealRef('faq-header')}>
            <div className={styles['faq-eyebrow']}>Questions</div>
            <h2>Frequently asked</h2>
          </div>

          <div className={styles['faq-list']}>
            {faqData.map((item, i) => (
              <div
                key={i}
                className={`${styles['faq-item']} ${openFaq === i ? styles['faq-item-open'] : ''} ${revealClass(`faq-${i}`)}`}
                data-reveal-id={`faq-${i}`}
                ref={setRevealRef(`faq-${i}`)}
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
                  ref={(el) => { faqRefs.current[i] = el; }}
                  style={{ maxHeight: openFaq === i ? (faqRefs.current[i]?.scrollHeight || 200) + 'px' : '0px' }}
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


      {/* ═══════════════ FINAL CTA ═══════════════ */}
      <section className={styles['final-cta']}>
        <div className={styles['final-cta-bg']}>
          <img src="/landing/cta-bg.png" alt="" />
        </div>
        <p className={styles['social-proof']}>Currently piloting with Australian R&D advisory firms.</p>
        <div className={revealClass('final-cta')} data-reveal-id="final-cta" ref={setRevealRef('final-cta')}>
          <h2>Better substantiation<br />starts here</h2>
          <p>
            Join R&D advisory firms using ClaimFlow to build stronger,
            more defensible claims with less manual effort.
          </p>
          <div className={styles['final-cta-buttons']}>
            <a href={BOOK_DEMO_URL} className={styles['btn-primary']}>Book Demo</a>
            <Link href="/demo-claim-pack" className={styles['btn-ghost']}>See Example Claim Pack</Link>
          </div>
        </div>
      </section>


      {/* ═══════════════ FOOTER ═══════════════ */}
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
                <li><a href="#how" onClick={(e) => scrollToSection(e, 'how')}>How it works</a></li>
                <li><a href="#how" onClick={(e) => scrollToSection(e, 'how')}>Features</a></li>
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
