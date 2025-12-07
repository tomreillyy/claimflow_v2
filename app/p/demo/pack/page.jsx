'use client';

import { useState } from 'react';
import Link from 'next/link';

// Hardcoded demo data
const DEMO_PROJECT = {
  name: 'AI-Powered Document Processing Pipeline',
  year: '2024',
  project_token: 'demo',
  current_hypothesis: 'If we implement a transformer-based extraction model, we can achieve >95% accuracy on complex document layouts while reducing processing time by 60%.'
};

const DEMO_ACTIVITIES = [
  {
    id: '1',
    name: 'Multi-Modal Document Fusion',
    uncertainty: 'Can we combine visual CNN features with BERT text embeddings in a way that improves accuracy on mixed-format documents without prohibitive computational cost?'
  },
  {
    id: '2',
    name: 'Transformer Layout Analysis',
    uncertainty: 'Will multi-head attention mechanisms effectively capture spatial relationships in complex document layouts like multi-column forms and nested tables?'
  },
  {
    id: '3',
    name: 'Knowledge Distillation for Inference',
    uncertainty: 'Can we distill our large multi-modal model into a smaller, faster model while retaining at least 90% of the accuracy for production deployment?'
  }
];

const DEMO_EVIDENCE = [
  {
    id: '1',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    content: 'Successfully implemented the BERT-based entity extraction module. Initial tests show 92% accuracy on invoice data, but struggling with handwritten notes.',
    systematic_step_primary: 'Experiment',
    author_email: 'sarah.chen@company.com',
    source: 'note'
  },
  {
    id: '2',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    content: 'Benchmarked three different OCR approaches: Tesseract (baseline), AWS Textract, and our custom CNN model. Custom CNN achieved 89% accuracy on standard forms but only 67% on complex layouts.',
    systematic_step_primary: 'Observation',
    author_email: 'marcus.johnson@company.com',
    source: 'note'
  },
  {
    id: '3',
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    content: 'After reviewing the literature on document understanding, we hypothesize that combining visual features with textual features in a unified model will outperform single-modality approaches.',
    systematic_step_primary: 'Hypothesis',
    author_email: 'dr.patel@company.com',
    source: 'note'
  },
  {
    id: '4',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    content: 'The multi-modal fusion approach achieved 94.2% accuracy on our test set, validating our hypothesis. However, inference time increased by 40%.',
    systematic_step_primary: 'Evaluation',
    author_email: 'sarah.chen@company.com',
    source: 'note'
  },
  {
    id: '5',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    content: 'Based on our experiments, we conclude that the transformer-based approach is viable for production with knowledge distillation.',
    systematic_step_primary: 'Conclusion',
    author_email: 'dr.patel@company.com',
    source: 'note'
  }
];

const DEMO_COST_LEDGER = [
  { month: '2024-01', employee_name: 'Sarah Chen', role: 'ML Engineer', hours: 160, hourly_rate: 85, total: 13600 },
  { month: '2024-02', employee_name: 'Sarah Chen', role: 'ML Engineer', hours: 168, hourly_rate: 85, total: 14280 },
  { month: '2024-03', employee_name: 'Sarah Chen', role: 'ML Engineer', hours: 152, hourly_rate: 85, total: 12920 },
  { month: '2024-01', employee_name: 'Marcus Johnson', role: 'Senior Developer', hours: 80, hourly_rate: 75, total: 6000 },
  { month: '2024-02', employee_name: 'Marcus Johnson', role: 'Senior Developer', hours: 96, hourly_rate: 75, total: 7200 },
  { month: '2024-03', employee_name: 'Marcus Johnson', role: 'Senior Developer', hours: 88, hourly_rate: 75, total: 6600 },
  { month: '2024-01', employee_name: 'Dr. Priya Patel', role: 'Research Lead', hours: 40, hourly_rate: 120, total: 4800 },
  { month: '2024-02', employee_name: 'Dr. Priya Patel', role: 'Research Lead', hours: 32, hourly_rate: 120, total: 3840 },
  { month: '2024-03', employee_name: 'Dr. Priya Patel', role: 'Research Lead', hours: 48, hourly_rate: 120, total: 5760 }
];

// Pre-written demo sections
const DEMO_SECTIONS = {
  project_overview: `This R&D project focuses on developing an AI-powered document processing pipeline that can accurately extract and understand information from complex, multi-format business documents. The project addresses significant technological uncertainties around achieving high accuracy on varied document layouts while maintaining production-level performance.

The core challenge involves creating a system that can handle the unpredictable nature of real-world documents, including multi-column layouts, nested tables, handwritten annotations, and mixed media formats. Existing commercial solutions fail to meet our accuracy requirements for complex documents, necessitating novel approaches.`,

  technological_uncertainties: `**Uncertainty 1: Multi-Modal Feature Fusion**
Can we effectively combine visual CNN features with BERT text embeddings to improve accuracy on mixed-format documents? The uncertainty lies in whether the fusion architecture can learn meaningful cross-modal representations without prohibitive computational overhead.

**Uncertainty 2: Spatial Relationship Modeling**
Will transformer-based attention mechanisms effectively capture spatial relationships in complex document layouts? Traditional sequential models fail on multi-column forms and nested tables - it's unclear if attention-based approaches can overcome these limitations.

**Uncertainty 3: Model Compression**
Can knowledge distillation preserve accuracy while dramatically reducing inference time? The trade-off between model size and performance for our specific document understanding task was unknown.`,

  systematic_approach: `Our systematic approach followed an iterative experimentation methodology:

1. **Hypothesis Formation**: Based on literature review of document understanding architectures, we formulated specific hypotheses about multi-modal fusion approaches.

2. **Controlled Experiments**: We designed benchmarks comparing Tesseract (baseline), AWS Textract (commercial), and our custom architectures across standardized document test sets.

3. **Quantitative Evaluation**: All experiments measured accuracy, inference time, and computational cost against predefined success criteria.

4. **Iterative Refinement**: Results from each experiment informed the next iteration - for example, low accuracy on handwritten content led to investigating vision transformer approaches.

5. **Documentation**: All experiments, results, and conclusions were captured as contemporaneous evidence in our R&D tracking system.`,

  technical_narrative: `**Phase 1: Baseline Establishment (January 2024)**
Initial benchmarking revealed that existing OCR solutions achieved only 67% accuracy on our complex multi-column document set. This confirmed the need for a novel approach.

**Phase 2: Architecture Exploration (February 2024)**
We implemented a BERT-based entity extraction module, achieving 92% accuracy on structured invoice data. However, performance degraded significantly on handwritten annotations, prompting investigation of vision-enhanced architectures.

The team then developed a transformer encoder with 8-head attention for spatial relationship modeling, showing promising results on table detection tasks.

**Phase 3: Multi-Modal Fusion (March 2024)**
Combining CNN visual features with BERT embeddings in a unified architecture achieved 94.2% accuracy - a 12% improvement over single-modality approaches. This validated our core hypothesis about cross-modal learning.

**Phase 4: Optimization (March 2024)**
Knowledge distillation experiments demonstrated we could recover 90% of accuracy at 3x inference speedup, making the solution viable for production deployment.`,

  qualifying_costs: `**Personnel Costs (Q1 2024)**

| Employee | Role | Hours | Rate | Total |
|----------|------|-------|------|-------|
| Sarah Chen | ML Engineer | 480 | $85/hr | $40,800 |
| Marcus Johnson | Senior Developer | 264 | $75/hr | $19,800 |
| Dr. Priya Patel | Research Lead | 120 | $120/hr | $14,400 |

**Total Qualifying R&D Expenditure: $75,000**

All personnel were directly engaged in qualifying R&D activities including hypothesis formation, experimental design, implementation of novel algorithms, and systematic evaluation of results.`
};

function SectionDisplay({ title, content }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{
        fontSize: 18,
        fontWeight: 600,
        color: '#1a1a1a',
        marginBottom: 12,
        paddingBottom: 8,
        borderBottom: '2px solid #021048'
      }}>
        {title}
      </h2>
      <div style={{
        fontSize: 14,
        lineHeight: 1.8,
        color: '#333',
        whiteSpace: 'pre-wrap'
      }}>
        {content.split('\n').map((paragraph, i) => {
          if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
            return (
              <p key={i} style={{ fontWeight: 600, marginTop: 16, marginBottom: 8 }}>
                {paragraph.replace(/\*\*/g, '')}
              </p>
            );
          }
          if (paragraph.startsWith('|')) {
            // Simple table rendering
            return (
              <pre key={i} style={{
                fontFamily: 'ui-monospace, monospace',
                fontSize: 12,
                backgroundColor: '#f8f9fa',
                padding: 12,
                borderRadius: 4,
                overflow: 'auto'
              }}>
                {paragraph}
              </pre>
            );
          }
          if (paragraph.match(/^\d+\./)) {
            return (
              <p key={i} style={{ marginLeft: 16, marginBottom: 8 }}>
                {paragraph}
              </p>
            );
          }
          return paragraph ? <p key={i} style={{ marginBottom: 12 }}>{paragraph}</p> : null;
        })}
      </div>
    </div>
  );
}

export default function DemoPackPage() {
  const totalCost = DEMO_COST_LEDGER.reduce((sum, row) => sum + row.total, 0);
  const [showExportModal, setShowExportModal] = useState(false);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'white',
      fontFamily: 'Georgia, "Times New Roman", serif',
      color: '#1a1a1a'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: '#021048',
        borderBottom: '1px solid #012',
        padding: '16px 0'
      }}>
        <div style={{
          maxWidth: 1000,
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/" style={{
              display: 'inline-flex',
              alignItems: 'center',
              textDecoration: 'none'
            }}>
              <img
                src="/Aird__3_-removebg-preview.png"
                alt="Aird"
                style={{
                  height: 24,
                  width: 'auto'
                }}
              />
            </Link>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>/</span>
            <Link href="/demo" style={{
              color: 'white',
              textDecoration: 'none',
              fontFamily: 'system-ui',
              fontSize: 14
            }}>
              Demo Timeline
            </Link>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>/</span>
            <span style={{
              color: 'white',
              fontFamily: 'system-ui',
              fontSize: 14
            }}>
              Claim Pack
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              padding: '6px 12px',
              backgroundColor: 'transparent',
              color: '#fff',
              borderRadius: '12px',
              fontSize: 13,
              fontWeight: 500,
              border: '1px solid rgba(255,255,255,0.5)',
              fontFamily: 'system-ui'
            }}>
              Demo Mode
            </span>
            <button
              onClick={() => setShowExportModal(true)}
              style={{
                padding: '8px 16px',
                fontSize: 14,
                fontWeight: 500,
                color: 'white',
                backgroundColor: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 4,
                cursor: 'pointer',
                fontFamily: 'system-ui',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              Print / Export PDF
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: '48px 24px'
      }}>
        {/* Title Page */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <h1 style={{
            fontSize: 28,
            fontWeight: 600,
            marginBottom: 8
          }}>
            R&D Tax Credit Claim Pack
          </h1>
          <p style={{
            fontSize: 18,
            color: '#666',
            marginBottom: 24
          }}>
            {DEMO_PROJECT.name}
          </p>
          <p style={{
            fontSize: 14,
            color: '#999'
          }}>
            Fiscal Year {DEMO_PROJECT.year}
          </p>
        </div>

        {/* Executive Summary */}
        <div style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #e5e5e5',
          borderRadius: 8,
          padding: 24,
          marginBottom: 48
        }}>
          <h2 style={{
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 16,
            color: '#021048'
          }}>
            Executive Summary
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 24
          }}>
            <div>
              <p style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Core R&D Activities</p>
              <p style={{ fontSize: 24, fontWeight: 600, color: '#1a1a1a' }}>{DEMO_ACTIVITIES.length}</p>
            </div>
            <div>
              <p style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Evidence Items</p>
              <p style={{ fontSize: 24, fontWeight: 600, color: '#1a1a1a' }}>{DEMO_EVIDENCE.length}</p>
            </div>
            <div>
              <p style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Qualifying Costs</p>
              <p style={{ fontSize: 24, fontWeight: 600, color: '#1a1a1a' }}>${totalCost.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Sections */}
        <SectionDisplay
          title="1. Project Overview"
          content={DEMO_SECTIONS.project_overview}
        />

        <SectionDisplay
          title="2. Technological Uncertainties"
          content={DEMO_SECTIONS.technological_uncertainties}
        />

        <SectionDisplay
          title="3. Systematic Approach"
          content={DEMO_SECTIONS.systematic_approach}
        />

        <SectionDisplay
          title="4. Technical Narrative"
          content={DEMO_SECTIONS.technical_narrative}
        />

        <SectionDisplay
          title="5. Qualifying Costs"
          content={DEMO_SECTIONS.qualifying_costs}
        />

        {/* Core Activities Detail */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{
            fontSize: 18,
            fontWeight: 600,
            color: '#1a1a1a',
            marginBottom: 12,
            paddingBottom: 8,
            borderBottom: '2px solid #021048'
          }}>
            6. Core R&D Activities
          </h2>
          {DEMO_ACTIVITIES.map((activity, index) => (
            <div key={activity.id} style={{
              padding: 16,
              backgroundColor: '#f8f9fa',
              borderRadius: 4,
              marginBottom: 12
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
                Activity {index + 1}: {activity.name}
              </h3>
              <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6 }}>
                <strong>Uncertainty:</strong> {activity.uncertainty}
              </p>
            </div>
          ))}
        </div>

        {/* Evidence Timeline */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{
            fontSize: 18,
            fontWeight: 600,
            color: '#1a1a1a',
            marginBottom: 12,
            paddingBottom: 8,
            borderBottom: '2px solid #021048'
          }}>
            7. Contemporaneous Evidence
          </h2>
          <p style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
            The following evidence was captured in real-time during R&D activities:
          </p>
          {DEMO_EVIDENCE.map((ev) => (
            <div key={ev.id} style={{
              padding: 12,
              borderLeft: '3px solid #021048',
              marginBottom: 12,
              backgroundColor: '#fafafa'
            }}>
              <div style={{
                display: 'flex',
                gap: 12,
                fontSize: 12,
                color: '#666',
                marginBottom: 8
              }}>
                <span>{new Date(ev.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}</span>
                <span style={{
                  fontWeight: 600,
                  color: '#021048'
                }}>
                  {ev.systematic_step_primary}
                </span>
                <span>{ev.author_email}</span>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                {ev.content}
              </p>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="no-print" style={{
          marginTop: 48,
          padding: 32,
          background: 'linear-gradient(135deg, #021048 0%, #0a2472 100%)',
          borderRadius: 12,
          textAlign: 'center'
        }}>
          <h3 style={{
            fontSize: 20,
            fontWeight: 600,
            color: 'white',
            marginBottom: 8,
            fontFamily: 'system-ui, sans-serif'
          }}>
            Generate your own claim pack
          </h3>
          <p style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.8)',
            marginBottom: 24,
            maxWidth: 500,
            margin: '0 auto 24px',
            fontFamily: 'system-ui, sans-serif'
          }}>
            Connect your GitHub, capture evidence, and Aird will help you build a defensible R&D tax credit claim.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href="/auth/login"
              style={{
                padding: '12px 28px',
                fontSize: 15,
                fontWeight: 600,
                color: '#021048',
                backgroundColor: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                textDecoration: 'none',
                display: 'inline-block',
                fontFamily: 'system-ui, sans-serif'
              }}
            >
              Get Started Free
            </a>
            <a
              href="/pricing"
              style={{
                padding: '12px 28px',
                fontSize: 15,
                fontWeight: 600,
                color: 'white',
                backgroundColor: 'transparent',
                border: '1px solid rgba(255,255,255,0.5)',
                borderRadius: 8,
                cursor: 'pointer',
                textDecoration: 'none',
                display: 'inline-block',
                fontFamily: 'system-ui, sans-serif'
              }}
            >
              View Pricing
            </a>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 48,
          paddingTop: 24,
          borderTop: '1px solid #e5e5e5',
          textAlign: 'center',
          color: '#999',
          fontSize: 12
        }}>
          <p>Generated by Aird - R&D Tax Credit Documentation</p>
          <p style={{ marginTop: 8 }}>This is a demo claim pack with sample data</p>
        </div>
      </main>

      {/* Export Modal */}
      {showExportModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16
          }}
          onClick={() => setShowExportModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: 12,
              padding: 32,
              maxWidth: 420,
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: '#f0f9ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: 24
            }}>
              📄
            </div>
            <h3 style={{
              fontSize: 20,
              fontWeight: 600,
              color: '#1a1a1a',
              marginBottom: 8,
              fontFamily: 'system-ui, sans-serif'
            }}>
              Export your own claim packs
            </h3>
            <p style={{
              fontSize: 14,
              color: '#666',
              marginBottom: 24,
              lineHeight: 1.6,
              fontFamily: 'system-ui, sans-serif'
            }}>
              Sign up to create projects, capture R&D evidence, and export professional claim packs as PDF.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <a
                href="/auth/login"
                style={{
                  padding: '12px 24px',
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'white',
                  backgroundColor: '#021048',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  textDecoration: 'none',
                  display: 'block',
                  fontFamily: 'system-ui, sans-serif'
                }}
              >
                Sign up free
              </a>
              <button
                onClick={() => setShowExportModal(false)}
                style={{
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#666',
                  backgroundColor: 'transparent',
                  border: '1px solid #e5e5e5',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontFamily: 'system-ui, sans-serif'
                }}
              >
                Continue viewing demo
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          header {
            display: none !important;
          }
          .no-print {
            display: none !important;
          }
          main {
            padding: 0 !important;
          }
          @page {
            margin: 2cm;
          }
          h1, h2, h3 {
            page-break-after: avoid;
          }
        }
      `}} />
    </div>
  );
}
