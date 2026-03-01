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

export default function JiraReviewPanel({ token, projectId, activities }) {
  const [matches, setMatches] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0, skipped: 0 });
  const [gaps, setGaps] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [matching, setMatching] = useState(false);
  const [reviewing, setReviewing] = useState({});
  const [statusFilter, setStatusFilter] = useState('pending');
  const [activityFilter, setActivityFilter] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState('');
  const [error, setError] = useState('');
  const [syncResult, setSyncResult] = useState(null);
  const [matchResult, setMatchResult] = useState(null);

  // Get auth headers
  const getHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {};
  }, []);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getHeaders();
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (activityFilter) params.set('activity_id', activityFilter);
      if (confidenceFilter) params.set('confidence', confidenceFilter);
      params.set('limit', '50');

      const res = await fetch(`/api/projects/${token}/jira/matches?${params}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMatches(data.matches || []);
      setCounts(data.counts || { pending: 0, approved: 0, rejected: 0, skipped: 0 });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, activityFilter, confidenceFilter, getHeaders]);

  const fetchGaps = useCallback(async () => {
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/projects/${token}/jira/gaps`, { headers });
      const data = await res.json();
      if (res.ok) setGaps(data);
    } catch {
      // Non-critical
    }
  }, [token, getHeaders]);

  useEffect(() => {
    fetchMatches();
    fetchGaps();
  }, [fetchMatches, fetchGaps]);

  async function handleSyncAndMatch() {
    setSyncing(true);
    setSyncResult(null);
    setMatchResult(null);
    setError('');

    try {
      const headers = await getHeaders();
      // Step 1: Sync
      const syncRes = await fetch(`/api/projects/${token}/jira/sync`, {
        method: 'POST',
        headers
      });
      const syncData = await syncRes.json();
      if (!syncRes.ok) throw new Error(syncData.error || 'Sync failed');
      setSyncResult(syncData);
      setSyncing(false);

      // Step 2: Match
      setMatching(true);
      const matchRes = await fetch(`/api/projects/${token}/jira/match`, {
        method: 'POST',
        headers
      });
      const matchData = await matchRes.json();
      if (!matchRes.ok) throw new Error(matchData.error || 'Match failed');
      setMatchResult(matchData);

      // Refresh matches list
      await fetchMatches();
      await fetchGaps();
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
      setMatching(false);
    }
  }

  async function handleReview(matchId, action) {
    setReviewing(prev => ({ ...prev, [matchId]: true }));
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/projects/${token}/jira/matches`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviews: [{ match_id: matchId, action }] })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Remove from list and update counts
      setMatches(prev => prev.filter(m => m.id !== matchId));
      setCounts(prev => ({
        ...prev,
        [statusFilter]: Math.max(0, (prev[statusFilter] || 0) - 1),
        [action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'skipped']:
          (prev[action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'skipped'] || 0) + 1
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setReviewing(prev => ({ ...prev, [matchId]: false }));
    }
  }

  async function handleBatchAction(action) {
    const targetMatches = matches.filter(m => {
      if (action === 'approve') return m.match_confidence === 'high';
      if (action === 'reject') return m.match_confidence === 'low';
      return false;
    });

    if (targetMatches.length === 0) return;

    setLoading(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/projects/${token}/jira/matches`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviews: targetMatches.map(m => ({ match_id: m.id, action }))
        })
      });
      if (!res.ok) throw new Error('Batch action failed');
      await fetchMatches();
      await fetchGaps();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const totalCount = counts.pending + counts.approved + counts.rejected + counts.skipped;

  return (
    <div>
      {/* Header + Sync Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#021048' }}>
            Jira Record Finder
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
            AI matches Jira issues to your R&D activities for audit-ready documentation
          </p>
        </div>
        <button
          onClick={handleSyncAndMatch}
          disabled={syncing || matching}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: 'none',
            backgroundColor: '#021048',
            color: '#fff',
            fontSize: 13,
            cursor: syncing || matching ? 'default' : 'pointer',
            opacity: syncing || matching ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          {syncing ? <><Spinner size={14} color="#fff" /> Syncing...</> :
           matching ? <><Spinner size={14} color="#fff" /> Matching...</> :
           'Sync & Match'}
        </button>
      </div>

      {/* Sync/Match results */}
      {syncResult && (
        <div style={{ backgroundColor: '#f0fdf4', padding: '8px 12px', borderRadius: 6, fontSize: 13, color: '#166534', marginBottom: 8 }}>
          Synced {syncResult.cached} issues from Jira ({syncResult.fetched} total, {syncResult.skipped} filtered out)
        </div>
      )}
      {matchResult && (
        <div style={{ backgroundColor: '#eff6ff', padding: '8px 12px', borderRadius: 6, fontSize: 13, color: '#1e40af', marginBottom: 8 }}>
          AI matched {matchResult.matched} issues to R&D activities ({matchResult.qualified} qualified, {matchResult.skipped} not R&D)
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: '#fef2f2', padding: '8px 12px', borderRadius: 6, fontSize: 13, color: '#dc2626', marginBottom: 12 }}>
          {error}
          <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>&times;</button>
        </div>
      )}

      {/* Stats bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8,
        marginBottom: 16
      }}>
        {[
          { label: 'Pending', key: 'pending', color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Approved', key: 'approved', color: '#10b981', bg: '#ecfdf5' },
          { label: 'Rejected', key: 'rejected', color: '#ef4444', bg: '#fef2f2' },
          { label: 'Skipped', key: 'skipped', color: '#6b7280', bg: '#f9fafb' }
        ].map(stat => (
          <button
            key={stat.key}
            onClick={() => setStatusFilter(stat.key)}
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              border: statusFilter === stat.key ? `2px solid ${stat.color}` : '1px solid #e5e7eb',
              backgroundColor: stat.bg,
              cursor: 'pointer',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>{counts[stat.key] || 0}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{stat.label}</div>
          </button>
        ))}
      </div>

      {/* Gap Analysis */}
      {gaps && gaps.activities && gaps.activities.length > 0 && (
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
          backgroundColor: '#fefce8'
        }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: '#854d0e' }}>
            Evidence Gap Analysis
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {gaps.activities.filter(a => a.missing_steps.length > 0).map(a => (
              <div key={a.activity_id} style={{ fontSize: 13 }}>
                <span style={{ fontWeight: 500, color: '#374151' }}>{a.activity_name}</span>
                <span style={{ color: '#6b7280' }}> — Missing: </span>
                {a.missing_steps.map(step => (
                  <Badge key={step} label={step} color="#fff" bgColor={STEP_COLORS[step] || '#6b7280'} />
                ))}
                <span style={{ color: '#9ca3af', marginLeft: 8 }}>{a.coverage_pct}% covered</span>
              </div>
            ))}
            {gaps.activities.every(a => a.missing_steps.length === 0) && (
              <div style={{ fontSize: 13, color: '#166534' }}>All activities have full RDTI step coverage!</div>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <select
          value={activityFilter}
          onChange={(e) => setActivityFilter(e.target.value)}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid #d1d5db',
            fontSize: 13,
            backgroundColor: '#fff'
          }}
        >
          <option value="">All Activities</option>
          {(activities || []).map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>

        <select
          value={confidenceFilter}
          onChange={(e) => setConfidenceFilter(e.target.value)}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid #d1d5db',
            fontSize: 13,
            backgroundColor: '#fff'
          }}
        >
          <option value="">All Confidence</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {statusFilter === 'pending' && matches.length > 0 && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleBatchAction('approve')}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid #10b981',
                backgroundColor: '#ecfdf5',
                color: '#10b981',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Approve All High
            </button>
            <button
              onClick={() => handleBatchAction('reject')}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid #ef4444',
                backgroundColor: '#fef2f2',
                color: '#ef4444',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Reject All Low
            </button>
          </div>
        )}
      </div>

      {/* Match list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spinner size={28} />
          <p style={{ fontSize: 13, color: '#666', marginTop: 8 }}>Loading matches...</p>
        </div>
      ) : matches.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 40,
          color: '#6b7280',
          fontSize: 14,
          border: '1px dashed #d1d5db',
          borderRadius: 8
        }}>
          {totalCount === 0
            ? 'No matches yet. Click "Sync & Match" to scan your Jira issues.'
            : `No ${statusFilter} matches. Try changing the filter.`}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {matches.map(match => (
            <div
              key={match.id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: 14,
                backgroundColor: '#fff'
              }}
            >
              {/* Issue header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <a
                  href={match.issue ? `https://jira.atlassian.com/browse/${match.issue.jira_key}` : '#'}
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
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#2684FF">
                    <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24.013 12.487V1.005A1.005 1.005 0 0 0 23.013 0z"/>
                  </svg>
                  {match.issue?.jira_key || '???'}
                </a>
                {match.issue?.issue_type && (
                  <Badge label={match.issue.issue_type} bgColor="#e0e7ff" color="#3730a3" />
                )}
                {match.issue?.status && (
                  <Badge label={match.issue.status} />
                )}
                {match.match_confidence && (
                  <Badge
                    label={match.match_confidence}
                    color="#fff"
                    bgColor={CONFIDENCE_COLORS[match.match_confidence]}
                  />
                )}
                {match.suggested_step && (
                  <Badge
                    label={match.suggested_step}
                    color="#fff"
                    bgColor={STEP_COLORS[match.suggested_step] || '#6b7280'}
                  />
                )}
                {match.issue?.story_points && (
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>
                    {match.issue.story_points} pts
                  </span>
                )}
              </div>

              {/* Summary */}
              <div style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 4 }}>
                {match.issue?.summary || 'Unknown issue'}
              </div>

              {/* Activity match */}
              {match.activity && (
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                  Activity: <span style={{ fontWeight: 500, color: '#374151' }}>{match.activity.name}</span>
                </div>
              )}

              {/* AI Summary */}
              {match.ai_summary && (
                <div style={{
                  fontSize: 13,
                  color: '#4b5563',
                  marginBottom: 8,
                  padding: '6px 10px',
                  backgroundColor: '#f9fafb',
                  borderRadius: 4,
                  borderLeft: '3px solid #021048'
                }}>
                  {match.ai_summary}
                </div>
              )}

              {/* Review actions */}
              {match.review_status === 'pending' && (
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <button
                    onClick={() => handleReview(match.id, 'approve')}
                    disabled={reviewing[match.id]}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 5,
                      border: '1px solid #10b981',
                      backgroundColor: '#ecfdf5',
                      color: '#10b981',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: reviewing[match.id] ? 'default' : 'pointer',
                      opacity: reviewing[match.id] ? 0.6 : 1
                    }}
                  >
                    {reviewing[match.id] ? 'Saving...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleReview(match.id, 'reject')}
                    disabled={reviewing[match.id]}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 5,
                      border: '1px solid #ef4444',
                      backgroundColor: '#fef2f2',
                      color: '#ef4444',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: reviewing[match.id] ? 'default' : 'pointer',
                      opacity: reviewing[match.id] ? 0.6 : 1
                    }}
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleReview(match.id, 'skip')}
                    disabled={reviewing[match.id]}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 5,
                      border: '1px solid #d1d5db',
                      backgroundColor: '#f9fafb',
                      color: '#6b7280',
                      fontSize: 12,
                      cursor: reviewing[match.id] ? 'default' : 'pointer',
                      opacity: reviewing[match.id] ? 0.6 : 1
                    }}
                  >
                    Skip
                  </button>
                </div>
              )}

              {/* Approved/Rejected indicator */}
              {match.review_status === 'approved' && (
                <div style={{ fontSize: 12, color: '#10b981', fontWeight: 500 }}>
                  Approved by {match.reviewed_by} — evidence created
                </div>
              )}
              {match.review_status === 'rejected' && (
                <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 500 }}>
                  Rejected by {match.reviewed_by}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
