'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import styles from '../app/landing.module.css';

const BOOK_DEMO_URL = 'https://calendly.com/tom-getclaimflow/30min';

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
          <img src="/landing/logo-dark.png" alt="ClaimFlow" />
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
        {/* Decorative background elements */}
        <div className={`${styles['hero-blob']} ${styles['hero-blob-tr']}`} />
        <div className={`${styles['hero-blob']} ${styles['hero-blob-bl']}`} />

        {/* Dot grids */}
        <div className={`${styles['hero-dots']} ${styles['hero-dots-tr']}`}>
          {Array.from({ length: 30 }).map((_, i) => <div key={i} className={styles['hero-dot']} />)}
        </div>
        <div className={`${styles['hero-dots']} ${styles['hero-dots-bl']}`}>
          {Array.from({ length: 20 }).map((_, i) => <div key={i} className={styles['hero-dot']} />)}
        </div>

        {/* Arc lines */}
        <svg className={styles['hero-arcs']} width="180" height="180" viewBox="0 0 180 180" fill="none">
          <path d="M20 160 A140 140 0 0 1 160 20" stroke="#b3c7ec" strokeWidth="1.2" fill="none" />
          <path d="M40 160 A120 120 0 0 1 160 40" stroke="#b3c7ec" strokeWidth="1.2" fill="none" />
          <path d="M60 160 A100 100 0 0 1 160 60" stroke="#b3c7ec" strokeWidth="1.2" fill="none" />
        </svg>

        {/* Wavy bottom edge */}
        <div className={styles['hero-wave']}>
          <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
            <path d="M0,80 C360,120 720,40 1080,80 C1260,100 1380,60 1440,70 L1440,120 L0,120 Z" fill="rgba(195,210,245,0.25)" />
            <path d="M0,95 C300,60 600,110 900,85 C1100,70 1300,100 1440,90 L1440,120 L0,120 Z" fill="rgba(195,210,245,0.18)" />
          </svg>
        </div>

        <div className={styles['hero-inner']}>
          <div className={styles['hero-copy']}>
            <h1><span style={{ whiteSpace: 'nowrap' }}>More R&D claims.</span><br />No extra headcount.</h1>
            <p className={styles['hero-sub']}>
              ClaimFlow connects to your clients&apos; dev tools, captures and structures their work against RDTI criteria, and generates a review-ready first draft. Your team stays in control, reviewing and refining instead of starting from scratch.
            </p>
            <div className={styles['hero-ctas']}>
              <a href={BOOK_DEMO_URL} className={styles['btn-primary']}>Book Demo</a>
              <a href="#how" onClick={(e) => scrollToSection(e, 'how')} className={styles['hero-link']}>
                See how it works <span aria-hidden="true">&rarr;</span>
              </a>
            </div>
          </div>
          <div className={styles['hero-visual']}>
            <div className={styles['hero-window']}>
              <div className={styles['hero-window-bar']}>
                <div className={`${styles['hero-window-dot']} ${styles['hero-window-dot-red']}`} />
                <div className={`${styles['hero-window-dot']} ${styles['hero-window-dot-yellow']}`} />
                <div className={`${styles['hero-window-dot']} ${styles['hero-window-dot-green']}`} />
              </div>
              <img src="/landing/costs-dashboard.png" alt="ClaimFlow costs dashboard with team R&D allocation and tax offset" className={styles['hero-img']} />
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div className={styles['hero-trust']}>
          <div className={styles['trust-badge']}>
            <div className={styles['trust-icon']}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
            </div>
            <div>
              <div className={styles['trust-text-title']}>Secure &amp; private</div>
              <div className={styles['trust-text-sub']}>Your data stays yours</div>
            </div>
          </div>
          <div className={styles['trust-badge']}>
            <div className={styles['trust-icon']}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
            </div>
            <div>
              <div className={styles['trust-text-title']}>RDTI aligned</div>
              <div className={styles['trust-text-sub']}>Built for compliance</div>
            </div>
          </div>
          <div className={styles['trust-badge']}>
            <div className={styles['trust-icon']}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <div>
              <div className={styles['trust-text-title']}>Team in control</div>
              <div className={styles['trust-text-sub']}>Review, refine, approve</div>
            </div>
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
            <div className={styles['integration-pill']}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', overflow: 'hidden', background: '#13B5EA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img src="/landing/xero-logo.png" alt="Xero" style={{ width: 44, height: 'auto' }} /></div>
              Xero
            </div>
          </div>
        </div>
      </section>


      {/* ═══════════════ THE PROBLEM ═══════════════ */}
      <section className={styles.problem}>
        <div className={`${styles['problem-inner']} ${revealClass('problem')}`} data-reveal-id="problem" ref={setRevealRef('problem')}>
          <div className={styles['problem-eyebrow']}>An assistant for your team, not a replacement</div>
          <h2>Your team already knows how to assess R&D.</h2>
          <p className={styles['problem-lead']}>What takes time is everything around it.</p>
          <div className={styles['problem-grid']}>
            <div className={styles['problem-card']}>
              <div className={styles['problem-card-num']}>1</div>
              <div className={styles['problem-card-title']}>Extracting</div>
              <p>Pulling information from client dev tools, repos, and project management systems.</p>
            </div>
            <div className={styles['problem-card']}>
              <div className={styles['problem-card-num']}>2</div>
              <div className={styles['problem-card-title']}>Interpreting</div>
              <p>Making sense of raw technical work and identifying what qualifies.</p>
            </div>
            <div className={styles['problem-card']}>
              <div className={styles['problem-card-num']}>3</div>
              <div className={styles['problem-card-title']}>Structuring</div>
              <p>Turning it into something defensible against RDTI criteria.</p>
            </div>
          </div>
          <p className={styles['problem-text']}>
            ClaimFlow handles that upfront. Your team reviews, challenges, and refines the output.
            They make the decisions &mdash; ClaimFlow just gives them a much stronger starting point.
          </p>
        </div>
      </section>


      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section className={styles.how} id="how">
        <div className={`${styles['how-header']} ${revealClass('how-header')}`} data-reveal-id="how-header" ref={setRevealRef('how-header')}>
          <div className={styles['how-eyebrow']}>How it works</div>
          <h2>R&D evidence,<br />captured and structured as it happens</h2>
          <p className={styles['how-subtitle']}>Three steps, zero admin.</p>
        </div>

        <div className={styles['how-steps']}>
          {/* Step 1 */}
          <div className={`${styles['how-step']} ${revealClass('step1')}`} data-reveal-id="step1" ref={setRevealRef('step1')}>
            <div className={styles['step-copy']}>
              <div className={styles['step-number']}>1</div>
              <div className={styles['step-title']}>Connect your client&apos;s tools</div>
              <p className={styles['step-desc']}>
                Link your client&apos;s GitHub, Jira, Xero, or other tools to
                ClaimFlow. Setup takes minutes. From that point on, their technical
                work and costs are captured automatically as it happens.
              </p>
            </div>
            <div className={`${styles['step-visual']} ${styles['step-visual-integrations']}`}>
              <div className={styles['integrations-grid-visual']}>
                <div className={styles['integration-card']}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="#24292f"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                  <span className={styles['integration-card-name']}>GitHub</span>
                </div>
                <div className={styles['integration-card']}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none"><defs><linearGradient id="jira-blue-1" x1="99.68%" y1="15.81%" x2="39.6%" y2="97.34%"><stop offset="0%" stopColor="#0052CC"/><stop offset="92%" stopColor="#2684FF"/></linearGradient><linearGradient id="jira-blue-2" x1="0.39%" y1="84.61%" x2="60.47%" y2="2.41%"><stop offset="0%" stopColor="#0052CC"/><stop offset="92%" stopColor="#2684FF"/></linearGradient></defs><path d="M22.16 11.1L13.07 2.01 12 .94 4.93 8.01 1.84 11.1a.6.6 0 000 .85l5.64 5.64L12 22.11l7.07-7.07.12-.12 2.97-2.97a.6.6 0 000-.85zM12 15.17L8.83 12 12 8.83 15.17 12 12 15.17z" fill="#2684FF"/><path d="M12 8.83a4.48 4.48 0 01-.01-6.33L4.92 9.57l3.53 3.53L12 8.83z" fill="url(#jira-blue-1)"/><path d="M15.18 11.99L12 15.17a4.48 4.48 0 01.01 6.33l7.07-7.07-4.1-4.44z" fill="url(#jira-blue-2)"/></svg>
                  <span className={styles['integration-card-name']}>Jira</span>
                </div>
                <div className={styles['integration-card']}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: '#13B5EA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img src="/landing/xero-logo.png" alt="Xero" style={{ width: 80, height: 'auto' }} /></div>
                  <span className={styles['integration-card-name']}>Xero</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className={`${styles['how-step']} ${styles['how-step-reversed']} ${revealClass('step2')}`} data-reveal-id="step2" ref={setRevealRef('step2')}>
            <div className={styles['step-copy']}>
              <div className={styles['step-number']}>2</div>
              <div className={styles['step-title']}>Let AI structure the evidence against RDTI criteria</div>
              <p className={styles['step-desc']}>
                ClaimFlow reads the raw evidence and helps map it to activities,
                hypotheses, knowledge gaps, experiments, outcomes and supporting
                evidence. Your team can accept, edit, relink or add context where needed.
              </p>
            </div>
            <div className={`${styles['step-visual']} ${styles['step-visual-img']}`}>
              <img src="/landing/ai-structuring.png" alt="ClaimFlow AI linking evidence to prior knowledge and R&D activities" className={styles['step-screenshot']} />
            </div>
          </div>

          {/* Step 3 */}
          <div className={`${styles['how-step']} ${revealClass('step3')}`} data-reveal-id="step3" ref={setRevealRef('step3')}>
            <div className={styles['step-copy']}>
              <div className={styles['step-number']}>3</div>
              <div className={styles['step-title']}>Review the claim like an advisor, not an admin</div>
              <p className={styles['step-desc']}>
                Work through each activity, see what evidence supports each section,
                spot weak areas, refine the narrative and export a cleaner claim pack
                for review.
              </p>
            </div>
            <div className={`${styles['step-visual']} ${styles['step-visual-img']}`}>
              <img src="/landing/claim-review.png" alt="ClaimFlow hypothesis editor with inline rewrite and evidence linking" className={styles['step-screenshot']} />
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
              <div className={styles['metric-value']}>2&times;</div>
              <div className={styles['metric-label']}>Client capacity per advisor. Handle more claims without growing your team.</div>
            </div>
            <div className={styles['metric-card']}>
              <div className={styles['metric-value']}>70%</div>
              <div className={styles['metric-label']}>Less time on documentation. Evidence is captured and structured automatically.</div>
            </div>
            <div className={styles['metric-card']}>
              <div className={styles['metric-value']}>0</div>
              <div className={styles['metric-label']}>Follow-up emails chasing clients. Contemporaneous evidence flows in as they work.</div>
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
