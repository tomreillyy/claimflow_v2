'use client';
import { useState, useEffect } from 'react';
import ActivityDetailView from './ActivityDetailView';

const STEP_LABELS = ['Hypothesis', 'Experiment', 'Observation', 'Evaluation', 'Conclusion'];
const STEP_SHORT = ['H', 'E', 'O', 'Ev', 'C'];
const STEP_COLORS = {
  Hypothesis: '#6366f1',
  Experiment: '#0ea5e9',
  Observation: '#10b981',
  Evaluation: '#f59e0b',
  Conclusion: '#8b5cf6',
};

export default function ActivitiesView({ token, activities, allEvidence, onActivitiesChange }) {
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [stepCoverageMap, setStepCoverageMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUncertainty, setNewUncertainty] = useState('');
  const [creating, setCreating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Fetch step coverage for all activities
  useEffect(() => {
    if (!activities || activities.length === 0) {
      setLoading(false);
      return;
    }

    const fetchCoverage = async () => {
      const coverageMap = {};
      await Promise.all(
        activities.map(async (act) => {
          try {
            const res = await fetch(`/api/projects/${token}/core-activities/${act.id}/evidence`);
            if (res.ok) {
              const data = await res.json();
              coverageMap[act.id] = data.steps;
            }
          } catch {
            coverageMap[act.id] = {};
          }
        })
      );
      setStepCoverageMap(coverageMap);
      setLoading(false);
    };
    fetchCoverage();
  }, [activities, token]);

  const handleCreate = async () => {
    if (!newName.trim() || !newUncertainty.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/projects/${token}/core-activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), uncertainty: newUncertainty.trim() })
      });
      if (res.ok) {
        const activity = await res.json();
        onActivitiesChange([...activities, activity]);
        setNewName('');
        setNewUncertainty('');
        setIsCreating(false);
      }
    } catch (err) {
      console.error('Failed to create activity:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleAdopt = async (activityId) => {
    try {
      const { data: { session } } = await (await import('@/lib/supabaseClient')).supabase.auth.getSession();
      const res = await fetch(`/api/projects/${token}/core-activities/${activityId}/adopt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        }
      });
      if (res.ok) {
        const updated = await res.json();
        onActivitiesChange(activities.map(a => a.id === activityId ? updated : a));
        return true;
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to adopt activity');
        return false;
      }
    } catch (err) {
      console.error('Failed to adopt:', err);
      return false;
    }
  };

  const handleUpdate = async (id, updates) => {
    try {
      const res = await fetch(`/api/projects/${token}/core-activities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const updated = await res.json();
        onActivitiesChange(activities.map(a => a.id === id ? updated : a));
        if (selectedActivity?.id === id) setSelectedActivity(updated);
      }
    } catch (err) {
      console.error('Failed to update activity:', err);
    }
  };

  const linkEvidence = async (currentActivities) => {
    await fetch(`/api/projects/${token}/core-activities/link-evidence`, { method: 'POST' });
    // Refresh coverage — use passed-in list to avoid stale closure
    const acts = currentActivities || activities;
    if (acts && acts.length > 0) {
      const coverageMap = {};
      await Promise.all(acts.map(async (act) => {
        try {
          const res = await fetch(`/api/projects/${token}/core-activities/${act.id}/evidence`);
          if (res.ok) coverageMap[act.id] = (await res.json()).steps;
        } catch {}
      }));
      setStepCoverageMap(coverageMap);
    }
  };

  const handleRegenerate = async () => {
    if (!confirm('This will delete all draft activities and re-generate them from your evidence. Adopted activities are kept. Continue?')) return;
    setRegenerating(true);
    try {
      const { data: { session } } = await (await import('@/lib/supabaseClient')).supabase.auth.getSession();
      await fetch(`/api/projects/${token}/core-activities/regenerate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      // Re-fetch activities (GET will auto-generate new ones)
      const res = await fetch(`/api/projects/${token}/core-activities`);
      if (res.ok) {
        const data = await res.json();
        const newActivities = data.activities || [];
        onActivitiesChange(newActivities);
        // Pass new activities directly to avoid stale closure
        await linkEvidence(newActivities);
      }
    } catch (err) {
      console.error('Regenerate failed:', err);
    } finally {
      setRegenerating(false);
    }
  };

  const refreshCoverage = async (activityId) => {
    try {
      const res = await fetch(`/api/projects/${token}/core-activities/${activityId}/evidence`);
      if (res.ok) {
        const data = await res.json();
        setStepCoverageMap(prev => ({ ...prev, [activityId]: data.steps }));
      }
    } catch {}
  };

  // If an activity is selected, show the detail view
  if (selectedActivity) {
    return (
      <ActivityDetailView
        activity={selectedActivity}
        token={token}
        allEvidence={allEvidence}
        stepCoverage={stepCoverageMap[selectedActivity.id] || {}}
        onBack={() => {
          setSelectedActivity(null);
          refreshCoverage(selectedActivity.id);
        }}
        onAdopt={handleAdopt}
        onUpdate={handleUpdate}
        onCoverageChange={() => refreshCoverage(selectedActivity.id)}
      />
    );
  }

  const draftCount = activities.filter(a => a.status === 'draft' || !a.status).length;
  const adoptedCount = activities.filter(a => a.status === 'adopted').length;

  return (
    <div style={{ padding: '20px 0' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24
      }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#0f172a', margin: '0 0 4px 0' }}>
            R&D Activities
          </h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            {adoptedCount > 0
              ? `${adoptedCount} adopted, ${draftCount} draft`
              : 'Review and adopt activities to build your claim'}
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#021048',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#031560'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#021048'}
        >
          + Add Activity
        </button>
      </div>

      {/* AI-generated banner */}
      {draftCount > 0 && activities.some(a => a.source === 'ai') && (
        <div style={{
          padding: '14px 20px',
          backgroundColor: '#f0f4ff',
          border: '1px solid #c7d2fe',
          borderRadius: 8,
          marginBottom: 20,
          fontSize: 14,
          color: '#3730a3',
          lineHeight: 1.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
        }}>
          <span>
            We identified <strong>{draftCount} potential R&D {draftCount === 1 ? 'activity' : 'activities'}</strong> based on your evidence.
            Review each one and adopt when ready.
          </span>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              onClick={linkEvidence}
              disabled={regenerating}
              style={{
                padding: '6px 14px',
                backgroundColor: '#021048',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                cursor: regenerating ? 'default' : 'pointer',
                opacity: regenerating ? 0.6 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              Link evidence
            </button>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              style={{
                padding: '6px 14px',
                backgroundColor: 'white',
                color: '#3730a3',
                border: '1px solid #a5b4fc',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                cursor: regenerating ? 'default' : 'pointer',
                opacity: regenerating ? 0.6 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {regenerating ? 'Regenerating...' : 'Regenerate'}
            </button>
          </div>
        </div>
      )}

      {/* Manual creation form */}
      {isCreating && (
        <div style={{
          padding: 20,
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          marginBottom: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 12 }}>
            New Activity
          </div>
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Activity name (3-6 words, e.g., 'Anomaly detection thresholding')"
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: 14,
              border: '1px solid #d1d5db',
              borderRadius: 6,
              outline: 'none',
              marginBottom: 10,
              boxSizing: 'border-box',
              color: '#1a1a1a',
              backgroundColor: 'white'
            }}
            onFocus={e => e.target.style.borderColor = '#021048'}
            onBlur={e => e.target.style.borderColor = '#d1d5db'}
          />
          <textarea
            value={newUncertainty}
            onChange={e => setNewUncertainty(e.target.value)}
            placeholder="What technical uncertainty does this activity explore? (1-2 sentences)"
            rows={3}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: 14,
              border: '1px solid #d1d5db',
              borderRadius: 6,
              outline: 'none',
              resize: 'vertical',
              marginBottom: 12,
              boxSizing: 'border-box',
              color: '#1a1a1a',
              backgroundColor: 'white'
            }}
            onFocus={e => e.target.style.borderColor = '#021048'}
            onBlur={e => e.target.style.borderColor = '#d1d5db'}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim() || !newUncertainty.trim()}
              style={{
                padding: '8px 20px',
                backgroundColor: (creating || !newName.trim() || !newUncertainty.trim()) ? '#94a3b8' : '#021048',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                cursor: (creating || !newName.trim() || !newUncertainty.trim()) ? 'default' : 'pointer'
              }}
            >
              {creating ? 'Creating...' : 'Create Activity'}
            </button>
            <button
              onClick={() => { setIsCreating(false); setNewName(''); setNewUncertainty(''); }}
              disabled={creating}
              style={{
                padding: '8px 20px',
                backgroundColor: 'white',
                color: '#64748b',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                cursor: creating ? 'default' : 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Activity Cards */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
          Loading activities...
        </div>
      ) : activities.length === 0 ? (
        <div style={{
          padding: 48,
          textAlign: 'center',
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
        }}>
          <div style={{ fontSize: 15, color: '#374151', marginBottom: 8 }}>
            No activities yet
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
            Activities will be auto-generated once you have enough evidence (5+ items across 2+ systematic steps).
            You can also add them manually.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {activities.map(activity => {
            const coverage = stepCoverageMap[activity.id] || {};
            const coveredSteps = STEP_LABELS.filter(s => (coverage[s] || []).length > 0);
            const totalEvidence = STEP_LABELS.reduce((sum, s) => sum + (coverage[s] || []).length, 0);
            const isDraft = activity.status === 'draft' || !activity.status;
            const isAdopted = activity.status === 'adopted';

            return (
              <div
                key={activity.id}
                onClick={() => setSelectedActivity(activity)}
                style={{
                  padding: 20,
                  backgroundColor: 'white',
                  border: `1px solid ${isAdopted ? '#bbf7d0' : '#e5e7eb'}`,
                  borderRadius: 12,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = isAdopted ? '#86efac' : '#021048';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = isAdopted ? '#bbf7d0' : '#e5e7eb';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                }}
              >
                {/* Top row: status + name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    backgroundColor: isAdopted ? '#dcfce7' : '#fef3c7',
                    color: isAdopted ? '#166534' : '#92400e',
                  }}>
                    {isAdopted ? 'Adopted' : 'Draft'}
                  </span>
                  {activity.source === 'ai' && (
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>AI-generated</span>
                  )}
                </div>

                {/* Activity name */}
                <div style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#0f172a',
                  marginBottom: 6,
                  lineHeight: 1.3,
                }}>
                  {activity.name}
                </div>

                {/* Uncertainty */}
                <div style={{
                  fontSize: 13,
                  color: '#64748b',
                  lineHeight: 1.5,
                  marginBottom: 14,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {activity.uncertainty}
                </div>

                {/* Bottom row: evidence count + step coverage */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {/* Step coverage pills */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    {STEP_LABELS.map((step, i) => {
                      const filled = (coverage[step] || []).length > 0;
                      return (
                        <div
                          key={step}
                          title={`${step}: ${(coverage[step] || []).length} items`}
                          style={{
                            width: 28,
                            height: 24,
                            borderRadius: 4,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            fontWeight: 600,
                            backgroundColor: filled ? STEP_COLORS[step] + '20' : '#f1f5f9',
                            color: filled ? STEP_COLORS[step] : '#cbd5e1',
                            border: `1px solid ${filled ? STEP_COLORS[step] + '40' : '#e2e8f0'}`,
                          }}
                        >
                          {STEP_SHORT[i]}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>
                      {totalEvidence} evidence {totalEvidence === 1 ? 'item' : 'items'}
                    </span>
                    <span style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: '#021048',
                    }}>
                      {isDraft ? 'Review & Confirm \u2192' : 'View Details \u2192'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
