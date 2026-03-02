'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Spinner } from './Spinner';

const STEP_COLORS = {
  Hypothesis: '#8b5cf6',
  Experiment: '#3b82f6',
  Observation: '#10b981',
  Evaluation: '#f59e0b',
  Conclusion: '#ef4444'
};

const CONFIDENCE_COLORS = {
  high: '#10b981',
  medium: '#f59e0b',
  low: '#ef4444'
};

const SOURCE_ICONS = {
  jira: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#2684FF">
      <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24.013 12.487V1.005A1.005 1.005 0 0 0 23.013 0z"/>
    </svg>
  ),
  github: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#333">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
    </svg>
  )
};

function Badge({ label, color, bgColor }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 12,
      fontSize: 11,
      fontWeight: 600,
      color: color || '#374151',
      backgroundColor: bgColor || '#f3f4f6',
      whiteSpace: 'nowrap'
    }}>
      {label}
    </span>
  );
}

// ─── Connections Bar ────────────────────────────────────────────────

function ConnectionsBar({ connections, onManage, syncing, onSync }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 12px',
      borderRadius: 8,
      border: '1px solid #e5e7eb',
      backgroundColor: '#f9fafb',
      marginBottom: 16,
      flexWrap: 'wrap'
    }}>
      {connections.map(conn => (
        <div
          key={conn.source}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 6,
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            fontSize: 12,
            cursor: 'pointer'
          }}
          onClick={() => onManage(conn.source)}
          title={conn.connected ? `Last synced: ${conn.last_synced_at ? new Date(conn.last_synced_at).toLocaleDateString() : 'Never'}` : 'Click to connect'}
        >
          {SOURCE_ICONS[conn.source]}
          <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{conn.source}</span>
          <span style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: conn.connected ? '#10b981' : '#d1d5db',
            display: 'inline-block'
          }} />
        </div>
      ))}

      <div style={{ marginLeft: 'auto' }}>
        <button
          onClick={onSync}
          disabled={syncing}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            border: 'none',
            backgroundColor: '#021048',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            cursor: syncing ? 'default' : 'pointer',
            opacity: syncing ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          {syncing ? <><Spinner size={12} color="#fff" /> Syncing...</> : 'Sync & Match'}
        </button>
      </div>
    </div>
  );
}

// ─── Stats Bar ──────────────────────────────────────────────────────

function StatsBar({ counts, statusFilter, onFilterChange }) {
  const stats = [
    { label: 'Pending', key: 'pending', color: '#f59e0b', bg: '#fffbeb' },
    { label: 'Approved', key: 'approved', color: '#10b981', bg: '#ecfdf5' },
    { label: 'Auto-approved', key: 'auto_approved', color: '#059669', bg: '#ecfdf5' },
    { label: 'Rejected', key: 'rejected', color: '#ef4444', bg: '#fef2f2' },
    { label: 'Skipped', key: 'skipped', color: '#6b7280', bg: '#f9fafb' }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: 8,
      marginBottom: 16
    }}>
      {stats.map(stat => (
        <button
          key={stat.key}
          onClick={() => onFilterChange(stat.key === statusFilter ? '' : stat.key)}
          style={{
            padding: '8px 6px',
            borderRadius: 8,
            border: statusFilter === stat.key ? `2px solid ${stat.color}` : '1px solid #e5e7eb',
            backgroundColor: stat.bg,
            cursor: 'pointer',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 700, color: stat.color }}>{counts[stat.key] || 0}</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>{stat.label}</div>
        </button>
      ))}
    </div>
  );
}

// ─── Filter Bar ─────────────────────────────────────────────────────

function FilterBar({
  sourceFilter, onSourceChange,
  activityFilter, onActivityChange,
  confidenceFilter, onConfidenceChange,
  stepFilter, onStepChange,
  activities,
  onBatchAction,
  showBatchActions
}) {
  const sources = [
    { label: 'All', value: '' },
    { label: 'Jira', value: 'jira' },
    { label: 'GitHub', value: 'github' }
  ];

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
      {/* Source pills */}
      <div style={{ display: 'flex', gap: 4 }}>
        {sources.map(s => (
          <button
            key={s.value}
            onClick={() => onSourceChange(s.value)}
            style={{
              padding: '4px 12px',
              borderRadius: 16,
              border: sourceFilter === s.value ? '2px solid #021048' : '1px solid #d1d5db',
              backgroundColor: sourceFilter === s.value ? '#021048' : '#fff',
              color: sourceFilter === s.value ? '#fff' : '#374151',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Dropdowns */}
      <select
        value={confidenceFilter}
        onChange={(e) => onConfidenceChange(e.target.value)}
        style={{
          padding: '5px 10px',
          borderRadius: 6,
          border: '1px solid #d1d5db',
          fontSize: 12,
          backgroundColor: '#fff'
        }}
      >
        <option value="">All Confidence</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>

      <select
        value={activityFilter}
        onChange={(e) => onActivityChange(e.target.value)}
        style={{
          padding: '5px 10px',
          borderRadius: 6,
          border: '1px solid #d1d5db',
          fontSize: 12,
          backgroundColor: '#fff'
        }}
      >
        <option value="">All Activities</option>
        {(activities || []).map(a => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>

      <select
        value={stepFilter}
        onChange={(e) => onStepChange(e.target.value)}
        style={{
          padding: '5px 10px',
          borderRadius: 6,
          border: '1px solid #d1d5db',
          fontSize: 12,
          backgroundColor: '#fff'
        }}
      >
        <option value="">All Steps</option>
        {['Hypothesis', 'Experiment', 'Observation', 'Evaluation', 'Conclusion'].map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {/* Batch actions */}
      {showBatchActions && (
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button
            onClick={() => onBatchAction('approve')}
            style={{
              padding: '5px 10px',
              borderRadius: 6,
              border: '1px solid #10b981',
              backgroundColor: '#ecfdf5',
              color: '#10b981',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Approve All High
          </button>
          <button
            onClick={() => onBatchAction('reject')}
            style={{
              padding: '5px 10px',
              borderRadius: 6,
              border: '1px solid #ef4444',
              backgroundColor: '#fef2f2',
              color: '#ef4444',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Reject All Low
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Gap Analysis Banner ────────────────────────────────────────────

function GapAnalysisBanner({ gaps }) {
  const [collapsed, setCollapsed] = useState(false);

  if (!gaps || !gaps.activities || gaps.activities.length === 0) return null;
  const activitiesWithGaps = gaps.activities.filter(a => a.missing_steps.length > 0);
  if (activitiesWithGaps.length === 0) {
    return (
      <div style={{
        border: '1px solid #bbf7d0',
        borderRadius: 8,
        padding: '10px 14px',
        marginBottom: 16,
        backgroundColor: '#f0fdf4',
        fontSize: 13,
        color: '#166534'
      }}>
        All activities have full RDTI step coverage!
      </div>
    );
  }

  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      padding: collapsed ? '10px 14px' : 16,
      marginBottom: 16,
      backgroundColor: '#fefce8'
    }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#854d0e' }}>
          Evidence Gap Analysis ({activitiesWithGaps.length} {activitiesWithGaps.length === 1 ? 'activity' : 'activities'} with gaps)
        </h4>
        <span style={{ fontSize: 12, color: '#854d0e' }}>{collapsed ? '+' : '−'}</span>
      </div>
      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
          {activitiesWithGaps.map(a => (
            <div key={a.activity_id} style={{ fontSize: 13 }}>
              <span style={{ fontWeight: 500, color: '#374151' }}>{a.activity_name}</span>
              <span style={{ color: '#6b7280' }}> — Missing: </span>
              {a.missing_steps.map(step => (
                <Badge key={step} label={step} color="#fff" bgColor={STEP_COLORS[step] || '#6b7280'} />
              ))}
              <span style={{ color: '#9ca3af', marginLeft: 8 }}>{a.coverage_pct}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Record Card ────────────────────────────────────────────────────

function RecordCard({ record, onReview, reviewing }) {
  const isJira = record.source === 'jira';
  const isGitHub = record.source === 'github';
  const isPending = record.review_status === 'pending';
  const isAutoApproved = record.review_status === 'auto_approved';

  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      padding: 14,
      backgroundColor: isAutoApproved ? '#f0fdf4' : '#fff'
    }}>
      {/* Header badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        {/* Source icon + identifier */}
        {isJira && (
          <a
            href={record.meta?.jira_key ? `#` : '#'}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#021048',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            {SOURCE_ICONS.jira}
            {record.meta?.jira_key || '???'}
          </a>
        )}
        {isGitHub && (
          <a
            href={record.meta?.commit_url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#021048',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            {SOURCE_ICONS.github}
            {record.meta?.sha?.substring(0, 7) || record.meta?.pr_number ? `PR #${record.meta.pr_number}` : '???'}
          </a>
        )}

        {/* Source-specific metadata badges */}
        {isJira && record.meta?.issue_type && (
          <Badge label={record.meta.issue_type} bgColor="#e0e7ff" color="#3730a3" />
        )}
        {isJira && record.meta?.status && (
          <Badge label={record.meta.status} />
        )}
        {isGitHub && record.meta?.files_changed > 0 && (
          <Badge label={`${record.meta.files_changed} files`} bgColor="#f3f4f6" />
        )}
        {isGitHub && (record.meta?.additions > 0 || record.meta?.deletions > 0) && (
          <span style={{ fontSize: 11 }}>
            <span style={{ color: '#10b981', fontWeight: 600 }}>+{record.meta.additions || 0}</span>
            {' '}
            <span style={{ color: '#ef4444', fontWeight: 600 }}>-{record.meta.deletions || 0}</span>
          </span>
        )}

        {/* Shared badges */}
        {record.match_confidence && (
          <Badge
            label={record.match_confidence}
            color="#fff"
            bgColor={CONFIDENCE_COLORS[record.match_confidence]}
          />
        )}
        {record.suggested_step && (
          <Badge
            label={record.suggested_step}
            color="#fff"
            bgColor={STEP_COLORS[record.suggested_step] || '#6b7280'}
          />
        )}
        {isJira && record.meta?.story_points && (
          <span style={{ fontSize: 11, color: '#9ca3af' }}>{record.meta.story_points} pts</span>
        )}
        {isAutoApproved && (
          <Badge label="Auto-approved" color="#059669" bgColor="#d1fae5" />
        )}
      </div>

      {/* Title */}
      <div style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 4 }}>
        {record.title}
      </div>

      {/* Activity match */}
      {record.activity && (
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
          Activity: <span style={{ fontWeight: 500, color: '#374151' }}>{record.activity.name}</span>
        </div>
      )}

      {/* AI Summary */}
      {record.summary && (
        <div style={{
          fontSize: 13,
          color: '#4b5563',
          marginBottom: 8,
          padding: '6px 10px',
          backgroundColor: '#f9fafb',
          borderRadius: 4,
          borderLeft: '3px solid #021048'
        }}>
          {record.summary}
        </div>
      )}

      {/* Review actions (pending only) */}
      {isPending && (
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          <button
            onClick={() => onReview(record.id, record.source, 'approve')}
            disabled={reviewing}
            style={{
              padding: '5px 12px',
              borderRadius: 5,
              border: '1px solid #10b981',
              backgroundColor: '#ecfdf5',
              color: '#10b981',
              fontSize: 12,
              fontWeight: 600,
              cursor: reviewing ? 'default' : 'pointer',
              opacity: reviewing ? 0.6 : 1
            }}
          >
            {reviewing ? 'Saving...' : 'Approve'}
          </button>
          <button
            onClick={() => onReview(record.id, record.source, 'reject')}
            disabled={reviewing}
            style={{
              padding: '5px 12px',
              borderRadius: 5,
              border: '1px solid #ef4444',
              backgroundColor: '#fef2f2',
              color: '#ef4444',
              fontSize: 12,
              fontWeight: 600,
              cursor: reviewing ? 'default' : 'pointer',
              opacity: reviewing ? 0.6 : 1
            }}
          >
            Reject
          </button>
          <button
            onClick={() => onReview(record.id, record.source, 'skip')}
            disabled={reviewing}
            style={{
              padding: '5px 12px',
              borderRadius: 5,
              border: '1px solid #d1d5db',
              backgroundColor: '#f9fafb',
              color: '#6b7280',
              fontSize: 12,
              cursor: reviewing ? 'default' : 'pointer',
              opacity: reviewing ? 0.6 : 1
            }}
          >
            Skip
          </button>
        </div>
      )}

      {/* Reviewed indicators */}
      {record.review_status === 'approved' && (
        <div style={{ fontSize: 12, color: '#10b981', fontWeight: 500 }}>
          Approved by {record.reviewed_by} — evidence created
        </div>
      )}
      {record.review_status === 'rejected' && (
        <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 500 }}>
          Rejected by {record.reviewed_by}
        </div>
      )}
      {isAutoApproved && (
        <div style={{ fontSize: 12, color: '#059669', fontWeight: 500 }}>
          Auto-approved (high confidence) — evidence created
        </div>
      )}
    </div>
  );
}

// ─── Main RecordsPage ───────────────────────────────────────────────

export default function RecordsPage({ token, projectId, activities }) {
  const [records, setRecords] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, auto_approved: 0, rejected: 0, skipped: 0 });
  const [connections, setConnections] = useState([]);
  const [gaps, setGaps] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [reviewing, setReviewing] = useState({});
  const [error, setError] = useState('');
  const [syncResult, setSyncResult] = useState(null);

  // Filters
  const [sourceFilter, setSourceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [activityFilter, setActivityFilter] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState('');
  const [stepFilter, setStepFilter] = useState('');

  const getHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {};
  }, []);

  // Fetch records
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getHeaders();
      const params = new URLSearchParams();
      if (sourceFilter) params.set('source', sourceFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (activityFilter) params.set('activity_id', activityFilter);
      if (confidenceFilter) params.set('confidence', confidenceFilter);
      if (stepFilter) params.set('step', stepFilter);
      params.set('limit', '50');

      const res = await fetch(`/api/projects/${token}/records?${params}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRecords(data.records || []);
      setCounts(data.counts || { pending: 0, approved: 0, auto_approved: 0, rejected: 0, skipped: 0 });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, sourceFilter, statusFilter, activityFilter, confidenceFilter, stepFilter, getHeaders]);

  // Fetch connections
  const fetchConnections = useCallback(async () => {
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/projects/${token}/records/connections`, { headers });
      const data = await res.json();
      if (res.ok) setConnections(data.connections || []);
    } catch { /* non-critical */ }
  }, [token, getHeaders]);

  // Fetch gaps
  const fetchGaps = useCallback(async () => {
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/projects/${token}/records/gaps`, { headers });
      const data = await res.json();
      if (res.ok) setGaps(data);
    } catch { /* non-critical */ }
  }, [token, getHeaders]);

  useEffect(() => {
    fetchRecords();
    fetchConnections();
    fetchGaps();
  }, [fetchRecords, fetchConnections, fetchGaps]);

  // Sync & Match all integrations
  async function handleSyncAll() {
    setSyncing(true);
    setSyncResult(null);
    setError('');

    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/projects/${token}/records/sync`, {
        method: 'POST',
        headers
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');

      setSyncResult(data.results);
      await fetchRecords();
      await fetchGaps();
      await fetchConnections();
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  }

  // Review a single record
  async function handleReview(matchId, source, action) {
    setReviewing(prev => ({ ...prev, [matchId]: true }));
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/projects/${token}/records`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviews: [{ match_id: matchId, source, action }] })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.errors && data.errors.length > 0) {
        throw new Error(data.errors[0].error || 'Review failed');
      }

      // Remove from list and update counts
      setRecords(prev => prev.filter(r => r.id !== matchId));
      setCounts(prev => ({
        ...prev,
        [statusFilter || 'pending']: Math.max(0, (prev[statusFilter || 'pending'] || 0) - 1),
        [action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'skipped']:
          (prev[action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'skipped'] || 0) + 1
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setReviewing(prev => ({ ...prev, [matchId]: false }));
    }
  }

  // Batch action
  async function handleBatchAction(action) {
    const targetRecords = records.filter(r => {
      if (action === 'approve') return r.match_confidence === 'high';
      if (action === 'reject') return r.match_confidence === 'low';
      return false;
    });

    if (targetRecords.length === 0) {
      setError(action === 'approve'
        ? 'No high-confidence matches to approve.'
        : 'No low-confidence matches to reject.');
      return;
    }

    setLoading(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/projects/${token}/records`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviews: targetRecords.map(r => ({ match_id: r.id, source: r.source, action }))
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Batch action failed');

      if (data.errors && data.errors.length > 0) {
        setError(`${data.errors.length} item(s) failed: ${data.errors[0].error}`);
      }

      await fetchRecords();
      await fetchGaps();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Handle manage integration (placeholder — opens OAuth flow or settings)
  function handleManageIntegration(source) {
    if (source === 'jira') {
      window.open(`/api/jira/auth/start`, '_blank');
    } else if (source === 'github') {
      window.open(`/api/github/auth/start`, '_blank');
    }
  }

  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);
  const hasAnyConnection = connections.some(c => c.connected);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#021048' }}>
          Records
        </h3>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
          AI matches your Jira issues and GitHub commits to R&D activities
        </p>
      </div>

      {/* Connections Bar */}
      <ConnectionsBar
        connections={connections}
        onManage={handleManageIntegration}
        syncing={syncing}
        onSync={handleSyncAll}
      />

      {/* Sync results */}
      {syncResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
          {syncResult.jira?.synced && (
            <div style={{ backgroundColor: '#eff6ff', padding: '8px 12px', borderRadius: 6, fontSize: 12, color: '#1e40af' }}>
              Jira: Matched {syncResult.jira.match?.matched || 0} issues ({syncResult.jira.match?.skipped || 0} not R&D)
            </div>
          )}
          {syncResult.jira?.error && syncResult.jira.error !== 'not_connected' && (
            <div style={{ backgroundColor: '#fef2f2', padding: '8px 12px', borderRadius: 6, fontSize: 12, color: '#dc2626' }}>
              Jira: {syncResult.jira.error}
            </div>
          )}
          {syncResult.github?.synced && (
            <div style={{ backgroundColor: '#f0fdf4', padding: '8px 12px', borderRadius: 6, fontSize: 12, color: '#166534' }}>
              GitHub: Synced {syncResult.github.sync?.synced || 0} commits, matched {syncResult.github.match?.matched || 0} ({syncResult.github.match?.auto_approved || 0} auto-approved)
            </div>
          )}
          {syncResult.github?.error && syncResult.github.error !== 'not_connected' && (
            <div style={{ backgroundColor: '#fef2f2', padding: '8px 12px', borderRadius: 6, fontSize: 12, color: '#dc2626' }}>
              GitHub: {syncResult.github.error}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ backgroundColor: '#fef2f2', padding: '8px 12px', borderRadius: 6, fontSize: 13, color: '#dc2626', marginBottom: 12 }}>
          {error}
          <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>&times;</button>
        </div>
      )}

      {/* Stats Bar */}
      <StatsBar counts={counts} statusFilter={statusFilter} onFilterChange={setStatusFilter} />

      {/* Gap Analysis */}
      <GapAnalysisBanner gaps={gaps} />

      {/* Filter Bar */}
      <FilterBar
        sourceFilter={sourceFilter}
        onSourceChange={setSourceFilter}
        activityFilter={activityFilter}
        onActivityChange={setActivityFilter}
        confidenceFilter={confidenceFilter}
        onConfidenceChange={setConfidenceFilter}
        stepFilter={stepFilter}
        onStepChange={setStepFilter}
        activities={activities}
        onBatchAction={handleBatchAction}
        showBatchActions={statusFilter === 'pending' && records.length > 0}
      />

      {/* Record feed */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spinner size={28} />
          <p style={{ fontSize: 13, color: '#666', marginTop: 8 }}>Loading records...</p>
        </div>
      ) : records.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 40,
          color: '#6b7280',
          fontSize: 14,
          border: '1px dashed #d1d5db',
          borderRadius: 8
        }}>
          {!hasAnyConnection
            ? 'Connect Jira or GitHub above, then click "Sync & Match" to get started.'
            : totalCount === 0
              ? 'No matches yet. Click "Sync & Match" to scan your integrations.'
              : `No ${statusFilter || ''} records. Try changing the filters.`}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {records.map(record => (
            <RecordCard
              key={record.id}
              record={record}
              onReview={handleReview}
              reviewing={reviewing[record.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
