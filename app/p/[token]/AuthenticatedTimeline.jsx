'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { Header } from '@/components/Header';
import QuickNoteForm from './quick-note-form';
import CoreActivitiesList from '@/components/CoreActivitiesList';
import ActionsRow from '@/components/ActionsRow';
import SimplifiedCostsPage from '@/components/SimplifiedCostsPage';

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

// Hook to fetch signed URLs for private evidence files
function useSignedUrls(token, evidenceItems) {
  const [signedUrls, setSignedUrls] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token || !evidenceItems || evidenceItems.length === 0) return;

    // Extract evidence IDs that have file_url
    const evidenceWithFiles = evidenceItems.filter(ev => ev.file_url);
    if (evidenceWithFiles.length === 0) return;

    const evidenceIds = evidenceWithFiles.map(ev => ev.id);

    setLoading(true);

    // Fetch signed URLs in batch
    fetch(`/api/evidence/${token}/signed-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evidence_ids: evidenceIds })
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.signedUrls) {
          setSignedUrls(data.signedUrls);
        }
      })
      .catch(err => {
        console.error('Failed to fetch signed URLs:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, evidenceItems?.length]); // Re-fetch when evidence list changes

  return { signedUrls, loading };
}

function EvidenceKebabMenu({ evidenceId, token, currentStep, currentAuthor, onStepChange, onDelete, onReassign }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showStepPicker, setShowStepPicker] = useState(false);
  const [showReassign, setShowReassign] = useState(false);
  const [people, setPeople] = useState([]);
  const [newAuthor, setNewAuthor] = useState('');
  const [reassigning, setReassigning] = useState(false);

  const steps = ['Hypothesis', 'Experiment', 'Observation', 'Evaluation', 'Conclusion', 'Unknown'];

  // Fetch people when reassign is shown
  useEffect(() => {
    if (showReassign && people.length === 0) {
      fetch(`/api/projects/${token}/people`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.people) {
            setPeople(data.people);
          }
        })
        .catch(err => console.error('Failed to fetch people:', err));
    }
  }, [showReassign, token, people.length]);

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

  const handleReassign = async (e) => {
    e.preventDefault();
    if (!newAuthor) return;

    setReassigning(true);

    try {
      const response = await fetch(`/api/evidence/${token}/reassign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidence_id: evidenceId,
          new_author_email: newAuthor
        })
      });

      if (!response.ok) {
        throw new Error('Failed to reassign');
      }

      // Call parent callback to update UI
      if (onReassign) {
        onReassign(newAuthor);
      }

      setShowReassign(false);
      setIsOpen(false);
      setNewAuthor('');

      // Reload to show updated data
      window.location.reload();
    } catch (err) {
      console.error('Failed to reassign:', err);
      alert('Failed to reassign evidence');
    } finally {
      setReassigning(false);
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
            {!showStepPicker && !showReassign ? (
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
                  Re-classify step
                </button>
                <button
                  onClick={() => setShowReassign(true)}
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
                  Reassign person
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
            ) : showStepPicker ? (
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
            ) : showReassign ? (
              <form onSubmit={handleReassign} style={{ padding: 12, minWidth: 250 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, color: '#333' }}>
                  Reassign to:
                </div>
                {currentAuthor && (
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                    Currently: {currentAuthor}
                  </div>
                )}
                <select
                  value={newAuthor}
                  onChange={e => setNewAuthor(e.target.value)}
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    fontSize: 13,
                    border: '1px solid #ddd',
                    borderRadius: 3,
                    marginBottom: 8,
                    outline: 'none'
                  }}
                >
                  <option value="">Select person...</option>
                  {people.map(person => (
                    <option key={person.email} value={person.email}>
                      {person.name}
                    </option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowReassign(false);
                      setNewAuthor('');
                    }}
                    style={{
                      padding: '5px 12px',
                      fontSize: 12,
                      color: '#666',
                      backgroundColor: 'white',
                      border: '1px solid #ddd',
                      borderRadius: 3,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reassigning || !newAuthor}
                    style={{
                      padding: '5px 12px',
                      fontSize: 12,
                      color: 'white',
                      backgroundColor: (reassigning || !newAuthor) ? '#ccc' : '#021048',
                      border: 'none',
                      borderRadius: 3,
                      cursor: (reassigning || !newAuthor) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {reassigning ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

export function AuthenticatedTimeline({ project, items, token }) {
  const { user, loading } = useAuth();
  const stepHint = useStepGapHint(token);
  const { signedUrls, loading: signedUrlsLoading } = useSignedUrls(token, items);
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
  const [showRdOnly, setShowRdOnly] = useState(false);
  const [activeTab, setActiveTab] = useState('timeline');

  // Costs tab state
  const [uploadData, setUploadData] = useState(null);
  const [showMapper, setShowMapper] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(null);
  const [attestations, setAttestations] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [hasAttestations, setHasAttestations] = useState(false);
  const [costsLoading, setCostsLoading] = useState(false);

  // GitHub integration state
  const [githubRepo, setGithubRepo] = useState(null);
  const [githubHasAuth, setGithubHasAuth] = useState(false);
  const [githubSyncing, setGithubSyncing] = useState(false);
  const [githubConnecting, setGithubConnecting] = useState(false);
  const [showRepoPicker, setShowRepoPicker] = useState(false);
  const [availableRepos, setAvailableRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [githubError, setGithubError] = useState('');

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

  // Fetch GitHub connection status
  useEffect(() => {
    if (!token) return;

    fetch(`/api/projects/${token}/github/connect`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setGithubHasAuth(data.has_auth);
          setGithubRepo(data.repo);
          // Check for connection callback - fetch repos if just connected
          const params = new URLSearchParams(window.location.search);
          if (params.get('github_connected') === 'true' && data.has_auth && !data.repo) {
            setShowRepoPicker(true);
            fetchAvailableRepos();
          }
        }
      })
      .catch(err => console.error('Failed to fetch GitHub status:', err));
  }, [token]);

  // Fetch available GitHub repositories
  const fetchAvailableRepos = async () => {
    setLoadingRepos(true);
    setGithubError('');

    try {
      const response = await fetch(`/api/projects/${token}/github/repos`);
      const data = await response.json();

      if (!response.ok) {
        setGithubError(data.error || 'Failed to fetch repositories');
        return;
      }

      setAvailableRepos(data.repos || []);
    } catch (error) {
      console.error('Failed to fetch repos:', error);
      setGithubError('Failed to fetch repositories');
    } finally {
      setLoadingRepos(false);
    }
  };

  // Fetch costs data when Costs tab is active
  useEffect(() => {
    if (!token || activeTab !== 'costs') return;
    fetchCostsData();
  }, [token, activeTab]);

  const fetchCostsData = async () => {
    setCostsLoading(true);
    try {
      const costsRes = await fetch(`/api/projects/${token}/costs`);

      if (costsRes.ok) {
        const costsData = await costsRes.json();
        setLedger(costsData.ledger || []);
        setAttestations(costsData.attestations || []);
        setHasAttestations(costsData.hasAttestations || false);
      }
    } catch (err) {
      console.error('Failed to fetch costs data:', err);
    } finally {
      setCostsLoading(false);
    }
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 2000);
  };

  // GitHub handlers
  const handleConnectGitHub = () => {
    window.location.href = `/api/github/auth/start?project_token=${token}`;
  };

  const handleConnectRepo = async (e) => {
    e.preventDefault();
    if (!selectedRepo) return;

    setGithubConnecting(true);
    setGithubError('');

    try {
      const [repo_owner, repo_name] = selectedRepo.split('/');

      const response = await fetch(`/api/projects/${token}/github/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_owner, repo_name })
      });

      const data = await response.json();

      if (!response.ok) {
        setGithubError(data.error || 'Failed to connect repository');
        return;
      }

      setGithubRepo(data.repo);
      setShowRepoPicker(false);
      setSelectedRepo('');
      showToast('Repository connected!');

      // Clean up URL
      window.history.replaceState({}, '', `/p/${token}`);
    } catch (error) {
      console.error('Failed to connect repo:', error);
      setGithubError('Failed to connect repository');
    } finally {
      setGithubConnecting(false);
    }
  };

  const handleSyncGitHub = async () => {
    setGithubSyncing(true);
    setGithubError('');

    try {
      const response = await fetch(`/api/projects/${token}/github/sync`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok) {
        setGithubError(data.error || 'Failed to sync commits');
        showToast('Sync failed');
        return;
      }

      // Use the detailed message from the API
      showToast(data.message || `Synced ${data.synced} commits`);

      // Log detailed reasons to console for debugging
      if (data.reasons) {
        console.log('[GitHub Sync] Detailed results:', data.reasons);
      }

      // Reload page to show new evidence (only if we synced something)
      if (data.synced > 0) {
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (error) {
      console.error('Failed to sync:', error);
      setGithubError('Failed to sync commits');
      showToast('Sync failed');
    } finally {
      setGithubSyncing(false);
    }
  };

  const handleDisconnectGitHub = async () => {
    if (!confirm('Disconnect GitHub? This will not delete existing evidence from commits.')) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${token}/github/disconnect`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      setGithubRepo(null);
      setGithubHasAuth(false);
      showToast('GitHub disconnected');
    } catch (error) {
      console.error('Failed to disconnect:', error);
      setGithubError('Failed to disconnect GitHub');
    }
  };

  // Costs tab handlers
  const handleUploadComplete = (data) => {
    setUploadData(data);
    setShowMapper(true);
    setConfirmSuccess(null);
  };

  const handleMapperComplete = (result) => {
    setShowMapper(false);
    setUploadData(null);
    setConfirmSuccess(result.message);
    fetchCostsData();
    setTimeout(() => setConfirmSuccess(null), 5000);
  };

  const handleMapperCancel = () => {
    setShowMapper(false);
    setUploadData(null);
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
                  onFocus={e => e.target.style.borderColor = '#021048'}
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
                  backgroundColor: authLoading ? '#ccc' : '#021048',
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

  // Calculate data for ActionsRow
  const totalEvidence = items?.length || 0;
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weeklyEvidence = items?.filter(ev => new Date(ev.created_at) >= oneWeekAgo).length || 0;

  // Calculate coverage data
  const coveredSteps = Object.entries(stepCounts || {})
    .filter(([_, count]) => count > 0)
    .length;
  const missingSteps = ['Hypothesis', 'Experiment', 'Observation', 'Evaluation', 'Conclusion']
    .filter(step => !stepCounts || stepCounts[step.toLowerCase()] === 0);

  // Show the authenticated timeline
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
    }}>
      <Header projectName={project.name} projectToken={token} />

      <main style={{
        maxWidth: 1600,
        margin: '0 auto',
        padding: '40px 48px'
      }}>
        {/* Action buttons */}
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
          marginBottom: 16
        }}>
            {!githubRepo && !showRepoPicker && (
              <button
                onClick={handleConnectGitHub}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#24292f',
                  backgroundColor: 'white',
                  border: '1px solid #d0d7de',
                  borderRadius: 3,
                  cursor: 'pointer'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
                </svg>
                GitHub
              </button>
            )}
            {githubRepo && (
              <button
                onClick={handleSyncGitHub}
                disabled={githubSyncing}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  fontSize: 13,
                  fontWeight: 500,
                  color: githubSyncing ? '#999' : '#24292f',
                  backgroundColor: 'white',
                  border: '1px solid #d0d7de',
                  borderRadius: 3,
                  cursor: githubSyncing ? 'not-allowed' : 'pointer'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
                </svg>
                {githubSyncing ? 'Syncing...' : 'Sync'}
              </button>
            )}
            <a
              href={`/p/${token}/pack`}
              target="_blank"
              style={{
                padding: '6px 12px',
                backgroundColor: '#021048',
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

        {/* Main content */}
        <div style={{
          maxWidth: 1200,
          margin: '0 auto'
        }}>
            {/* GitHub Repository Picker */}
            {showRepoPicker && (
              <div style={{
                padding: 20,
                background: '#f6f8fa',
                borderRadius: 8,
                marginBottom: 20,
                border: '1px solid #e5e5e5'
              }}>
                <h3 style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#1a1a1a',
                  margin: '0 0 12px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <svg width="20" height="20" viewBox="0 0 16 16" fill="#24292f">
                    <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
                  </svg>
                  Select Repository
                </h3>
                <p style={{
                  fontSize: 14,
                  color: '#666',
                  margin: '0 0 16px 0'
                }}>
                  Choose which repository to sync commits from
                </p>
                <form onSubmit={handleConnectRepo}>
                  {loadingRepos ? (
                    <div style={{
                      padding: 16,
                      textAlign: 'center',
                      color: '#666',
                      fontSize: 14
                    }}>
                      Loading your repositories...
                    </div>
                  ) : (
                    <select
                      value={selectedRepo}
                      onChange={(e) => setSelectedRepo(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: 14,
                        border: '1px solid #ddd',
                        borderRadius: 6,
                        outline: 'none',
                        marginBottom: 12,
                        backgroundColor: 'white'
                      }}
                    >
                      <option value="">Select a repository...</option>
                      {availableRepos.map(repo => (
                        <option key={repo.full_name} value={repo.full_name}>
                          {repo.full_name} {repo.private ? '(Private)' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  {githubError && (
                    <div style={{
                      padding: 10,
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: 6,
                      fontSize: 13,
                      color: '#dc2626',
                      marginBottom: 12
                    }}>
                      {githubError}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="submit"
                      disabled={githubConnecting || loadingRepos || !selectedRepo}
                      style={{
                        padding: '10px 16px',
                        fontSize: 14,
                        fontWeight: 500,
                        color: 'white',
                        backgroundColor: (githubConnecting || loadingRepos || !selectedRepo) ? '#ccc' : '#24292f',
                        border: 'none',
                        borderRadius: 6,
                        cursor: (githubConnecting || loadingRepos || !selectedRepo) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {githubConnecting ? 'Connecting...' : 'Connect'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowRepoPicker(false);
                        setSelectedRepo('');
                        setGithubError('');
                      }}
                      style={{
                        padding: '10px 16px',
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
                </form>
              </div>
            )}

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
          }}>Everything here becomes contemporaneous R&D evidence.</p>

          {/* Hypothesis Section - Collapsed */}
          <details style={{
            marginBottom: 16,
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 4
          }}>
            <summary style={{
              padding: 12,
              fontSize: 13,
              fontWeight: 500,
              color: '#666',
              cursor: 'pointer',
              userSelect: 'none'
            }}>
              Optional project hypothesis
            </summary>
            <div style={{ padding: '0 12px 12px 12px' }}>
              {!isEditingHypothesis ? (
                <>
                  {hypothesis ? (
                    <div style={{
                      padding: 10,
                      backgroundColor: '#f0f9ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: 4,
                      marginBottom: 8
                    }}>
                      <p style={{
                        fontSize: 13,
                        color: '#333',
                        margin: '0 0 4px 0'
                      }}>
                        {hypothesis}
                      </p>
                    </div>
                  ) : (
                    <p style={{
                      fontSize: 12,
                      color: '#999',
                      margin: '0 0 8px 0',
                      fontStyle: 'italic'
                    }}>
                      e.g., "If we cache API responses, latency will drop below 100ms"
                    </p>
                  )}
                  <button
                    onClick={() => setIsEditingHypothesis(true)}
                    style={{
                      padding: '6px 12px',
                      fontSize: 12,
                      fontWeight: 500,
                      color: '#021048',
                      backgroundColor: 'white',
                      border: '1px solid #ddd',
                      borderRadius: 4,
                      cursor: 'pointer'
                    }}
                  >
                    {hypothesis ? 'Edit' : 'Add hypothesis'}
                  </button>
                </>
              ) : (
                <div>
                  <input
                    value={hypothesis}
                    onChange={(e) => setHypothesis(e.target.value)}
                    placeholder='e.g., "If we cache API responses, latency will drop below 100ms"'
                    maxLength={280}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: 13,
                      border: '1px solid #ddd',
                      borderRadius: 4,
                      outline: 'none',
                      color: '#1a1a1a',
                      marginBottom: 8,
                      boxSizing: 'border-box'
                    }}
                  />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={handleSaveHypothesis}
                      disabled={hypothesisSaving}
                      style={{
                        padding: '6px 12px',
                        fontSize: 12,
                        fontWeight: 500,
                        color: 'white',
                        backgroundColor: hypothesisSaving ? '#ccc' : '#021048',
                        border: 'none',
                        borderRadius: 4,
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
                        padding: '6px 12px',
                        fontSize: 12,
                        fontWeight: 500,
                        color: '#666',
                        backgroundColor: 'white',
                        border: '1px solid #ddd',
                        borderRadius: 4,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </details>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: '#f0f9ff',
              border: '1px solid #bfdbfe',
              borderRadius: 16,
              padding: '6px 12px',
              fontSize: 13,
              fontFamily: 'ui-monospace, Monaco, monospace',
              color: '#1a1a1a'
            }}>
              <span>📧</span>
              <span>{project.inbound_email_local}@{process.env.NEXT_PUBLIC_INBOUND_DOMAIN?.split('.')[0]}…</span>
            </div>
            <button
              onClick={() => {
                const email = `${project.inbound_email_local}@${process.env.NEXT_PUBLIC_INBOUND_DOMAIN}`;
                navigator.clipboard.writeText(email);
                showToast('Email copied!');
              }}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 500,
                color: '#021048',
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              Copy
            </button>
          </div>
        </div>

        <ActionsRow
          evidenceCount={totalEvidence}
          weeklyCount={weeklyEvidence}
          githubConnected={!!githubRepo}
          coverageData={{
            covered: coveredSteps,
            total: 5,
            missing: missingSteps
          }}
          token={token}
          onConnectGitHub={handleConnectGitHub}
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
          {stepCounts && Object.keys(stepCounts).length > 0 && (
            <div style={{
              display: 'flex',
              gap: 8,
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
          )}
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
              {items.filter(ev => !deletedIds.has(ev.id))
                .filter(ev => {
                  // R&D filter: only show evidence linked to activities
                  if (showRdOnly && !ev.linked_activity_id) return false;
                  return true;
                })
                .filter(ev => {
                  // Step filter
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
                                  color: currentEvidence.source === 'manual' ? '#021048' : '#999',
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
                        currentAuthor={ev.author_email}
                        onStepChange={(step) => {
                          setEvidenceSteps(prev => ({
                            ...prev,
                            [ev.id]: { step, source: 'manual' }
                          }));
                        }}
                        onDelete={() => {
                          setDeletedIds(prev => new Set([...prev, ev.id]));
                        }}
                        onReassign={(newEmail) => {
                          // Will reload page, so just a placeholder
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
                        {signedUrls[ev.id] ? (
                          <a
                            href={signedUrls[ev.id]}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              color: '#021048',
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
                        ) : signedUrlsLoading ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            color: '#999',
                            fontSize: 13,
                            padding: '4px 8px',
                            backgroundColor: '#f8f8f8',
                            borderRadius: 3,
                            border: '1px solid #e5e5e5'
                          }}>
                            📎 loading...
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            color: '#999',
                            fontSize: 13,
                            padding: '4px 8px',
                            backgroundColor: '#fef2f2',
                            borderRadius: 3,
                            border: '1px solid #fecaca'
                          }}>
                            📎 unavailable
                          </span>
                        )}
                      </div>
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
              activities={coreActivities}
              onUpdate={handleUpdateActivity}
              onCreate={handleSaveCoreActivity}
            />
          </div>
        </div>
          </div>
        )}

        {/* Costs Tab Content */}
        {activeTab === 'costs' && (
          <div style={{ padding: '20px 0' }}>
            {/* Success Banner */}
            {confirmSuccess && (
              <div style={{
                padding: 16,
                backgroundColor: '#e8f5e9',
                border: '1px solid #4caf50',
                borderRadius: 6,
                marginBottom: 24,
                fontSize: 14,
                color: '#2e7d32',
                fontWeight: 500
              }}>
                ✓ {confirmSuccess}
              </div>
            )}

            <SimplifiedCostsPage
              projectToken={token}
              activities={coreActivities}
              onUpdate={fetchCostsData}
            />
          </div>
        )}

        </div>
        {/* End main content */}

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