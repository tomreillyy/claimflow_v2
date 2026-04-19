'use client';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { Header } from '@/components/Header';
import { ConsultantBreadcrumb } from '@/components/ConsultantBreadcrumb';
import ProjectSidebar from '@/components/ProjectSidebar';
import ProjectTeam from '@/components/ProjectTeam';
import QuickNoteForm from './quick-note-form';
import CoreActivitiesList from '@/components/CoreActivitiesList';
import ActivitiesView from '@/components/ActivitiesView';
import SimplifiedCostsPage from '@/components/SimplifiedCostsPage';
import KnowledgeBase from '@/components/KnowledgeBase';
import JiraReviewPanel from '@/components/JiraReviewPanel';
import JiraProjectPicker from '@/components/JiraProjectPicker';
import RecordsPage from '@/components/RecordsPage';
import ProjectDashboard from '@/components/ProjectDashboard';
import ProjectDetails from '@/components/ProjectDetails';
import WorkspaceView from '@/components/WorkspaceView';
import ProjectSettings from '@/components/ProjectSettings';

// Hook to fetch step counts and compute gap hint
function useStepGapHint(token) {
  const [hint, setHint] = useState('');

  useEffect(() => {
    if (!token) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      const headers = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};
      fetch(`/api/evidence/${token}/step-counts`, { headers })
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
    });
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

function EvidenceKebabMenu({ evidenceId, token, currentStep, currentActivityType, currentAuthor, onStepChange, onActivityTypeChange, onDelete, onReassign }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showStepPicker, setShowStepPicker] = useState(false);
  const [showActivityTypePicker, setShowActivityTypePicker] = useState(false);
  const [showReassign, setShowReassign] = useState(false);
  const [people, setPeople] = useState([]);
  const [newAuthor, setNewAuthor] = useState('');
  const [reassigning, setReassigning] = useState(false);

  const steps = ['Hypothesis', 'Experiment', 'Observation', 'Evaluation', 'Conclusion', 'Unknown'];
  const activityTypes = [
    { value: 'core', label: 'Core R&D' },
    { value: 'supporting', label: 'Supporting R&D' }
  ];

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

  const handleActivityTypeSelect = async (activity_type) => {
    // Optimistic update - UI changes immediately
    onActivityTypeChange(activity_type);
    setShowActivityTypePicker(false);
    setIsOpen(false);

    // Then call API in background
    try {
      await fetch(`/api/evidence/${token}/set-activity-type`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidence_id: evidenceId, activity_type })
      });
    } catch (err) {
      console.error('Failed to update activity type:', err);
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
              setShowActivityTypePicker(false);
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
            {!showStepPicker && !showActivityTypePicker && !showReassign ? (
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
                  onClick={() => setShowActivityTypePicker(true)}
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
                  Re-classify activity type
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
            ) : showActivityTypePicker ? (
              <div style={{ padding: '4px 0' }}>
                {activityTypes.map(type => (
                  <button
                    key={type.value}
                    onClick={() => handleActivityTypeSelect(type.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: 'none',
                      background: currentActivityType?.activity_type === type.value ? '#f0f9ff' : 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: 13,
                      color: '#333',
                      fontWeight: currentActivityType?.activity_type === type.value ? 500 : 400
                    }}
                    onMouseEnter={e => e.target.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={e => e.target.style.backgroundColor = currentActivityType?.activity_type === type.value ? '#f0f9ff' : 'transparent'}
                  >
                    {type.label}
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

export function AuthenticatedTimeline({ project: initialProject, items, token }) {
  const [project, setProject] = useState(initialProject);
  const { user, loading, isConsultant } = useAuth();
  const stepHint = useStepGapHint(token);
  const { signedUrls, loading: signedUrlsLoading } = useSignedUrls(token, items);
  const [stepCounts, setStepCounts] = useState(() => {
    // Compute step counts directly from server-fetched items
    const counts = { hypothesis: 0, experiment: 0, observation: 0, evaluation: 0, conclusion: 0 };
    (items || []).forEach(ev => {
      const step = ev.systematic_step_primary;
      if (step && step !== 'Unknown') {
        const key = step.toLowerCase();
        if (counts.hasOwnProperty(key)) counts[key]++;
      }
    });
    return counts;
  });
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
  const [evidenceActivityTypes, setEvidenceActivityTypes] = useState(() => {
    const typeMap = {};
    items?.forEach(ev => {
      typeMap[ev.id] = {
        activity_type: ev.activity_type || 'core',
        source: ev.activity_type_source || 'auto'
      };
    });
    return typeMap;
  });
  const [hypothesis, setHypothesis] = useState(project.current_hypothesis || '');
  const [isEditingHypothesis, setIsEditingHypothesis] = useState(false);
  const [hypothesisSaving, setHypothesisSaving] = useState(false);
  const [coreActivities, setCoreActivities] = useState([]);
  const [toast, setToast] = useState('');
  const [activitiesFetched, setActivitiesFetched] = useState(false);
  const [filterSteps, setFilterSteps] = useState(new Set());
  const [showRdOnly, setShowRdOnly] = useState(false);

  // Costs tab state
  const [uploadData, setUploadData] = useState(null);
  const [showMapper, setShowMapper] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(null);
  const [attestations, setAttestations] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [hasAttestations, setHasAttestations] = useState(false);
  const [costsLoading, setCostsLoading] = useState(false);
  const [costSummary, setCostSummary] = useState(null);
  const [taxBenefit, setTaxBenefit] = useState(null);

  // GitHub integration state
  const [githubRepo, setGithubRepo] = useState(null);
  const [githubHasAuth, setGithubHasAuth] = useState(false);
  const [githubSyncing, setGithubSyncing] = useState(false);
  const [githubConnecting, setGithubConnecting] = useState(false);
  const [showRepoPicker, setShowRepoPicker] = useState(false);
  const [availableRepos, setAvailableRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [filterBranches, setFilterBranches] = useState('');
  const [filterKeywords, setFilterKeywords] = useState('');
  const [editingFilters, setEditingFilters] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [githubError, setGithubError] = useState('');

  // Jira integration state
  const [jiraConnection, setJiraConnection] = useState(null);
  const [jiraHasAuth, setJiraHasAuth] = useState(false);
  const [showJiraPicker, setShowJiraPicker] = useState(false);

  // Consultant breadcrumb context + view state (controlled by sidebar)
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get('view') || 'dashboard';
  const [consultantBreadcrumb, setConsultantBreadcrumb] = useState(() => {
    if (typeof window === 'undefined') return null;
    const cid = searchParams.get('cid');
    const cn = searchParams.get('cn');
    if (cid && cn) return { clientId: cid, clientName: decodeURIComponent(cn) };
    return null;
  });

  useEffect(() => {
    if (!isConsultant || !token || consultantBreadcrumb) return;

    const fetchContext = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch(`/api/consultant/project-context/${token}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setConsultantBreadcrumb(data);
        }
      } catch (err) {
        console.error('Failed to fetch consultant context:', err);
      }
    };
    fetchContext();
  }, [isConsultant, token, consultantBreadcrumb]);

  // Fetch core activities
  useEffect(() => {
    if (!token || activitiesFetched) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      const headers = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};
      fetch(`/api/projects/${token}/core-activities`, { headers })
        .then(res => res.ok ? res.json() : null)
        .then(activitiesData => {
          if (activitiesData) {
            setCoreActivities(activitiesData.activities || []);
          }
          setActivitiesFetched(true);
        })
        .catch(err => console.error('Failed to fetch data:', err));
    });
  }, [token, activitiesFetched]);

  // Fetch GitHub connection status
  useEffect(() => {
    if (!token) return;

    const fetchGithubStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers = session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {};
        const res = await fetch(`/api/projects/${token}/github/connect`, { headers });
        if (!res.ok) return;
        const data = await res.json();
        setGithubHasAuth(data.has_auth);
        setGithubRepo(data.repo);
        // Check for connection callback - fetch repos if just connected
        const params = new URLSearchParams(window.location.search);
        if (params.get('github_connected') === 'true' && data.has_auth && !data.repo) {
          setShowRepoPicker(true);
          fetchAvailableRepos();
        }
      } catch (err) {
        console.error('Failed to fetch GitHub status:', err);
      }
    };
    fetchGithubStatus();
  }, [token]);

  // Fetch Jira connection status
  useEffect(() => {
    if (!token) return;

    const fetchJiraStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers = session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {};
        const res = await fetch(`/api/projects/${token}/jira/connect`, { headers });
        if (!res.ok) return;
        const data = await res.json();
        setJiraHasAuth(data.hasAuth);
        setJiraConnection(data.connection);
        const params = new URLSearchParams(window.location.search);
        if (params.get('jira_connected') === 'true' && data.hasAuth && !data.connection) {
          setShowJiraPicker(true);
        }
      } catch (err) {
        console.error('Failed to fetch Jira status:', err);
      }
    };
    fetchJiraStatus();
  }, [token]);

  // Fetch available GitHub repositories
  const fetchAvailableRepos = async () => {
    setLoadingRepos(true);
    setGithubError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};
      const response = await fetch(`/api/projects/${token}/github/repos`, { headers });
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
    if (!token || (activeTab !== 'costs' && activeTab !== 'dashboard')) return;
    fetchCostsData();
  }, [token, activeTab]);

  const fetchCostsData = async () => {
    setCostsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};
      const costsRes = await fetch(`/api/projects/${token}/costs`, { headers: authHeaders });

      if (costsRes.ok) {
        const costsData = await costsRes.json();
        setLedger(costsData.ledger || []);
        setAttestations(costsData.attestations || []);
        setHasAttestations(costsData.hasAttestations || false);
        if (costsData.costSummary) setCostSummary(costsData.costSummary);
        if (costsData.taxBenefit) setTaxBenefit(costsData.taxBenefit);
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
  const handleConnectGitHub = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setGithubError('Please sign in to connect GitHub');
        return;
      }
      const res = await fetch('/api/github/auth/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ project_token: token })
      });
      const data = await res.json();
      if (!res.ok) {
        setGithubError(data.error || 'Failed to start GitHub auth');
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      console.error('Failed to start GitHub auth:', err);
      setGithubError('Failed to connect GitHub');
    }
  };

  const handleConnectRepo = async (e) => {
    e.preventDefault();
    if (!selectedRepo) return;

    setGithubConnecting(true);
    setGithubError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const [repo_owner, repo_name] = selectedRepo.split('/');

      // Parse comma-separated filter inputs into arrays
      const branches = filterBranches
        ? filterBranches.split(',').map(b => b.trim()).filter(Boolean)
        : [];
      const keywords = filterKeywords
        ? filterKeywords.split(',').map(k => k.trim()).filter(Boolean)
        : [];

      const response = await fetch(`/api/projects/${token}/github/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({
          repo_owner,
          repo_name,
          filter_branches: branches,
          filter_keywords: keywords
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setGithubError(data.error || 'Failed to connect repository');
        return;
      }

      setGithubRepo(data.repo);
      setShowRepoPicker(false);
      setSelectedRepo('');
      setFilterBranches('');
      setFilterKeywords('');
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
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/projects/${token}/github/sync`, {
        method: 'POST',
        headers: session?.access_token
          ? { 'Authorization': `Bearer ${session.access_token}` }
          : {}
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

  const handleUpdateFilters = async () => {
    setGithubError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const branches = filterBranches
        ? filterBranches.split(',').map(b => b.trim()).filter(Boolean)
        : [];
      const keywords = filterKeywords
        ? filterKeywords.split(',').map(k => k.trim()).filter(Boolean)
        : [];

      const response = await fetch(`/api/projects/${token}/github/connect`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({
          filter_branches: branches,
          filter_keywords: keywords
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setGithubError(data.error || 'Failed to update filters');
        return;
      }

      setGithubRepo(data.repo);
      setEditingFilters(false);
      showToast('Filters updated!');
    } catch (error) {
      console.error('Failed to update filters:', error);
      setGithubError('Failed to update filters');
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
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/projects/${token}/core-activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
        },
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
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/projects/${token}/core-activities/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
        },
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
    if (trimmed.length > 500) {
      alert('Hypothesis must be 500 characters or less');
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

  // Compute guided stepper data
  const stepperData = [
    {
      number: 1,
      title: 'Write your R&D hypothesis',
      complete: !!(project.current_hypothesis?.trim()),
      navigateTo: { view: 'timeline', scrollTo: 'hypothesis-section' },
    },
    {
      number: 2,
      title: 'Capture your first evidence',
      complete: totalEvidence >= 1,
      navigateTo: { view: 'timeline' },
    },
    {
      number: 3,
      title: 'Invite your team',
      complete: (project.participants?.length || 0) > 1,
      navigateTo: { view: 'team' },
    },
    {
      number: 4,
      title: 'Review & adopt activities',
      subtitle: (() => {
        const adopted = coreActivities.filter(a => a.status === 'adopted').length;
        const total = coreActivities.length;
        return total > 0 ? `${adopted}/${total} adopted` : 'No activities yet';
      })(),
      complete: coreActivities.length > 0 && coreActivities.every(a => a.status === 'adopted'),
      navigateTo: { view: 'activities' },
    },
    {
      number: 5,
      title: 'Record your R&D costs',
      complete: (ledger || []).length > 0,
      navigateTo: { view: 'costs' },
    },
    {
      number: 6,
      title: 'Build your claim pack',
      complete: false,
      navigateTo: { href: `/p/${token}/pack` },
    },
  ];

  // Show the authenticated timeline
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
    }}>
      <Header projectName={project.name} projectToken={token} />

      <div style={{ display: 'flex' }}>
        <ProjectSidebar token={token} projectName={project.name} stepperData={stepperData} />

        <main style={{
          flex: 1,
          minWidth: 0,
          padding: activeTab === 'workspace' ? '16px 16px 0' : '40px 48px'
        }}>
        {/* Consultant breadcrumb */}
        {isConsultant && consultantBreadcrumb && (
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <ConsultantBreadcrumb items={[
              { label: 'Clients', href: '/consultant' },
              { label: consultantBreadcrumb.clientName, href: `/consultant/clients/${consultantBreadcrumb.clientId}` },
              { label: project.name },
            ]} />
          </div>
        )}

        {/* Project title and action buttons — hidden on workspace */}
        {activeTab !== 'workspace' && (
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
            }}>{project.name}</h1>
          </div>
        )}

        {/* Workspace Tab Content — full width, outside maxWidth container */}
        {activeTab === 'workspace' && (
          <WorkspaceView
            items={items?.filter(ev => !deletedIds.has(ev.id)) || []}
            evidenceSteps={evidenceSteps}
            evidenceActivityTypes={evidenceActivityTypes}
            activities={coreActivities}
            token={token}
            project={project}
            onActivitiesChange={(updated) => setCoreActivities(updated)}
          />
        )}

        {/* Main content */}
        <div style={{
          maxWidth: 1200,
          margin: '0 auto'
        }}>
        {/* Dashboard Tab Content */}
        {activeTab === 'dashboard' && (
          <ProjectDashboard
            project={project}
            items={items?.filter(ev => !deletedIds.has(ev.id))}
            token={token}
            coreActivities={coreActivities}
            costSummary={costSummary}
            taxBenefit={taxBenefit}
            ledger={ledger}
            onNavigate={(view) => {
              const params = new URLSearchParams(searchParams.toString());
              params.set('view', view);
              router.push(`/p/${token}?${params.toString()}`, { scroll: false });
            }}
          />
        )}

        {/* Project Details Tab Content */}
        {activeTab === 'details' && (
          <ProjectDetails
            project={project}
            token={token}
            onProjectUpdate={(updated) => {
              setProject(prev => ({ ...prev, ...updated }));
              setHypothesis(updated.current_hypothesis || '');
            }}
          />
        )}

        {/* Activities Tab Content */}
        {activeTab === 'activities' && (
          <ActivitiesView
            token={token}
            activities={coreActivities}
            allEvidence={items?.filter(ev => !deletedIds.has(ev.id))}
            onActivitiesChange={(updated) => setCoreActivities(updated)}
          />
        )}

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

          {/* Hypothesis Section */}
          <div id="hypothesis-section" style={{
            margin: '16px 16px',
            backgroundColor: hypothesis && !isEditingHypothesis ? '#f0f9ff' : '#fff',
            border: hypothesis && !isEditingHypothesis ? '1px solid #bfdbfe' : '2px solid #021048',
            borderRadius: 8,
            padding: 16,
          }}>
            {!isEditingHypothesis ? (
              hypothesis ? (
                /* Compact display when hypothesis exists */
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                        R&D Hypothesis
                      </div>
                      <p style={{ fontSize: 14, color: '#1a1a1a', margin: 0, lineHeight: 1.5 }}>
                        {hypothesis}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsEditingHypothesis(true)}
                      style={{
                        padding: '5px 12px',
                        fontSize: 12,
                        fontWeight: 500,
                        color: '#021048',
                        backgroundColor: 'white',
                        border: '1px solid #ddd',
                        borderRadius: 4,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ) : (
                /* Guidance card when hypothesis is empty */
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: '#021048', margin: '0 0 6px 0' }}>
                    What&apos;s your R&D hypothesis?
                  </h3>
                  <p style={{ fontSize: 13, color: '#4b5563', margin: '0 0 12px 0', lineHeight: 1.5 }}>
                    Describe the technical uncertainty you&apos;re investigating. What don&apos;t you know yet, and what are you trying to find out?
                  </p>
                  <div style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: 6,
                    padding: 12,
                    marginBottom: 14,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                      Examples
                    </div>
                    {[
                      '"Can we reduce API response times below 100ms by implementing edge caching, without stale data issues?"',
                      '"Is it feasible to train a model on sparse medical imaging data and still achieve diagnostic-grade accuracy?"',
                      '"Can we build a real-time collaboration engine that maintains consistency across 1000+ concurrent users?"',
                    ].map((ex, i) => (
                      <p key={i} style={{ fontSize: 12, color: '#6b7280', margin: i < 2 ? '0 0 6px 0' : 0, fontStyle: 'italic', lineHeight: 1.4 }}>
                        {ex}
                      </p>
                    ))}
                  </div>
                  <button
                    onClick={() => setIsEditingHypothesis(true)}
                    style={{
                      padding: '8px 16px',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'white',
                      backgroundColor: '#021048',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    Write your hypothesis
                  </button>
                </div>
              )
            ) : (
              /* Edit mode */
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                  R&D Hypothesis
                </div>
                <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                  What technical question are you trying to answer? What&apos;s uncertain about your approach?
                </p>
                <textarea
                  value={hypothesis}
                  onChange={(e) => setHypothesis(e.target.value)}
                  placeholder='e.g., "Can we reduce API response times below 100ms by implementing edge caching, without stale data issues?"'
                  maxLength={500}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: 13,
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    outline: 'none',
                    color: '#1a1a1a',
                    marginBottom: 8,
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    lineHeight: 1.5,
                  }}
                  autoFocus
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={handleSaveHypothesis}
                      disabled={hypothesisSaving}
                      style={{
                        padding: '7px 14px',
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'white',
                        backgroundColor: hypothesisSaving ? '#ccc' : '#021048',
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
                        padding: '7px 14px',
                        fontSize: 13,
                        fontWeight: 500,
                        color: '#6b7280',
                        backgroundColor: 'transparent',
                        border: '1px solid #d1d5db',
                        borderRadius: 6,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>
                    {hypothesis.length}/500
                  </span>
                </div>
              </div>
            )}
          </div>

          {items && items.length > 0 ? (
            <div>
              {items.filter(ev => !deletedIds.has(ev.id))
                .filter(ev => {
                  // R&D filter: show evidence linked to activities OR classified as core R&D
                  if (showRdOnly) {
                    const activityType = evidenceActivityTypes[ev.id]?.activity_type || ev.activity_type || 'core';
                    if (!ev.linked_activity_id && activityType !== 'core') return false;
                  }
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
                        {(() => {
                          const currentActivityType = evidenceActivityTypes[ev.id] || {
                            activity_type: ev.activity_type || 'core',
                            source: ev.activity_type_source || 'auto'
                          };
                          return currentActivityType.activity_type && (
                            <>
                              <span>·</span>
                              <span style={{
                                padding: '2px 6px',
                                fontSize: 11,
                                fontWeight: 600,
                                borderRadius: 3,
                                backgroundColor: currentActivityType.activity_type === 'core' ? '#021048' : '#666',
                                color: 'white',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3
                              }}>
                                {currentActivityType.activity_type === 'core' ? 'Core R&D' : 'Supporting'}
                                <span
                                  style={{
                                    fontSize: 8,
                                    color: currentActivityType.source === 'manual' ? '#fff' : 'rgba(255,255,255,0.6)'
                                  }}
                                  title={currentActivityType.source === 'manual' ? 'Manually classified' : 'AI classified'}
                                >
                                  {currentActivityType.source === 'manual' ? '●' : '○'}
                                </span>
                              </span>
                            </>
                          );
                        })()}
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
                        currentActivityType={evidenceActivityTypes[ev.id] || { activity_type: ev.activity_type || 'core', source: ev.activity_type_source || 'auto' }}
                        currentAuthor={ev.author_email}
                        onStepChange={(step) => {
                          setEvidenceSteps(prev => ({
                            ...prev,
                            [ev.id]: { step, source: 'manual' }
                          }));
                        }}
                        onActivityTypeChange={(activity_type) => {
                          setEvidenceActivityTypes(prev => ({
                            ...prev,
                            [ev.id]: { activity_type, source: 'manual' }
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

                    {/* Jira issue metadata */}
                    {ev.meta?.type === 'jira' && (
                      <div style={{
                        marginTop: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        flexWrap: 'wrap'
                      }}>
                        <a
                          href={ev.meta.jira_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#2684FF',
                            textDecoration: 'none',
                            padding: '4px 8px',
                            backgroundColor: '#e9f2ff',
                            borderRadius: 3,
                            border: '1px solid #b3d4ff'
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="#2684FF">
                            <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24.013 12.487V1.005A1.005 1.005 0 0 0 23.013 0z"/>
                          </svg>
                          {ev.meta.jira_key}
                        </a>
                        {ev.meta.issue_type && (
                          <span style={{
                            fontSize: 11,
                            fontWeight: 500,
                            padding: '2px 8px',
                            borderRadius: 12,
                            backgroundColor: '#e0e7ff',
                            color: '#3730a3'
                          }}>
                            {ev.meta.issue_type}
                          </span>
                        )}
                        {ev.meta.status && (
                          <span style={{
                            fontSize: 11,
                            fontWeight: 500,
                            padding: '2px 8px',
                            borderRadius: 12,
                            backgroundColor: '#f3f4f6',
                            color: '#374151'
                          }}>
                            {ev.meta.status}
                          </span>
                        )}
                        {ev.meta.story_points && (
                          <span style={{
                            fontSize: 11,
                            color: '#9ca3af',
                            fontFamily: 'ui-monospace, Monaco, monospace'
                          }}>
                            {ev.meta.story_points} pts
                          </span>
                        )}
                      </div>
                    )}

                    {/* Knowledge document metadata */}
                    {ev.source === 'document' && ev.meta && (
                      <div style={{
                        marginTop: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: 4,
                          backgroundColor: '#f0f4ff',
                          color: '#021048'
                        }}>
                          {ev.meta.file_type === 'application/pdf' ? 'PDF'
                            : ev.meta.file_type?.includes('word') ? 'DOCX'
                            : ev.meta.file_type === 'text/plain' ? 'TXT'
                            : ev.meta.file_type === 'text/csv' ? 'CSV'
                            : 'FILE'}
                        </span>
                        <span style={{ fontSize: 13, color: '#444', fontWeight: 500 }}>
                          {ev.meta.file_name}
                        </span>
                        {ev.meta.file_size && (
                          <span style={{ fontSize: 12, color: '#888' }}>
                            {ev.meta.file_size < 1024 * 1024
                              ? `${(ev.meta.file_size / 1024).toFixed(1)} KB`
                              : `${(ev.meta.file_size / (1024 * 1024)).toFixed(1)} MB`}
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

        {/* Knowledge Tab Content */}
        {activeTab === 'knowledge' && (
          <div style={{ padding: '20px 0' }}>
            <KnowledgeBase projectToken={token} projectId={project.id} />
          </div>
        )}

        {/* Records Tab Content (unified Jira + GitHub) */}
        {activeTab === 'records' && (
          <div style={{ padding: '20px 0' }}>
            <RecordsPage
              token={token}
              projectId={project.id}
              activities={coreActivities}
            />
          </div>
        )}

        {/* Team Tab Content */}
        {activeTab === 'team' && (
          <div style={{ padding: '20px 0' }}>
            <ProjectTeam projectToken={token} />
          </div>
        )}

        {/* Settings Tab Content */}
        {activeTab === 'settings' && (
          <div style={{ padding: '20px 0' }}>
            <ProjectSettings project={project} token={token} />
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
    </div>
  );
}