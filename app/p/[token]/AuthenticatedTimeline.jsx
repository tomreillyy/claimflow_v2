'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { Header } from '@/components/Header';
import QuickNoteForm from './quick-note-form';
import CoreActivitiesList from '@/components/CoreActivitiesList';

// Hook to fetch step counts and compute gap hint
function useStepGapHint(token) {
  const [hint, setHint] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch(`/api/evidence/${token}/step-counts`)
      .then(res => res.ok ? res.json() : null)
      .then(counts => {
        if (!counts) return; // Silent on error
        const missing = [];
        const order = ['Hypothesis', 'Experiment', 'Observation', 'Evaluation', 'Conclusion'];
        order.forEach(step => {
          if (counts[step.toLowerCase()] === 0) missing.push(step);
        });
        if (missing.length === 0) {
          setHint('All five steps present at least once.');
        } else {
          setHint(`Missing: ${missing.join(', ')}.`);
        }
      })
      .catch(() => {}); // Silent on error
  }, [token]);

  return hint;
}

function EvidenceKebabMenu({ evidenceId, token, currentStep, onStepChange, onDelete }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showStepPicker, setShowStepPicker] = useState(false);

  const steps = ['Hypothesis', 'Experiment', 'Observation', 'Evaluation', 'Conclusion', 'Unknown'];

  const handleStepSelect = async (step) => {
    // Optimistic update - UI changes immediately
    onStepChange(step);
    setShowStepPicker(false);
    setIsOpen(false);

    // Then call API in background
    try {
      await fetch(`/api/evidence/${token}/set-step`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidence_id: evidenceId, step })
      });
    } catch (err) {
      console.error('Failed to update step:', err);
    }
  };

  const handleDelete = async () => {
    // Optimistic update - UI removes item immediately
    onDelete();
    setIsOpen(false);

    // Then call API in background
    try {
      await fetch(`/api/evidence/${token}/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidence_id: evidenceId })
      });
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
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

      {isOpen && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 10
            }}
            onClick={() => {
              setIsOpen(false);
              setShowStepPicker(false);
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 4,
              backgroundColor: 'white',
              border: '1px solid #e5e5e5',
              borderRadius: 6,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              minWidth: 120,
              zIndex: 20
            }}
          >
            {!showStepPicker ? (
              <>
                <button
                  onClick={() => setShowStepPicker(true)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: 14,
                    color: '#333'
                  }}
                  onMouseEnter={e => e.target.style.backgroundColor = '#f5f5f5'}
                  onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}
                >
                  Re-classify
                </button>
                <div style={{ height: 1, backgroundColor: '#e5e5e5', margin: '4px 0' }} />
                <button
                  onClick={handleDelete}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: 14,
                    color: '#dc2626'
                  }}
                  onMouseEnter={e => e.target.style.backgroundColor = '#fef2f2'}
                  onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}
                >
                  Delete
                </button>
              </>
            ) : (
              <div style={{ padding: '4px 0' }}>
                {steps.map(step => (
                  <button
                    key={step}
                    onClick={() => handleStepSelect(step)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: 'none',
                      background: currentStep === step ? '#f0f9ff' : 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: 13,
                      color: '#333',
                      fontWeight: currentStep === step ? 500 : 400
                    }}
                    onMouseEnter={e => e.target.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={e => e.target.style.backgroundColor = currentStep === step ? '#f0f9ff' : 'transparent'}
                  >
                    {step}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function AuthenticatedTimeline({ project, items, token }) {
  const { user, loading } = useAuth();
  const stepHint = useStepGapHint(token);
  const [stepCounts, setStepCounts] = useState({});
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [authError, setAuthError] = useState('');
  const [email, setEmail] = useState('');
  const [deletedIds, setDeletedIds] = useState(new Set());
  const [evidenceSteps, setEvidenceSteps] = useState(() => {
    const stepMap = {};
    items?.forEach(ev => {
      stepMap[ev.id] = {
        step: ev.systematic_step_primary,
        source: ev.systematic_step_source || 'auto'
      };
    });
    return stepMap;
  });
  const [hypothesis, setHypothesis] = useState(project.current_hypothesis || '');
  const [isEditingHypothesis, setIsEditingHypothesis] = useState(false);
  const [hypothesisSaving, setHypothesisSaving] = useState(false);
  const [coreActivities, setCoreActivities] = useState([]);
  const [toast, setToast] = useState('');
  const [activitiesFetched, setActivitiesFetched] = useState(false);
  const [filterSteps, setFilterSteps] = useState(new Set());
  const [activeTab, setActiveTab] = useState('timeline');

  // Fetch core activities and step counts
  useEffect(() => {
    if (!token || activitiesFetched) return;

    Promise.all([
      fetch(`/api/projects/${token}/core-activities`).then(res => res.ok ? res.json() : null),
      fetch(`/api/evidence/${token}/step-counts`).then(res => res.ok ? res.json() : null)
    ]).then(([activitiesData, countsData]) => {
      if (activitiesData) {
        setCoreActivities(activitiesData.activities || []);
      }
      if (countsData) {
        setStepCounts(countsData);
      }
      setActivitiesFetched(true);
    }).catch(err => console.error('Failed to fetch data:', err));
  }, [token, activitiesFetched]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 2000);
  };

  const handleSaveCoreActivity = async (name, uncertainty) => {
    try {
      const response = await fetch(`/api/projects/${token}/core-activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, uncertainty })
      });

      if (response.ok) {
        const activity = await response.json();
        setCoreActivities(prev => [...prev, activity]);
        showToast('Saved');
      }
    } catch (error) {
      console.error('Failed to save activity:', error);
    }
  };

  const handleUpdateActivity = async (id, name, uncertainty) => {
    try {
      const response = await fetch(`/api/projects/${token}/core-activities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, uncertainty })
      });

      if (response.ok) {
        const updated = await response.json();
        setCoreActivities(prev => prev.map(a => a.id === id ? updated : a));
      }
    } catch (error) {
      console.error('Failed to update activity:', error);
    }
  };

  const handleSaveHypothesis = async () => {
    const trimmed = hypothesis.trim();
    if (trimmed.length > 280) {
      alert('Hypothesis must be 280 characters or less');
      return;
    }

    setHypothesisSaving(true);
    try {
      const response = await fetch(`/api/evidence/${token}/update-hypothesis`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_hypothesis: trimmed })
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to save hypothesis');
        return;
      }

      setHypothesis(trimmed);
      setIsEditingHypothesis(false);
    } catch (error) {
      console.error('Error saving hypothesis:', error);
      alert('Failed to save hypothesis');
    } finally {
      setHypothesisSaving(false);
    }
  };

  const handleJoinProject = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    setAuthMessage('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?project_token=${token}`,
        },
      });

      if (error) {
        setAuthError(error.message);
      } else {
        setAuthMessage('Check your email for the magic link to join this project!');
      }
    } catch (error) {
      setAuthError('An unexpected error occurred');
    } finally {
      setAuthLoading(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'white',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
      }}>
        <Header projectName={project.name} projectToken={token} />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh'
        }}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'white',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
      }}>
        <Header projectName={project.name} />

        <main style={{
          maxWidth: 500,
          margin: '0 auto',
          padding: '60px 24px'
        }}>
          <div style={{
            backgroundColor: '#f8f9fa',
            borderRadius: 12,
            padding: 32,
            marginBottom: 32,
            border: '1px solid #e5e5e5',
            textAlign: 'center'
          }}>
            <h1 style={{
              fontSize: 24,
              fontWeight: 600,
              color: '#1a1a1a',
              margin: '0 0 16px 0'
            }}>Join {project.name}</h1>

            <p style={{
              fontSize: 16,
              color: '#333',
              margin: '0 0 24px 0',
              lineHeight: 1.5
            }}>
              You've been invited to view this R&D project timeline. Enter your email to get instant access.
            </p>

            <form onSubmit={handleJoinProject}>
              <div style={{ marginBottom: 20, textAlign: 'left' }}>
                <label style={{
                  display: 'block',
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#333',
                  marginBottom: 6
                }}>
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: 16,
                    border: '1px solid #ddd',
                    borderRadius: 8,
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box',
                    color: '#1a1a1a',
                    backgroundColor: 'white'
                  }}
                  onFocus={e => e.target.style.borderColor = '#007acc'}
                  onBlur={e => e.target.style.borderColor = '#ddd'}
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                style={{
                  width: '100%',
                  padding: '12px 24px',
                  fontSize: 16,
                  fontWeight: 500,
                  color: 'white',
                  backgroundColor: authLoading ? '#ccc' : '#007acc',
                  border: 'none',
                  borderRadius: 8,
                  cursor: authLoading ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                {authLoading ? 'Sending magic link...' : 'Join project'}
              </button>
            </form>

            {authMessage && (
              <div style={{
                marginTop: 20,
                padding: 16,
                backgroundColor: '#f0f9ff',
                border: '1px solid #bfdbfe',
                borderRadius: 8,
                fontSize: 14,
                color: '#1e40af'
              }}>
                {authMessage}
              </div>
            )}

            {authError && (
              <div style={{
                marginTop: 20,
                padding: 16,
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 8,
                fontSize: 14,
                color: '#dc2626'
              }}>
                {authError}
              </div>
            )}
          </div>

          <div style={{
            textAlign: 'center',
            fontSize: 14,
            color: '#666'
          }}>
            <p style={{ margin: 0 }}>
              No password needed. We'll send you a secure link that gives you instant access.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Show the authenticated timeline
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
    }}>
      <Header projectName={project.name} projectToken={token} />

      <main style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: '40px 24px'
      }}>
        {/* Two column layout */}
        <div style={{
          display: 'flex',
          gap: 24,
          alignItems: 'start'
        }}>
          {/* Empty spacer for sidebar */}
          <div style={{ width: 280, flexShrink: 0 }}></div>

          {/* View claim pack button - aligned with main content */}
          <div style={{
            flex: 1,
            maxWidth: 900,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: 16
          }}>
            <a
              href={`/p/${token}/pack`}
              target="_blank"
              style={{
                padding: '6px 12px',
                backgroundColor: '#007acc',
                color: 'white',
                textDecoration: 'none',
                borderRadius: 3,
                fontSize: 13,
                fontWeight: 500,
                display: 'inline-block'
              }}
            >
              View claim pack
            </a>
          </div>
        </div>

        {/* Two column layout - main content */}
        <div style={{
          display: 'flex',
          gap: 24,
          alignItems: 'start'
        }}>
          {/* Sidebar - Core Activities */}
          <aside style={{
            width: 280,
            flexShrink: 0,
            position: 'sticky',
            top: 24
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: 4,
              border: '1px solid #e5e5e5',
              padding: 16
            }}>
              <h3 style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#666',
                margin: '0 0 6px 0',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>Core Activities</h3>
              <p style={{
                fontSize: 11,
                color: '#999',
                margin: '0 0 12px 0',
                lineHeight: 1.4
              }}>
                Auto-generated from your evidence. Add manually if needed.
              </p>
              <CoreActivitiesList
                activities={coreActivities}
                onUpdate={handleUpdateActivity}
                onCreate={handleSaveCoreActivity}
              />
            </div>
          </aside>

          {/* Main content column */}
          <div style={{
            flex: 1,
            maxWidth: 900,
            margin: '0 auto'
          }}>
            {/* Project Header */}
          <div style={{
          backgroundColor: '#fafafa',
          borderRadius: 4,
          padding: 20,
          marginBottom: 20,
          border: '1px solid #e5e5e5'
        }}>
          <h1 style={{
            fontSize: 24,
            fontWeight: 600,
            color: '#1a1a1a',
            margin: '0 0 4px 0'
          }}>{project.name}</h1>

          <p style={{
            fontSize: 14,
            color: '#666',
            margin: '0 0 12px 0'
          }}>Evidence timeline for {project.year}</p>

          {/* Hypothesis Section */}
          {hypothesis && !isEditingHypothesis ? (
            <div style={{
              marginBottom: 16,
              padding: 12,
              backgroundColor: '#f0f9ff',
              border: '1px solid #bfdbfe',
              borderRadius: 4
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 4
              }}>
                <p style={{
                  fontSize: 14,
                  color: '#333',
                  margin: 0,
                  flex: 1
                }}>
                  <strong>Hypothesis:</strong> {hypothesis}
                </p>
                <button
                  onClick={() => setIsEditingHypothesis(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#007acc',
                    fontSize: 13,
                    cursor: 'pointer',
                    padding: '0 0 0 12px',
                    textDecoration: 'underline'
                  }}
                >
                  Edit
                </button>
              </div>
              {project.updated_at && (
                <p style={{
                  fontSize: 12,
                  color: '#666',
                  margin: '4px 0 0 0'
                }}>
                  Last updated {new Date(project.updated_at).toLocaleDateString()}
                </p>
              )}
            </div>
          ) : !hypothesis && !isEditingHypothesis ? (
            <div style={{
              marginBottom: 16,
              padding: 12,
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 4
            }}>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: '#333',
                marginBottom: 6
              }}>
                Project hypothesis (one sentence)
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <input
                  value={hypothesis}
                  onChange={(e) => setHypothesis(e.target.value)}
                  placeholder="If we <approach> under <conditions>, we expect <measurable outcome> because <technical reason>."
                  maxLength={280}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontSize: 14,
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    outline: 'none',
                    color: '#1a1a1a'
                  }}
                />
                <button
                  onClick={handleSaveHypothesis}
                  disabled={hypothesisSaving}
                  style={{
                    padding: '8px 16px',
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'white',
                    backgroundColor: hypothesisSaving ? '#ccc' : '#007acc',
                    border: 'none',
                    borderRadius: 6,
                    cursor: hypothesisSaving ? 'not-allowed' : 'pointer'
                  }}
                >
                  {hypothesisSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
              <p style={{
                fontSize: 12,
                color: '#666',
                margin: '6px 0 0 0'
              }}>
                Technical and testable (not a business goal). 35 words max.
              </p>
            </div>
          ) : isEditingHypothesis ? (
            <div style={{
              marginBottom: 16,
              padding: 12,
              backgroundColor: '#f0f9ff',
              border: '1px solid #bfdbfe',
              borderRadius: 4
            }}>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: '#333',
                marginBottom: 6
              }}>
                Project hypothesis (one sentence)
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <input
                  value={hypothesis}
                  onChange={(e) => setHypothesis(e.target.value)}
                  placeholder="If we <approach> under <conditions>, we expect <measurable outcome> because <technical reason>."
                  maxLength={280}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontSize: 14,
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    outline: 'none',
                    color: '#1a1a1a'
                  }}
                />
                <button
                  onClick={handleSaveHypothesis}
                  disabled={hypothesisSaving}
                  style={{
                    padding: '8px 16px',
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'white',
                    backgroundColor: hypothesisSaving ? '#ccc' : '#007acc',
                    border: 'none',
                    borderRadius: 6,
                    cursor: hypothesisSaving ? 'not-allowed' : 'pointer'
                  }}
                >
                  {hypothesisSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setHypothesis(project.current_hypothesis || '');
                    setIsEditingHypothesis(false);
                  }}
                  style={{
                    padding: '8px 16px',
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#666',
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
              <p style={{
                fontSize: 12,
                color: '#666',
                margin: '6px 0 0 0'
              }}>
                Technical and testable (not a business goal). 35 words max.
              </p>
            </div>
          ) : null}

          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 4,
            padding: 12
          }}>
            <p style={{
              fontSize: 13,
              color: '#666',
              margin: '0 0 4px 0',
              fontWeight: 500
            }}>Send updates via email:</p>
            <code style={{
              fontSize: 13,
              backgroundColor: '#e2e8f0',
              padding: '3px 6px',
              borderRadius: 3,
              fontFamily: 'Monaco, monospace',
              color: '#1a1a1a'
            }}>
              {project.inbound_email_local}@{process.env.NEXT_PUBLIC_INBOUND_DOMAIN}
            </code>
          </div>
        </div>

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
              color: activeTab === 'timeline' ? '#007acc' : '#666',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'timeline' ? '2px solid #007acc' : '2px solid transparent',
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
              color: activeTab === 'costs' ? '#007acc' : '#666',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'costs' ? '2px solid #007acc' : '2px solid transparent',
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
        {/* Step Distribution Summary */}
        {stepCounts && Object.keys(stepCounts).length > 0 && (
          <div style={{
            marginBottom: 20,
            padding: '12px 16px',
            backgroundColor: '#fafafa',
            border: '1px solid #e5e5e5',
            borderRadius: 4,
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            {['hypothesis', 'experiment', 'observation', 'evaluation', 'conclusion'].map(step => {
              const count = stepCounts[step] || 0;
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
                    padding: '4px 10px',
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    color: count === 0 ? '#999' : (isActive ? '#007acc' : '#333'),
                    backgroundColor: isActive ? '#f0f9ff' : 'transparent',
                    border: 'none',
                    borderRadius: 3,
                    cursor: 'pointer',
                    textDecoration: isActive ? 'underline' : 'none'
                  }}
                  title={`Click to ${isActive ? 'remove' : 'add'} ${label} filter`}
                >
                  {label}: {count}
                </button>
              );
            })}
            {filterSteps.size > 0 && (
              <button
                onClick={() => setFilterSteps(new Set())}
                style={{
                  padding: '4px 8px',
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#666',
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: 3,
                  cursor: 'pointer',
                  marginLeft: 'auto'
                }}
              >
                Clear filter{filterSteps.size > 1 ? 's' : ''}
              </button>
            )}
          </div>
        )}

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
              <a
                href={`/p/${token}/upload`}
                style={{
                  padding: '6px 12px',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#666',
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: 3,
                  cursor: 'pointer',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                📎 Upload file
              </a>
              <QuickNoteForm token={token} />
            </div>
          </div>

          {items && items.length > 0 ? (
            <div>
              {items.filter(ev => !deletedIds.has(ev.id)).filter(ev => {
                if (filterSteps.size === 0) return true;
                const currentEvidence = evidenceSteps[ev.id] || {
                  step: ev.systematic_step_primary,
                  source: ev.systematic_step_source || 'auto'
                };
                return filterSteps.has(currentEvidence.step);
              }).map((ev, index) => {
                const currentEvidence = evidenceSteps[ev.id] || {
                  step: ev.systematic_step_primary,
                  source: ev.systematic_step_source || 'auto'
                };

                return (
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
                        {currentEvidence.step && currentEvidence.step !== 'Unknown' && (
                          <>
                            <span>·</span>
                            <span style={{
                              color: '#1a1a1a',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3
                            }}>
                              {currentEvidence.step}
                              <span
                                style={{
                                  fontSize: 9,
                                  color: currentEvidence.source === 'manual' ? '#007acc' : '#999',
                                  fontWeight: 400
                                }}
                                title={currentEvidence.source === 'manual' ? 'Manually classified' : 'AI classified'}
                              >
                                {currentEvidence.source === 'manual' ? '●' : '○'}
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
                      <EvidenceKebabMenu
                        evidenceId={ev.id}
                        token={token}
                        currentStep={currentEvidence.step}
                        onStepChange={(step) => {
                          setEvidenceSteps(prev => ({
                            ...prev,
                            [ev.id]: { step, source: 'manual' }
                          }));
                        }}
                        onDelete={() => {
                          setDeletedIds(prev => new Set([...prev, ev.id]));
                        }}
                      />
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

                    {/* Attachment */}
                    {ev.file_url && (
                      <div style={{ marginTop: 8 }}>
                        <a
                          href={ev.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            color: '#007acc',
                            textDecoration: 'none',
                            fontSize: 13,
                            fontWeight: 400,
                            padding: '4px 8px',
                            backgroundColor: '#f8f8f8',
                            borderRadius: 3,
                            border: '1px solid #e5e5e5'
                          }}
                        >
                          📎 attachment
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{
              padding: 40,
              textAlign: 'center',
              color: '#666'
            }}>
              <p style={{
                fontSize: 14,
                margin: '0 0 4px 0'
              }}>No evidence yet</p>
              <p style={{
                fontSize: 13,
                margin: 0
              }}>Add your first note or email updates to get started</p>
            </div>
          )}
        </div>
          </div>
        )}

        {/* Costs Tab Content */}
        {activeTab === 'costs' && (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: '#666',
            backgroundColor: '#fafafa',
            borderRadius: 4,
            border: '1px solid #e5e5e5'
          }}>
            <p style={{ margin: 0, fontSize: 14 }}>
              Costs tracking will be available here soon.
            </p>
          </div>
        )}

          </div>
          {/* End main content column */}
        </div>
        {/* End two column layout */}

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