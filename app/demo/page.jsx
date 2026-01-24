'use client';
import { useState } from 'react';
import ActionsRow from '@/components/ActionsRow';
import CoreActivitiesList from '@/components/CoreActivitiesList';

// Demo Header without auth
function DemoHeader({ projectName }) {
  return (
    <header style={{
      borderBottom: '1px solid var(--line)',
      background: '#021048'
    }}>
      <div style={{
        width: 'min(960px, 92vw)',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 0'
      }}>
        <a href="/" style={{
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center'
        }}>
          <img
            src="/claimflow-white-text-and-icon.png"
            alt="ClaimFlow"
            style={{
              height: 80,
              width: 'auto',
              marginTop: '-10px',
              marginBottom: '-10px'
            }}
          />
        </a>

        <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
          <span style={{
            fontSize: 13,
            color: 'rgba(255, 255, 255, 0.85)',
            marginRight: 12,
            fontWeight: 400
          }}>Everything here becomes contemporaneous R&D evidence</span>
          <span
            style={{
              padding: '8px 14px',
              backgroundColor: 'transparent',
              color: '#fff',
              borderRadius: '12px',
              fontSize: 14,
              fontWeight: 500,
              border: '1px solid #fff',
              fontFamily: 'inherit'
            }}
          >
            Demo Mode
          </span>
        </div>
      </div>
    </header>
  );
}

// Hardcoded demo data
const DEMO_PROJECT = {
  name: 'AI-Powered Document Processing Pipeline',
  inbound_email_local: 'doc-pipeline',
  current_hypothesis: 'If we implement a transformer-based extraction model, we can achieve >95% accuracy on complex document layouts while reducing processing time by 60%.'
};

const DEMO_EVIDENCE = [
  {
    id: '1',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    content: 'Successfully implemented the BERT-based entity extraction module. Initial tests show 92% accuracy on invoice data, but struggling with handwritten notes. Need to explore vision transformers for the handwriting component.',
    systematic_step_primary: 'Experiment',
    systematic_step_source: 'manual',
    activity_type: 'core',
    activity_type_source: 'manual',
    author_email: 'sarah.chen@company.com',
    source: 'note'
  },
  {
    id: '2',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    content: 'Benchmarked three different OCR approaches: Tesseract (baseline), AWS Textract, and our custom CNN model. Custom CNN achieved 89% accuracy on standard forms but only 67% on complex multi-column layouts. This confirms the need for a more sophisticated architecture.',
    systematic_step_primary: 'Observation',
    systematic_step_source: 'auto',
    activity_type: 'core',
    activity_type_source: 'auto',
    author_email: 'marcus.johnson@company.com',
    source: 'note'
  },
  {
    id: '3',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    content: 'feat: implement multi-head attention for document layout analysis\n\nAdded transformer encoder with 8 attention heads for spatial relationship modeling. Early results show promising improvements on table detection.',
    systematic_step_primary: 'Experiment',
    systematic_step_source: 'auto',
    activity_type: 'core',
    activity_type_source: 'auto',
    author_email: 'sarah.chen@company.com',
    source: 'github',
    meta: {
      sha: 'a1b2c3d4e5f6789012345678901234567890abcd',
      commit_url: 'https://github.com/company/doc-pipeline/commit/a1b2c3d',
      files_changed: 12,
      additions: 847,
      deletions: 123
    }
  },
  {
    id: '4',
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
    content: 'After reviewing the literature on document understanding, we hypothesize that combining visual features (CNN backbone) with textual features (BERT embeddings) in a unified model will outperform single-modality approaches for our use case of mixed-format documents.',
    systematic_step_primary: 'Hypothesis',
    systematic_step_source: 'manual',
    activity_type: 'core',
    activity_type_source: 'manual',
    author_email: 'dr.patel@company.com',
    source: 'note'
  },
  {
    id: '5',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    content: 'The multi-modal fusion approach achieved 94.2% accuracy on our test set, validating our hypothesis. However, inference time increased by 40%. Next step: explore model distillation to reduce latency without significant accuracy loss.',
    systematic_step_primary: 'Evaluation',
    systematic_step_source: 'manual',
    activity_type: 'core',
    activity_type_source: 'manual',
    author_email: 'sarah.chen@company.com',
    source: 'note'
  },
  {
    id: '6',
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days ago
    content: 'fix: resolve memory leak in batch processing pipeline\n\nFixed tensor accumulation issue causing OOM errors on large document batches. Added proper gradient detachment and implemented chunked processing.',
    systematic_step_primary: 'Experiment',
    systematic_step_source: 'auto',
    activity_type: 'supporting',
    activity_type_source: 'auto',
    author_email: 'marcus.johnson@company.com',
    source: 'github',
    meta: {
      sha: 'b2c3d4e5f6789012345678901234567890abcde',
      commit_url: 'https://github.com/company/doc-pipeline/commit/b2c3d4e',
      files_changed: 4,
      additions: 156,
      deletions: 89
    }
  },
  {
    id: '7',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    content: 'Based on our experiments, we conclude that the transformer-based approach is viable for production. Key findings: (1) Multi-modal fusion improves accuracy by 12% over single-modality, (2) Knowledge distillation can recover 90% of accuracy at 3x speedup, (3) Edge cases with handwritten annotations still need specialized handling.',
    systematic_step_primary: 'Conclusion',
    systematic_step_source: 'manual',
    activity_type: 'core',
    activity_type_source: 'manual',
    author_email: 'dr.patel@company.com',
    source: 'note'
  },
  {
    id: '8',
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days ago
    content: 'Explored using GPT-4 Vision API for complex document understanding as a potential benchmark. Results: 96% accuracy but $0.03 per page cost and 2-3 second latency makes it impractical for high-volume processing. Our custom model remains the better choice for production.',
    systematic_step_primary: 'Observation',
    systematic_step_source: 'auto',
    activity_type: 'core',
    activity_type_source: 'auto',
    author_email: 'sarah.chen@company.com',
    source: 'note'
  }
];

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

const DEMO_STEP_COUNTS = {
  hypothesis: 1,
  experiment: 3,
  observation: 2,
  evaluation: 1,
  conclusion: 1
};

export default function DemoTimelinePage() {
  const [activeTab, setActiveTab] = useState('timeline');
  const [filterSteps, setFilterSteps] = useState(new Set());
  const [toast, setToast] = useState('');
  const [hypothesis, setHypothesis] = useState(DEMO_PROJECT.current_hypothesis);
  const [isEditingHypothesis, setIsEditingHypothesis] = useState(false);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 2000);
  };

  // Calculate stats
  const totalEvidence = DEMO_EVIDENCE.length;
  const weeklyEvidence = DEMO_EVIDENCE.filter(ev => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return new Date(ev.created_at) >= oneWeekAgo;
  }).length;

  const coveredSteps = Object.entries(DEMO_STEP_COUNTS).filter(([_, count]) => count > 0).length;
  const missingSteps = ['Hypothesis', 'Experiment', 'Observation', 'Evaluation', 'Conclusion']
    .filter(step => !DEMO_STEP_COUNTS[step.toLowerCase()] || DEMO_STEP_COUNTS[step.toLowerCase()] === 0);

  // Filter evidence
  const filteredEvidence = DEMO_EVIDENCE.filter(ev => {
    if (filterSteps.size === 0) return true;
    return filterSteps.has(ev.systematic_step_primary);
  });

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
    }}>
      <DemoHeader projectName={DEMO_PROJECT.name} />

      <main style={{
        maxWidth: 1600,
        margin: '0 auto',
        padding: '40px 48px'
      }}>
        {/* Project title */}
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          marginBottom: 24
        }}>
          <h1 style={{
            fontSize: 22,
            fontWeight: 600,
            color: '#1a1a1a',
            margin: 0
          }}>{DEMO_PROJECT.name}</h1>
        </div>

        {/* Inline CTA Banner */}
        <div style={{
          maxWidth: 1200,
          margin: '0 auto 24px',
          padding: '12px 16px',
          backgroundColor: '#f0f9ff',
          border: '1px solid #bfdbfe',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap'
        }}>
          <p style={{
            fontSize: 14,
            color: '#1e40af',
            margin: 0
          }}>
            You're viewing a demo project. Ready to capture your own R&D evidence?
          </p>
          <a
            href="/auth/login"
            style={{
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              color: 'white',
              backgroundColor: '#021048',
              borderRadius: 6,
              textDecoration: 'none',
              whiteSpace: 'nowrap'
            }}
          >
            Get Started Free
          </a>
        </div>

        {/* Main content */}
        <div style={{
          maxWidth: 1200,
          margin: '0 auto'
        }}>
          <ActionsRow
            evidenceCount={totalEvidence}
            weeklyCount={weeklyEvidence}
            githubConnected={true}
            coverageData={{
              covered: coveredSteps,
              total: 5,
              missing: missingSteps
            }}
            token="demo"
            onConnectGitHub={() => showToast('GitHub sync (demo)')}
            onAddNote={() => showToast('Add note (demo)')}
          />

          {/* Tabs */}
          <div style={{
            marginBottom: 20,
            borderBottom: '1px solid #e5e5e5',
            display: 'flex',
            gap: 0
          }}>
            <button
              onClick={() => setActiveTab('timeline')}
              style={{
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 500,
                color: activeTab === 'timeline' ? '#021048' : '#666',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'timeline' ? '2px solid #021048' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Evidence Timeline
            </button>
            <button
              onClick={() => setActiveTab('costs')}
              style={{
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 500,
                color: activeTab === 'costs' ? '#021048' : '#666',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'costs' ? '2px solid #021048' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Costs
            </button>
          </div>

          {/* Timeline Tab Content */}
          {activeTab === 'timeline' && (
            <div>
              {/* Step Distribution Pills */}
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  display: 'flex',
                  gap: 8,
                  flexWrap: 'wrap',
                  alignItems: 'center'
                }}>
                  {['hypothesis', 'experiment', 'observation', 'evaluation', 'conclusion'].map(step => {
                    const count = DEMO_STEP_COUNTS[step] || 0;
                    const label = step.charAt(0).toUpperCase() + step.slice(1);
                    const isActive = filterSteps.has(label);

                    return (
                      <button
                        key={step}
                        onClick={() => {
                          const newSet = new Set(filterSteps);
                          if (isActive) {
                            newSet.delete(label);
                          } else {
                            newSet.add(label);
                          }
                          setFilterSteps(newSet);
                        }}
                        style={{
                          padding: '6px 14px',
                          fontSize: 13,
                          fontWeight: 500,
                          color: isActive ? 'white' : (count === 0 ? '#999' : '#666'),
                          backgroundColor: isActive ? '#021048' : 'white',
                          border: `1px solid ${isActive ? '#021048' : '#e5e5e5'}`,
                          borderRadius: 20,
                          cursor: count === 0 ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s',
                          opacity: count === 0 ? 0.5 : 1
                        }}
                        disabled={count === 0}
                        title={`${label}: ${count} item${count !== 1 ? 's' : ''}`}
                      >
                        {label}: {count}
                      </button>
                    );
                  })}
                  {filterSteps.size > 0 && (
                    <button
                      onClick={() => setFilterSteps(new Set())}
                      style={{
                        padding: '6px 14px',
                        fontSize: 12,
                        fontWeight: 500,
                        color: '#666',
                        backgroundColor: 'white',
                        border: '1px solid #ddd',
                        borderRadius: 20,
                        cursor: 'pointer',
                        marginLeft: 8
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Timeline content */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: 4,
                border: '1px solid #e5e5e5',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #e5e5e5',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <h2 style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#1a1a1a',
                    margin: 0
                  }}>Evidence Timeline</h2>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: '#f0f9ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: 16,
                      padding: '5px 10px',
                      fontSize: 12,
                      fontFamily: 'ui-monospace, Monaco, monospace',
                      color: '#1a1a1a'
                    }}>
                      <span>📧</span>
                      <span>{DEMO_PROJECT.inbound_email_local}@inbound…</span>
                    </div>
                    <button
                      onClick={() => showToast('Email copied!')}
                      style={{
                        padding: '6px 12px',
                        fontSize: 13,
                        fontWeight: 500,
                        color: '#666',
                        backgroundColor: 'white',
                        border: '1px solid #ddd',
                        borderRadius: 3,
                        cursor: 'pointer'
                      }}
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => showToast('Upload (demo)')}
                      style={{
                        padding: '6px 12px',
                        fontSize: 13,
                        fontWeight: 500,
                        color: '#666',
                        backgroundColor: 'white',
                        border: '1px solid #ddd',
                        borderRadius: 3,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      📎 Upload file
                    </button>
                    <button
                      onClick={() => showToast('Add note (demo)')}
                      style={{
                        padding: '6px 12px',
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'white',
                        backgroundColor: '#021048',
                        border: 'none',
                        borderRadius: 3,
                        cursor: 'pointer'
                      }}
                    >
                      + Add note
                    </button>
                  </div>
                </div>

                {/* Hypothesis Section */}
                <details style={{
                  margin: '12px 16px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 4
                }}>
                  <summary style={{
                    padding: 10,
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#666',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}>
                    Optional project hypothesis
                  </summary>
                  <div style={{ padding: '0 10px 10px 10px' }}>
                    <div style={{
                      padding: 8,
                      backgroundColor: '#f0f9ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: 3,
                      marginBottom: 6
                    }}>
                      <p style={{
                        fontSize: 12,
                        color: '#333',
                        margin: 0
                      }}>
                        {hypothesis}
                      </p>
                    </div>
                    <button
                      onClick={() => showToast('Edit hypothesis (demo)')}
                      style={{
                        padding: '5px 10px',
                        fontSize: 11,
                        fontWeight: 500,
                        color: '#021048',
                        backgroundColor: 'white',
                        border: '1px solid #ddd',
                        borderRadius: 3,
                        cursor: 'pointer'
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </details>

                {/* Evidence items */}
                <div>
                  {filteredEvidence.map((ev) => (
                    <div
                      key={ev.id}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #f0f0f0'
                      }}
                    >
                      {/* Metadata bar */}
                      <div style={{
                        fontSize: 12,
                        color: '#999',
                        marginBottom: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontFamily: 'ui-monospace, Monaco, monospace'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: '#666', fontWeight: 500 }}>
                            {new Date(ev.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          {ev.systematic_step_primary && ev.systematic_step_primary !== 'Unknown' && (
                            <>
                              <span>·</span>
                              <span style={{
                                color: '#1a1a1a',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3
                              }}>
                                {ev.systematic_step_primary}
                                <span
                                  style={{
                                    fontSize: 9,
                                    color: ev.systematic_step_source === 'manual' ? '#021048' : '#999',
                                    fontWeight: 400
                                  }}
                                  title={ev.systematic_step_source === 'manual' ? 'Manually classified' : 'AI classified'}
                                >
                                  {ev.systematic_step_source === 'manual' ? '●' : '○'}
                                </span>
                              </span>
                            </>
                          )}
                          {ev.activity_type && (
                            <>
                              <span>·</span>
                              <span style={{
                                padding: '2px 6px',
                                fontSize: 11,
                                fontWeight: 600,
                                borderRadius: 3,
                                backgroundColor: ev.activity_type === 'core' ? '#021048' : '#666',
                                color: 'white',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3
                              }}>
                                {ev.activity_type === 'core' ? 'Core R&D' : 'Supporting'}
                                <span
                                  style={{
                                    fontSize: 8,
                                    color: ev.activity_type_source === 'manual' ? '#fff' : 'rgba(255,255,255,0.6)'
                                  }}
                                  title={ev.activity_type_source === 'manual' ? 'Manually classified' : 'AI classified'}
                                >
                                  {ev.activity_type_source === 'manual' ? '●' : '○'}
                                </span>
                              </span>
                            </>
                          )}
                          {ev.author_email && (
                            <>
                              <span>·</span>
                              <span>{ev.author_email}</span>
                            </>
                          )}
                        </div>
                        <button
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 16,
                            padding: '4px 8px',
                            color: '#666',
                            lineHeight: 1
                          }}
                          title="Options"
                        >
                          ⋮
                        </button>
                      </div>

                      {/* Content */}
                      {ev.content && (
                        <p style={{
                          fontSize: 15,
                          color: '#1a1a1a',
                          lineHeight: 1.6,
                          margin: 0,
                          whiteSpace: 'pre-wrap',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
                        }}>
                          {ev.content}
                        </p>
                      )}

                      {/* GitHub commit metadata */}
                      {ev.source === 'github' && ev.meta && (
                        <div style={{
                          marginTop: 8,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          flexWrap: 'wrap'
                        }}>
                          <a
                            href={ev.meta.commit_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              color: '#0969da',
                              textDecoration: 'none',
                              fontSize: 13,
                              fontWeight: 400,
                              padding: '4px 8px',
                              backgroundColor: '#f6f8fa',
                              borderRadius: 3,
                              border: '1px solid #d0d7de'
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                              <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
                            </svg>
                            {ev.meta.sha?.substring(0, 7)}
                          </a>
                          {ev.meta.files_changed > 0 && (
                            <span style={{
                              fontSize: 12,
                              color: '#656d76',
                              fontFamily: 'ui-monospace, Monaco, monospace'
                            }}>
                              {ev.meta.files_changed} {ev.meta.files_changed === 1 ? 'file' : 'files'} changed
                            </span>
                          )}
                          {(ev.meta.additions || ev.meta.deletions) && (
                            <span style={{
                              fontSize: 12,
                              color: '#656d76',
                              fontFamily: 'ui-monospace, Monaco, monospace'
                            }}>
                              {ev.meta.additions > 0 && (
                                <span style={{ color: '#1a7f37' }}>+{ev.meta.additions}</span>
                              )}
                              {ev.meta.additions > 0 && ev.meta.deletions > 0 && ' '}
                              {ev.meta.deletions > 0 && (
                                <span style={{ color: '#cf222e' }}>-{ev.meta.deletions}</span>
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Core Activities Section */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: 4,
                border: '1px solid #e5e5e5',
                overflow: 'hidden',
                marginTop: 20
              }}>
                <div style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #e5e5e5'
                }}>
                  <h2 style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#1a1a1a',
                    margin: '0 0 4px 0'
                  }}>Core Activities</h2>
                  <p style={{
                    fontSize: 12,
                    color: '#999',
                    margin: 0,
                    lineHeight: 1.4
                  }}>
                    Auto-generated from your evidence. Add manually if needed.
                  </p>
                </div>
                <div style={{ padding: 16 }}>
                  <CoreActivitiesList
                    activities={DEMO_ACTIVITIES}
                    onUpdate={() => showToast('Update activity (demo)')}
                    onCreate={() => showToast('Create activity (demo)')}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Costs Tab Content */}
          {activeTab === 'costs' && (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#666' }}>
              <p style={{ fontSize: 14 }}>Costs tab - demo mode</p>
              <p style={{ fontSize: 13 }}>In the real app, this shows payroll costs and attestations.</p>
            </div>
          )}

          {/* CTA Section */}
          <div style={{
            marginTop: 40,
            padding: 32,
            background: 'linear-gradient(135deg, #021048 0%, #0a2472 100%)',
            borderRadius: 12,
            textAlign: 'center'
          }}>
            <h3 style={{
              fontSize: 20,
              fontWeight: 600,
              color: 'white',
              marginBottom: 8
            }}>
              Ready to capture your R&D evidence?
            </h3>
            <p style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.8)',
              marginBottom: 24,
              maxWidth: 500,
              margin: '0 auto 24px'
            }}>
              Start documenting your R&D activities today. Connect GitHub, add notes, and generate claim packs automatically.
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
                  display: 'inline-block'
                }}
              >
                Get Started Free
              </a>
              <a
                href="/p/demo/pack"
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
                  display: 'inline-block'
                }}
              >
                View Demo Claim Pack
              </a>
            </div>
          </div>
        </div>

        {/* Toast notification */}
        {toast && (
          <div style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            padding: '12px 20px',
            backgroundColor: '#1a1a1a',
            color: 'white',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000
          }}>
            {toast}
          </div>
        )}
      </main>
    </div>
  );
}
