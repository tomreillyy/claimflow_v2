'use client';
import { useState, useEffect } from 'react';
import ActivityDetailView from './ActivityDetailView';
import { formatAuditTimestampShort } from '@/lib/formatAuditTimestamp';

const NAVY = '#021048';
const STAGES = ['Hypothesis', 'Experiment', 'Observation', 'Evaluation', 'Conclusion'];
const SRC_LABELS = { manual: 'M', note: 'M', email: '@', github: 'G', document: 'D', upload: 'U' };

function StageDots({ coverage }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {STAGES.map(s => {
        const done = (coverage[s] || []).length > 0;
        return (
          <span key={s} title={s} style={{
            width: 7, height: 7, borderRadius: '50%',
            background: done ? '#16a34a' : '#d1d5db',
            flexShrink: 0,
          }} />
        );
      })}
    </div>
  );
}

function SrcBadge({ src }) {
  return (
    <span style={{
      width: 18, height: 18, borderRadius: 3, flexShrink: 0,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: '#f3f4f6', border: '1px solid #e5e7eb',
      fontSize: 9, fontWeight: 700, color: '#6b7280', fontFamily: 'ui-monospace,monospace',
    }}>
      {SRC_LABELS[src] || '?'}
    </span>
  );
}

function ExpandableText({ text, limit = 200, style = {} }) {
  const [expanded, setExpanded] = useState(false);
  const content = text || '';
  const needsTruncation = content.length > limit;

  return (
    <div style={{ ...style, whiteSpace: 'pre-line' }}>
      {expanded || !needsTruncation ? content : content.slice(0, limit) + '...'}
      {needsTruncation && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          style={{
            display: 'inline', marginLeft: 4, padding: 0, border: 'none', background: 'none',
            fontSize: 12, fontWeight: 500, color: '#2563eb', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {expanded ? 'see less' : 'see more'}
        </button>
      )}
    </div>
  );
}

function EvidenceInbox({ unlinkedEvidence, activities, token, onLinked }) {
  const [linking, setLinking] = useState(null);
  const [toAct, setToAct] = useState('');
  const [toStage, setToStage] = useState('Hypothesis');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (activities.length > 0 && !toAct) setToAct(activities[0].id);
  }, [activities]);

  if (!unlinkedEvidence || unlinkedEvidence.length === 0) return null;

  const fmtDate = (ts) => formatAuditTimestampShort(ts);

  const handleConfirm = async (evidenceId) => {
    if (!toAct) return;
    setSubmitting(true);
    try {
      const { supabase } = await import('@/lib/supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/projects/${token}/core-activities/${toAct}/evidence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ evidence_ids: [evidenceId], step: toStage }),
      });
      if (res.ok) {
        setLinking(null);
        onLinked(evidenceId, toAct);
      }
    } catch (err) {
      console.error('Failed to link from inbox:', err);
    }
    setSubmitting(false);
  };

  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '11px 18px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Uncategorised evidence</span>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
          background: '#fef9c3', color: '#92400e', border: '1px solid #fde68a',
        }}>{unlinkedEvidence.length}</span>
        <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 'auto' }}>link to an activity to include in your claim</span>
      </div>
      <div style={{ padding: '0 18px' }}>
        {unlinkedEvidence.map((ev, i) => (
          <div key={ev.id} style={{ borderTop: i > 0 ? '1px solid #f9fafb' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '10px 0' }}>
              <SrcBadge src={ev.source} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'ui-monospace,monospace', marginBottom: 2, fontWeight: 500 }}>
                  {fmtDate(ev.created_at)}
                </div>
                <ExpandableText text={ev.content} limit={200} style={{ fontSize: 13, color: '#374151', lineHeight: 1.55 }} />
              </div>
              <button
                onClick={() => setLinking(linking === ev.id ? null : ev.id)}
                style={{
                  flexShrink: 0, padding: '4px 10px', fontSize: 12, fontWeight: 500,
                  color: '#374151', background: 'white', border: '1px solid #e5e7eb',
                  borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {linking === ev.id ? 'Cancel' : 'Link'}
              </button>
            </div>
            {linking === ev.id && (
              <div style={{
                margin: '-2px 0 10px 27px', padding: '10px 12px',
                background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb',
                display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontSize: 12, color: '#6b7280' }}>Activity</span>
                <select
                  value={toAct}
                  onChange={e => setToAct(e.target.value)}
                  style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 5, color: '#111827', background: 'white', maxWidth: 200, fontFamily: 'inherit' }}
                >
                  {activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <span style={{ fontSize: 12, color: '#6b7280' }}>Stage</span>
                <div style={{ display: 'flex', gap: 3 }}>
                  {STAGES.map(s => (
                    <button key={s} onClick={() => setToStage(s)} style={{
                      padding: '3px 8px', fontSize: 11, fontWeight: 600, borderRadius: 4, cursor: 'pointer',
                      background: toStage === s ? NAVY : 'white',
                      color: toStage === s ? 'white' : '#6b7280',
                      border: `1px solid ${toStage === s ? NAVY : '#d1d5db'}`,
                      fontFamily: 'inherit',
                    }}>
                      {s.slice(0, 3)}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => handleConfirm(ev.id)}
                  disabled={submitting}
                  style={{
                    padding: '4px 12px', fontSize: 12, fontWeight: 600,
                    background: NAVY, color: 'white', border: 'none',
                    borderRadius: 5, cursor: submitting ? 'default' : 'pointer',
                    fontFamily: 'inherit', opacity: submitting ? 0.7 : 1,
                  }}
                >
                  Confirm
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ActivitiesView({ token, activities, allEvidence, onActivitiesChange }) {
  const [expandedId, setExpandedId] = useState(null);
  const [stepCoverageMap, setStepCoverageMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUncertainty, setNewUncertainty] = useState('');
  const [creating, setCreating] = useState(false);
  const [showAddEvidence, setShowAddEvidence] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [noteAdded, setNoteAdded] = useState(false);

  // Jira CSV import state
  const [showJiraImport, setShowJiraImport] = useState(false);
  const [jiraFile, setJiraFile] = useState(null);
  const [jiraAnalysing, setJiraAnalysing] = useState(false);
  const [jiraResults, setJiraResults] = useState(null);
  const [jiraSelected, setJiraSelected] = useState({});
  const [jiraImporting, setJiraImporting] = useState(false);
  const [jiraError, setJiraError] = useState('');
  const [jiraSuccess, setJiraSuccess] = useState('');

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
              if (data._error) console.error(`[coverage] ${act.id}:`, data._error);
              coverageMap[act.id] = data.steps;
            }
          } catch {
            coverageMap[act.id] = {};
          }
        })
      );
      setStepCoverageMap(coverageMap);
      setLoading(false);

      // Auto-repair: if activities have no linked evidence but step-classified evidence exists,
      // call link-evidence to fix the silent FK-failure from auto-generation
      const hasAnyCoverage = Object.values(coverageMap).some(
        steps => steps && Object.values(steps).some(items => items?.length > 0)
      );
      const VALID_STEPS = ['Hypothesis', 'Experiment', 'Observation', 'Evaluation', 'Conclusion'];
      const hasStepEvidence = (allEvidence || []).some(e => VALID_STEPS.includes(e.systematic_step_primary));
      if (!hasAnyCoverage && hasStepEvidence) {
        await linkEvidence(activities);
      }
    };
    fetchCoverage();
  }, [activities, token]);

  const refreshCoverage = async (activityId) => {
    try {
      const res = await fetch(`/api/projects/${token}/core-activities/${activityId}/evidence`);
      if (res.ok) {
        const data = await res.json();
        setStepCoverageMap(prev => ({ ...prev, [activityId]: data.steps }));
      }
    } catch {}
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newUncertainty.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/projects/${token}/core-activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), uncertainty: newUncertainty.trim() }),
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
      const { supabase } = await import('@/lib/supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/projects/${token}/core-activities/${activityId}/adopt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
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
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        onActivitiesChange(activities.map(a => a.id === id ? updated : a));
      }
    } catch (err) {
      console.error('Failed to update activity:', err);
    }
  };

  const handleUnAdopt = async (activityId) => {
    try {
      const res = await fetch(`/api/projects/${token}/core-activities/${activityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' }),
      });
      if (res.ok) {
        const updated = await res.json();
        onActivitiesChange(activities.map(a => a.id === activityId ? updated : a));
      }
    } catch (err) {
      console.error('Failed to un-adopt:', err);
    }
  };

  // Internal: re-link evidence to activities (used after regenerate)
  const linkEvidence = async (currentActivities) => {
    await fetch(`/api/projects/${token}/core-activities/link-evidence`, { method: 'POST' });
    const acts = currentActivities || activities;
    if (acts && acts.length > 0) {
      const coverageMap = {};
      await Promise.all(acts.map(async (act) => {
        try {
          const res = await fetch(`/api/projects/${token}/core-activities/${act.id}/evidence`);
          if (res.ok) {
            const d = await res.json();
            if (d._error) console.error(`[coverage] ${act.id}:`, d._error);
            coverageMap[act.id] = d.steps;
          }
        } catch {}
      }));
      setStepCoverageMap(coverageMap);
    }
  };

  // Internal: regenerate draft activities (not exposed in UI — call from console if needed)
  const handleRegenerate = async () => {
    if (!confirm('This will delete all draft activities and re-generate them from your evidence. Adopted activities are kept. Continue?')) return;
    setExpandedId(null);
    try {
      const { supabase } = await import('@/lib/supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`/api/projects/${token}/core-activities/regenerate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const res = await fetch(`/api/projects/${token}/core-activities`);
      if (res.ok) {
        const data = await res.json();
        const newActivities = data.activities || [];
        await linkEvidence(newActivities);
        onActivitiesChange(newActivities);
      }
    } catch (err) {
      console.error('Regenerate failed:', err);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      const { supabase } = await import('@/lib/supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/evidence/${token}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ content: newNote.trim() }),
      });
      if (res.ok) {
        setNewNote('');
        setShowAddEvidence(false);
        setNoteAdded(true);
        setTimeout(() => setNoteAdded(false), 4000);
        // Auto-link the new evidence into existing activities
        if (activities.length > 0) linkEvidence(activities);
      }
    } catch (err) {
      console.error('Failed to add note:', err);
    }
    setAddingNote(false);
  };

  // Compute unlinked evidence: not present in any activity's step coverage
  const linkedEvidenceIds = new Set();
  Object.values(stepCoverageMap).forEach(steps => {
    if (steps) Object.values(steps).forEach(items => {
      (items || []).forEach(ev => linkedEvidenceIds.add(ev.id));
    });
  });
  const unlinkedEvidence = (allEvidence || []).filter(ev => !linkedEvidenceIds.has(ev.id));

  // Jira CSV handlers
  const handleJiraAnalyse = async () => {
    if (!jiraFile) return;
    setJiraAnalysing(true);
    setJiraError('');
    setJiraResults(null);
    try {
      const formData = new FormData();
      formData.append('file', jiraFile);
      const res = await fetch(`/api/projects/${token}/jira/csv-analyse`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setJiraResults(data);
      // Auto-select all R&D items
      const selected = {};
      (data.results || []).forEach((r, i) => {
        if (r.is_rd) selected[i] = true;
      });
      setJiraSelected(selected);
    } catch (err) {
      setJiraError(err.message);
    } finally {
      setJiraAnalysing(false);
    }
  };

  const handleJiraImport = async () => {
    if (!jiraResults) return;
    const toImport = jiraResults.results.filter((_, i) => jiraSelected[i]);
    if (toImport.length === 0) {
      setJiraError('Select at least one activity to import');
      return;
    }
    setJiraImporting(true);
    setJiraError('');
    try {
      const res = await fetch(`/api/projects/${token}/jira/import-activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activities: toImport }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      // Refresh activities
      const listRes = await fetch(`/api/projects/${token}/core-activities`);
      if (listRes.ok) {
        const listData = await listRes.json();
        onActivitiesChange(listData.activities || []);
      }
      setJiraSuccess(`Imported ${data.totalImported} activities from Jira`);
      setShowJiraImport(false);
      setJiraResults(null);
      setJiraFile(null);
      setJiraSelected({});
      setTimeout(() => setJiraSuccess(''), 5000);
    } catch (err) {
      setJiraError(err.message);
    } finally {
      setJiraImporting(false);
    }
  };

  const resetJiraImport = () => {
    setShowJiraImport(false);
    setJiraFile(null);
    setJiraResults(null);
    setJiraSelected({});
    setJiraError('');
    setJiraAnalysing(false);
    setJiraImporting(false);
  };

  const draftCount = activities.filter(a => !a.status || a.status === 'draft').length;
  const adoptedCount = activities.filter(a => a.status === 'adopted').length;

  return (
    <div style={{ padding: '20px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: '0 0 3px' }}>R&D Activities</h2>
          <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
            {adoptedCount > 0 || draftCount > 0
              ? `${adoptedCount} adopted · ${draftCount} in progress`
              : 'Review and adopt activities to build your claim'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          <button
            onClick={() => setShowJiraImport(true)}
            style={{
              padding: '7px 13px', fontSize: 13, fontWeight: 500, color: '#2684FF',
              background: 'white', border: '1px solid #2684FF', borderRadius: 7,
              cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#2684FF">
              <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24.013 12.487V1.005A1.005 1.005 0 0 0 23.013 0z"/>
            </svg>
            Import from Jira
          </button>
          <button
            onClick={() => setShowAddEvidence(true)}
            style={{
              padding: '7px 13px', fontSize: 13, fontWeight: 500, color: '#374151',
              background: 'white', border: '1px solid #e5e7eb', borderRadius: 7,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            + Add evidence
          </button>
          <button
            onClick={() => setIsCreating(true)}
            style={{
              padding: '7px 13px', fontSize: 13, fontWeight: 600, color: 'white',
              background: NAVY, border: 'none', borderRadius: 7,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            + Add activity
          </button>
        </div>
      </div>

      {/* Jira import success */}
      {jiraSuccess && (
        <div style={{ padding: '10px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, marginBottom: 12, fontSize: 13, color: '#1e40af' }}>
          {jiraSuccess}
        </div>
      )}

      {/* Note added confirmation */}
      {noteAdded && (
        <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, marginBottom: 12, fontSize: 13, color: '#166534' }}>
          Evidence added — it will appear in your inbox below after auto-linking completes.
        </div>
      )}

      {/* Create activity form */}
      {isCreating && (
        <div style={{ padding: 20, background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 12 }}>New Activity</div>
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Activity name (e.g. 'Offline sync with conflict resolution')"
            style={{
              width: '100%', padding: '9px 11px', fontSize: 13, border: '1px solid #e5e7eb',
              borderRadius: 6, outline: 'none', marginBottom: 10, boxSizing: 'border-box',
              color: '#111827', fontFamily: 'inherit',
            }}
            onFocus={e => e.target.style.borderColor = NAVY}
            onBlur={e => e.target.style.borderColor = '#e5e7eb'}
          />
          <textarea
            value={newUncertainty}
            onChange={e => setNewUncertainty(e.target.value)}
            placeholder="What technical uncertainty does this activity explore?"
            rows={2}
            style={{
              width: '100%', padding: '9px 11px', fontSize: 13, border: '1px solid #e5e7eb',
              borderRadius: 6, outline: 'none', resize: 'vertical', marginBottom: 12,
              boxSizing: 'border-box', color: '#111827', fontFamily: 'inherit',
            }}
            onFocus={e => e.target.style.borderColor = NAVY}
            onBlur={e => e.target.style.borderColor = '#e5e7eb'}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim() || !newUncertainty.trim()}
              style={{
                padding: '7px 18px', fontSize: 13, fontWeight: 600,
                background: (creating || !newName.trim() || !newUncertainty.trim()) ? '#e5e7eb' : NAVY,
                color: (creating || !newName.trim() || !newUncertainty.trim()) ? '#9ca3af' : 'white',
                border: 'none', borderRadius: 6,
                cursor: (creating || !newName.trim() || !newUncertainty.trim()) ? 'default' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {creating ? 'Creating...' : 'Create Activity'}
            </button>
            <button
              onClick={() => { setIsCreating(false); setNewName(''); setNewUncertainty(''); }}
              style={{ padding: '7px 18px', fontSize: 13, color: '#6b7280', background: 'white', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Activity cards */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
          Loading activities...
        </div>
      ) : activities.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', background: 'white', border: '1px solid #e5e7eb', borderRadius: 8 }}>
          <div style={{ fontSize: 14, color: '#374151', marginBottom: 8 }}>No activities yet</div>
          <div style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.5 }}>
            Activities will be auto-generated once you have enough evidence (5+ items across 2+ systematic steps).
            You can also add one manually above.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
          {activities.map(activity => {
            const coverage = stepCoverageMap[activity.id] || {};
            const isAdopted = activity.status === 'adopted';
            const isExpanded = expandedId === activity.id;

            return (
              <div key={activity.id} style={{
                background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden',
              }}>
                {/* Collapsed header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : activity.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                    padding: '13px 18px', background: 'none', border: 'none',
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  }}
                >
                  {/* Status dot */}
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                    background: isAdopted ? '#16a34a' : '#f59e0b',
                  }} />

                  {/* Name + uncertainty (1-line truncated when collapsed) */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', lineHeight: 1.3, marginBottom: !isExpanded ? 3 : 0 }}>
                      {activity.name}
                    </div>
                    {!isExpanded && activity.uncertainty && (
                      <ExpandableText text={activity.uncertainty} limit={180} style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.45 }} />
                    )}
                  </div>

                  {/* 5 stage dots */}
                  <StageDots coverage={coverage} />

                  {/* Chevron */}
                  <span style={{
                    fontSize: 10, color: '#c4c9d0', flexShrink: 0, marginLeft: 4,
                    display: 'inline-block',
                    transform: isExpanded ? 'rotate(90deg)' : 'none',
                    transition: 'transform 0.15s',
                  }}>▶</span>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #f3f4f6' }}>
                    <ActivityDetailView
                      activity={activity}
                      token={token}
                      allEvidence={allEvidence}
                      activities={activities}
                      onAdopt={handleAdopt}
                      onUpdate={handleUpdate}
                      onCoverageChange={() => refreshCoverage(activity.id)}
                      onMovedToActivity={(targetId) => refreshCoverage(targetId)}
                      onUnAdopt={handleUnAdopt}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Unlinked evidence inbox */}
      {!loading && (
        <EvidenceInbox
          unlinkedEvidence={unlinkedEvidence}
          activities={activities}
          token={token}
          onLinked={(evidenceId, activityId) => refreshCoverage(activityId)}
        />
      )}

      {/* Jira CSV Import Modal */}
      {showJiraImport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: 'white', borderRadius: 12, width: 640, maxHeight: '85vh', overflow: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: '1px solid #e5e7eb' }}>
            {/* Modal header */}
            <div style={{ padding: '18px 22px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#2684FF">
                  <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24.013 12.487V1.005A1.005 1.005 0 0 0 23.013 0z"/>
                </svg>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>Import R&D Activities from Jira</span>
              </div>
              <button onClick={resetJiraImport} style={{ background: 'none', border: 'none', fontSize: 20, color: '#9ca3af', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ padding: '18px 22px' }}>
              {/* Error */}
              {jiraError && (
                <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, marginBottom: 14, fontSize: 13, color: '#dc2626' }}>
                  {jiraError}
                </div>
              )}

              {/* Step 1: File upload */}
              {!jiraResults && (
                <div>
                  <p style={{ fontSize: 13, color: '#6b7280', marginTop: 0, marginBottom: 14, lineHeight: 1.5 }}>
                    Export your Jira board as CSV (Filters → Export → CSV), then upload it here. AI will identify which epics are R&D and draft RDTI-ready activity descriptions.
                  </p>
                  <div style={{
                    border: '2px dashed #d1d5db', borderRadius: 8, padding: 32,
                    textAlign: 'center', background: '#fafafa', marginBottom: 16,
                    cursor: 'pointer',
                  }}
                    onClick={() => document.getElementById('jira-csv-input').click()}
                    onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#2684FF'; }}
                    onDragLeave={e => { e.currentTarget.style.borderColor = '#d1d5db'; }}
                    onDrop={e => {
                      e.preventDefault();
                      e.currentTarget.style.borderColor = '#d1d5db';
                      const f = e.dataTransfer.files[0];
                      if (f && (f.name.endsWith('.csv') || f.type === 'text/csv')) setJiraFile(f);
                    }}
                  >
                    <input
                      id="jira-csv-input"
                      type="file"
                      accept=".csv"
                      style={{ display: 'none' }}
                      onChange={e => {
                        if (e.target.files[0]) setJiraFile(e.target.files[0]);
                      }}
                    />
                    {jiraFile ? (
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 4 }}>{jiraFile.name}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{(jiraFile.size / 1024).toFixed(1)} KB</div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: 14, color: '#374151', marginBottom: 4 }}>Drop a Jira CSV here or click to browse</div>
                        <div style={{ fontSize: 12, color: '#9ca3af' }}>Supports standard Jira CSV exports</div>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={resetJiraImport} style={{ padding: '7px 14px', fontSize: 13, color: '#6b7280', background: 'white', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Cancel
                    </button>
                    <button
                      onClick={handleJiraAnalyse}
                      disabled={!jiraFile || jiraAnalysing}
                      style={{
                        padding: '7px 18px', fontSize: 13, fontWeight: 600,
                        background: (!jiraFile || jiraAnalysing) ? '#e5e7eb' : NAVY,
                        color: (!jiraFile || jiraAnalysing) ? '#9ca3af' : 'white',
                        border: 'none', borderRadius: 6,
                        cursor: (!jiraFile || jiraAnalysing) ? 'default' : 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {jiraAnalysing ? 'Analysing...' : 'Analyse CSV'}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Triage results */}
              {jiraResults && (
                <div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 14 }}>
                    Analysed {jiraResults.totalIssues} issues across {jiraResults.epicCount} epics. Select the activities to import.
                  </div>

                  {/* R&D activities */}
                  {jiraResults.results.filter(r => r.is_rd).length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#166534', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                        R&D Activities ({jiraResults.results.filter(r => r.is_rd).length})
                      </div>
                      {jiraResults.results.map((r, i) => {
                        if (!r.is_rd) return null;
                        return (
                          <div key={i} style={{
                            border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, marginBottom: 8,
                            background: jiraSelected[i] ? '#f0f9ff' : 'white',
                            transition: 'background 0.15s',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                              <input
                                type="checkbox"
                                checked={!!jiraSelected[i]}
                                onChange={() => setJiraSelected(prev => ({ ...prev, [i]: !prev[i] }))}
                                style={{ marginTop: 3, accentColor: NAVY }}
                              />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 3 }}>
                                  {r.activity_name}
                                </div>
                                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>
                                  From: "{r.epic_name}" · {r.classification === 'core' ? 'Core R&D' : 'Supporting'} · {(r.issues || []).length} issues
                                </div>
                                <div style={{ fontSize: 12, color: '#4b5563', marginBottom: 6, lineHeight: 1.5 }}>
                                  <strong style={{ color: '#374151' }}>Uncertainty:</strong> {r.uncertainty}
                                </div>
                                <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>
                                  {r.reason}
                                </div>
                                {/* Issue list (collapsed) */}
                                {r.issues && r.issues.length > 0 && (
                                  <details style={{ marginTop: 8 }}>
                                    <summary style={{ fontSize: 11, color: '#9ca3af', cursor: 'pointer' }}>
                                      {r.issues.length} Jira issues mapped
                                    </summary>
                                    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                      {r.issues.map((issue, j) => (
                                        <div key={j} style={{ fontSize: 11, color: '#6b7280', display: 'flex', gap: 6, alignItems: 'center' }}>
                                          <span style={{
                                            padding: '1px 5px', borderRadius: 3, fontSize: 10, fontWeight: 600,
                                            background: issue.step === 'Hypothesis' ? '#ede9fe' : issue.step === 'Experiment' ? '#dbeafe' : issue.step === 'Observation' ? '#d1fae5' : issue.step === 'Evaluation' ? '#fef3c7' : issue.step === 'Conclusion' ? '#fee2e2' : '#f3f4f6',
                                            color: issue.step === 'Hypothesis' ? '#7c3aed' : issue.step === 'Experiment' ? '#2563eb' : issue.step === 'Observation' ? '#059669' : issue.step === 'Evaluation' ? '#d97706' : issue.step === 'Conclusion' ? '#dc2626' : '#6b7280',
                                          }}>
                                            {(issue.step || '?').slice(0, 3)}
                                          </span>
                                          <span style={{ fontFamily: 'ui-monospace,monospace', fontWeight: 600, color: '#374151' }}>{issue.key}</span>
                                          <span>{issue.summary}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </details>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Not R&D */}
                  {jiraResults.results.filter(r => !r.is_rd).length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                        Not R&D ({jiraResults.results.filter(r => !r.is_rd).length})
                      </div>
                      {jiraResults.results.map((r, i) => {
                        if (r.is_rd) return null;
                        return (
                          <div key={i} style={{
                            border: '1px solid #f3f4f6', borderRadius: 8, padding: 12, marginBottom: 6,
                            background: jiraSelected[i] ? '#f0f9ff' : '#fafafa',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                              <input
                                type="checkbox"
                                checked={!!jiraSelected[i]}
                                onChange={() => setJiraSelected(prev => ({ ...prev, [i]: !prev[i] }))}
                                style={{ marginTop: 2, accentColor: NAVY }}
                                title="Override — import as R&D anyway"
                              />
                              <div>
                                <div style={{ fontSize: 13, color: '#6b7280' }}>"{r.epic_name}"</div>
                                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{r.reason}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #f3f4f6' }}>
                    <button onClick={() => { setJiraResults(null); setJiraFile(null); setJiraSelected({}); }} style={{ padding: '7px 14px', fontSize: 13, color: '#6b7280', background: 'white', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Back
                    </button>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={resetJiraImport} style={{ padding: '7px 14px', fontSize: 13, color: '#6b7280', background: 'white', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Cancel
                      </button>
                      <button
                        onClick={handleJiraImport}
                        disabled={jiraImporting || Object.values(jiraSelected).filter(Boolean).length === 0}
                        style={{
                          padding: '7px 18px', fontSize: 13, fontWeight: 600,
                          background: (jiraImporting || Object.values(jiraSelected).filter(Boolean).length === 0) ? '#e5e7eb' : NAVY,
                          color: (jiraImporting || Object.values(jiraSelected).filter(Boolean).length === 0) ? '#9ca3af' : 'white',
                          border: 'none', borderRadius: 6,
                          cursor: (jiraImporting || Object.values(jiraSelected).filter(Boolean).length === 0) ? 'default' : 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        {jiraImporting ? 'Importing...' : `Import ${Object.values(jiraSelected).filter(Boolean).length} Activities`}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add evidence modal */}
      {showAddEvidence && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: 'white', borderRadius: 10, padding: 22, width: 480, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Add evidence</span>
              <button onClick={() => { setShowAddEvidence(false); setNewNote(''); }} style={{ background: 'none', border: 'none', fontSize: 18, color: '#9ca3af', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <textarea
              autoFocus
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="What did you work on? Notes on experiments, observations, technical challenges or outcomes..."
              rows={4}
              style={{
                width: '100%', padding: '9px 11px', fontSize: 13, lineHeight: 1.55,
                border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none',
                resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', color: '#111827',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 7, marginTop: 10 }}>
              <button
                onClick={() => { setShowAddEvidence(false); setNewNote(''); }}
                style={{ padding: '6px 12px', fontSize: 12, color: '#6b7280', background: 'white', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddNote}
                disabled={addingNote || !newNote.trim()}
                style={{
                  padding: '6px 12px', fontSize: 12, fontWeight: 600,
                  background: (!newNote.trim() || addingNote) ? '#e5e7eb' : NAVY,
                  color: (!newNote.trim() || addingNote) ? '#9ca3af' : 'white',
                  border: 'none', borderRadius: 6,
                  cursor: (!newNote.trim() || addingNote) ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {addingNote ? 'Adding...' : 'Add note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
