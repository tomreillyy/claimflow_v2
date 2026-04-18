'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

const NAVY = '#021048';
const STAGES = ['Hypothesis', 'Experiment', 'Observation', 'Evaluation', 'Conclusion'];

const SOURCE_ICONS = {
  manual: 'M', note: 'M', email: '@', github: 'G',
  document: 'D', upload: 'U', jira: 'J',
};

function relativeTime(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function StageDots({ coverage }) {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {STAGES.map(s => {
        const count = (coverage[s] || []).length;
        return (
          <span key={s} title={`${s}: ${count} item${count !== 1 ? 's' : ''}`} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: count > 0 ? '#16a34a' : '#d1d5db',
            flexShrink: 0,
          }} />
        );
      })}
    </div>
  );
}

/* ── Pill filter button ── */
function PillButton({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 12px',
        fontSize: 12,
        fontWeight: 500,
        color: active ? 'white' : '#6b7280',
        backgroundColor: active ? NAVY : 'transparent',
        border: `1px solid ${active ? NAVY : '#e5e7eb'}`,
        borderRadius: 6,
        cursor: 'pointer',
        transition: 'all 0.15s',
        fontFamily: 'inherit',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
      }}
    >
      {label}
      {count != null && (
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          opacity: active ? 0.8 : 0.6,
        }}>
          {count}
        </span>
      )}
    </button>
  );
}

/* ── Evidence row (compact) ── */
function EvidenceRow({ ev, evidenceSteps, evidenceActivityTypes, selected, onClick }) {
  const step = evidenceSteps[ev.id]?.step || ev.systematic_step_primary;
  const actType = evidenceActivityTypes[ev.id]?.activity_type || ev.activity_type || 'core';

  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 16px',
        borderBottom: '1px solid #f0f0f0',
        cursor: 'pointer',
        backgroundColor: selected ? '#f0f4ff' : 'white',
        transition: 'background-color 0.12s',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.backgroundColor = '#fafbfc'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.backgroundColor = 'white'; }}
    >
      {/* Meta row */}
      <div style={{
        fontSize: 12, color: '#9ca3af', marginBottom: 5,
        display: 'flex', alignItems: 'center', gap: 6,
        fontFamily: 'ui-monospace, Monaco, monospace',
      }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 18, height: 18, borderRadius: 3,
          backgroundColor: '#f3f4f6', fontSize: 10, fontWeight: 700,
          color: '#6b7280', flexShrink: 0,
        }}>
          {SOURCE_ICONS[ev.source] || 'M'}
        </span>
        <span style={{ color: '#6b7280', fontWeight: 500 }}>
          {relativeTime(ev.created_at)}
        </span>
        {step && step !== 'Unknown' && (
          <>
            <span style={{ color: '#d1d5db' }}>·</span>
            <span style={{ color: '#374151', fontWeight: 600, fontSize: 11 }}>{step}</span>
          </>
        )}
        {actType && (
          <>
            <span style={{ color: '#d1d5db' }}>·</span>
            <span style={{
              padding: '1px 5px', fontSize: 10, fontWeight: 600, borderRadius: 3,
              backgroundColor: actType === 'core' ? NAVY : '#6b7280', color: 'white',
            }}>
              {actType === 'core' ? 'Core' : 'Supporting'}
            </span>
          </>
        )}
      </div>

      {/* Content */}
      {ev.content && (
        <p style={{
          fontSize: 13, color: '#1a1a1a', lineHeight: 1.5, margin: 0,
          overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {ev.content}
        </p>
      )}

      {/* Author + timestamp */}
      {ev.author_email && (
        <div style={{ fontSize: 11, color: '#c0c5ce', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{ev.author_email}</span>
          <span style={{ color: '#e5e7eb' }}>·</span>
          <span>{new Date(ev.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      )}
    </div>
  );
}

/* ── Activity accordion row ── */
function ActivityRow({ activity, token, expanded, onToggle, onSelect }) {
  const [coverage, setCoverage] = useState({});
  const [loading, setLoading] = useState(false);
  const [evidence, setEvidence] = useState([]);

  const isAI = activity.source === 'ai';

  const fetchEvidence = useCallback(async () => {
    if (evidence.length > 0) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/projects/${token}/core-activities/${activity.id}/evidence`, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setCoverage(data.steps || {});
        const all = [];
        Object.entries(data.steps || {}).forEach(([step, items]) => {
          items.forEach(item => {
            if (!all.find(e => e.id === item.id)) {
              all.push({ ...item, _step: step });
            }
          });
        });
        setEvidence(all);
      }
    } catch (err) {
      console.error('Failed to fetch activity evidence:', err);
    }
    setLoading(false);
  }, [token, activity.id, evidence.length]);

  useEffect(() => {
    if (expanded && evidence.length === 0) fetchEvidence();
  }, [expanded, fetchEvidence]);

  const totalEvidence = evidence.length;

  return (
    <div style={{ borderBottom: '1px solid #f0f0f0' }}>
      {/* Activity header */}
      <div
        onClick={onToggle}
        style={{
          padding: '12px 16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          transition: 'background-color 0.12s',
        }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fafbfc'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
      >
        {/* Chevron */}
        <span style={{
          fontSize: 11, color: '#9ca3af', marginTop: 2, flexShrink: 0,
          transition: 'transform 0.15s',
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          display: 'inline-block', width: 14, textAlign: 'center',
        }}>
          ›
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name + badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              fontSize: 13, fontWeight: 600, color: '#111827',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {activity.name}
            </span>

            {/* AI / Manual badge */}
            <span style={{
              padding: '1px 6px', fontSize: 10, fontWeight: 600, borderRadius: 3,
              backgroundColor: isAI ? '#ede9fe' : '#ecfdf5',
              color: isAI ? '#7c3aed' : '#059669',
              flexShrink: 0,
            }}>
              {isAI ? 'AI' : 'Manual'}
            </span>

            {/* Status */}
            <span style={{
              padding: '1px 6px', fontSize: 10, fontWeight: 500, borderRadius: 3,
              backgroundColor: activity.status === 'adopted' ? '#dcfce7' : '#fef9c3',
              color: activity.status === 'adopted' ? '#166534' : '#854d0e',
              flexShrink: 0,
            }}>
              {activity.status === 'adopted' ? 'Adopted' : 'Draft'}
            </span>
          </div>

          {/* Uncertainty preview */}
          {activity.uncertainty && (
            <p style={{
              fontSize: 12, color: '#6b7280', margin: 0, lineHeight: 1.4,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {activity.uncertainty}
            </p>
          )}

          {/* Bottom meta */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginTop: 6,
            fontSize: 11, color: '#9ca3af',
          }}>
            <StageDots coverage={coverage} />
            <span>{totalEvidence} evidence item{totalEvidence !== 1 ? 's' : ''}</span>
            <span style={{ color: '#e5e7eb' }}>·</span>
            <span>{relativeTime(activity.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Expanded: evidence within activity */}
      {expanded && (
        <div style={{
          backgroundColor: '#f8f9fd',
          borderTop: '1px solid #e8eaf2',
          borderLeft: `3px solid ${NAVY}15`,
          marginLeft: 14,
        }}>
          {loading ? (
            <div style={{ padding: '16px 28px', fontSize: 12, color: '#9ca3af' }}>
              Loading evidence...
            </div>
          ) : evidence.length > 0 ? (
            evidence.map(ev => (
              <div
                key={ev.id}
                onClick={() => onSelect(ev.id)}
                style={{
                  padding: '8px 16px 8px 28px',
                  borderBottom: '1px solid #eceef5',
                  cursor: 'pointer',
                  transition: 'background-color 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#eef0f9'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 11, color: '#9ca3af', marginBottom: 3,
                  fontFamily: 'ui-monospace, Monaco, monospace',
                }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 16, height: 16, borderRadius: 3,
                    backgroundColor: '#e5e7eb', fontSize: 9, fontWeight: 700,
                    color: '#6b7280', flexShrink: 0,
                  }}>
                    {SOURCE_ICONS[ev.source] || 'M'}
                  </span>
                  <span style={{ fontWeight: 500, color: '#6b7280' }}>
                    {relativeTime(ev.created_at)}
                  </span>
                  {ev._step && (
                    <>
                      <span style={{ color: '#d1d5db' }}>·</span>
                      <span style={{ color: '#374151', fontWeight: 600 }}>{ev._step}</span>
                    </>
                  )}
                  {ev.author_email && (
                    <>
                      <span style={{ color: '#d1d5db' }}>·</span>
                      <span>{ev.author_email}</span>
                    </>
                  )}
                </div>
                {ev.content && (
                  <p style={{
                    fontSize: 12, color: '#374151', margin: 0, lineHeight: 1.4,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
                  }}>
                    {ev.content}
                  </p>
                )}
              </div>
            ))
          ) : (
            <div style={{ padding: '12px 28px', fontSize: 12, color: '#9ca3af' }}>
              No evidence linked yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Create activity modal ── */
function CreateActivityModal({ token, onCreated, onClose }) {
  const [name, setName] = useState('');
  const [uncertainty, setUncertainty] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim() || !uncertainty.trim()) return;
    setSaving(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/projects/${token}/core-activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name: name.trim(), uncertainty: uncertainty.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to create');
      }
      const activity = await res.json();
      onCreated(activity);
      onClose();
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: 'white', borderRadius: 12,
          width: 460, maxWidth: '90vw',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #f0f0f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>
            New activity
          </h3>
          <button
            onClick={onClose}
            style={{
              border: 'none', background: 'none', fontSize: 18,
              color: '#9ca3af', cursor: 'pointer', padding: '0 4px',
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Activity name
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Isolation Forest Thresholding"
            maxLength={60}
            style={{
              width: '100%', padding: '8px 12px', fontSize: 13,
              border: '1px solid #e5e7eb', borderRadius: 8,
              outline: 'none', fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
            onFocus={e => e.target.style.borderColor = NAVY}
            onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            autoFocus
          />
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, textAlign: 'right' }}>
            {name.length}/60
          </div>

          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, marginTop: 12 }}>
            Technical uncertainty
          </label>
          <textarea
            value={uncertainty}
            onChange={e => setUncertainty(e.target.value)}
            placeholder="What technical unknown are you investigating? What can't be determined in advance?"
            maxLength={800}
            rows={3}
            style={{
              width: '100%', padding: '8px 12px', fontSize: 13,
              border: '1px solid #e5e7eb', borderRadius: 8,
              outline: 'none', fontFamily: 'inherit', resize: 'vertical',
              boxSizing: 'border-box', lineHeight: 1.5,
            }}
            onFocus={e => e.target.style.borderColor = NAVY}
            onBlur={e => e.target.style.borderColor = '#e5e7eb'}
          />
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, textAlign: 'right' }}>
            {uncertainty.length}/800
          </div>

          {error && (
            <div style={{ fontSize: 12, color: '#dc2626', marginTop: 8 }}>{error}</div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid #f0f0f0',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '7px 14px', fontSize: 13, fontWeight: 500,
              color: '#6b7280', backgroundColor: 'white',
              border: '1px solid #e5e7eb', borderRadius: 8,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !name.trim() || !uncertainty.trim()}
            style={{
              padding: '7px 16px', fontSize: 13, fontWeight: 600,
              color: 'white',
              backgroundColor: saving || !name.trim() || !uncertainty.trim() ? '#a5b4fc' : NAVY,
              border: 'none', borderRadius: 8,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {saving ? 'Creating...' : 'Create activity'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main WorkspaceView
   ═══════════════════════════════════════════════════════════ */
export default function WorkspaceView({
  items = [],
  evidenceSteps = {},
  evidenceActivityTypes = {},
  activities = [],
  token,
  onActivitiesChange,
}) {
  const [filter, setFilter] = useState('all'); // 'all' | 'activities' | 'evidence'
  const [expandedActivity, setExpandedActivity] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleActivityCreated = (newActivity) => {
    if (onActivitiesChange) {
      onActivitiesChange([...activities, newActivity]);
    }
  };

  const activityCount = activities.length;
  const evidenceCount = items.length;

  return (
    <div style={{ display: 'flex', gap: 0, height: 'calc(100vh - 160px)', minHeight: 500 }}>
      {/* ── Left panel ── */}
      <div style={{
        flex: 1, borderRight: '1px solid #e5e5e5',
        display: 'flex', flexDirection: 'column', minWidth: 0,
      }}>
        {/* Toolbar */}
        <div style={{
          padding: '10px 16px',
          borderBottom: '1px solid #e5e5e5',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          {/* Pill filters */}
          <div style={{ display: 'flex', gap: 4 }}>
            <PillButton
              label="All"
              count={activityCount + evidenceCount}
              active={filter === 'all'}
              onClick={() => setFilter('all')}
            />
            <PillButton
              label="Activities"
              count={activityCount}
              active={filter === 'activities'}
              onClick={() => setFilter('activities')}
            />
            <PillButton
              label="Evidence"
              count={evidenceCount}
              active={filter === 'evidence'}
              onClick={() => setFilter('evidence')}
            />
          </div>

          {/* Create button — shown on Activities or All filter */}
          {(filter === 'all' || filter === 'activities') && (
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                padding: '5px 12px', fontSize: 12, fontWeight: 600,
                color: 'white', backgroundColor: NAVY,
                border: 'none', borderRadius: 6,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}
            >
              <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> Activity
            </button>
          )}
        </div>

        {/* List content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Activities section */}
          {(filter === 'all' || filter === 'activities') && activities.length > 0 && (
            <div>
              {filter === 'all' && (
                <div style={{
                  padding: '8px 16px', fontSize: 11, fontWeight: 600,
                  color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em',
                  backgroundColor: '#fafbfc', borderBottom: '1px solid #f0f0f0',
                }}>
                  Activities
                </div>
              )}
              {activities.map(act => (
                <ActivityRow
                  key={act.id}
                  activity={act}
                  token={token}
                  expanded={expandedActivity === act.id}
                  onToggle={() => setExpandedActivity(prev => prev === act.id ? null : act.id)}
                  onSelect={(evidenceId) => setSelectedId(evidenceId)}
                />
              ))}
            </div>
          )}

          {/* Evidence section */}
          {(filter === 'all' || filter === 'evidence') && (
            <div>
              {filter === 'all' && (
                <div style={{
                  padding: '8px 16px', fontSize: 11, fontWeight: 600,
                  color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em',
                  backgroundColor: '#fafbfc', borderBottom: '1px solid #f0f0f0',
                }}>
                  Evidence
                </div>
              )}
              {items.length > 0 ? (
                items.map(ev => (
                  <EvidenceRow
                    key={ev.id}
                    ev={ev}
                    evidenceSteps={evidenceSteps}
                    evidenceActivityTypes={evidenceActivityTypes}
                    selected={selectedId === ev.id}
                    onClick={() => setSelectedId(ev.id)}
                  />
                ))
              ) : (
                <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>
                  <p style={{ fontSize: 13, margin: 0 }}>No evidence yet</p>
                </div>
              )}
            </div>
          )}

          {/* Empty state for activities filter */}
          {filter === 'activities' && activities.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 4px' }}>No activities yet</p>
              <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 16px' }}>
                Create your first R&D activity to start organising evidence
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 600,
                  color: 'white', backgroundColor: NAVY,
                  border: 'none', borderRadius: 8,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Create activity
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel — Empty for now ── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        minWidth: 0, backgroundColor: '#fafbfc',
      }}>
        <div style={{ textAlign: 'center', color: '#9ca3af' }}>
          <p style={{ fontSize: 14, margin: 0, fontWeight: 500 }}>Workspace</p>
          <p style={{ fontSize: 13, margin: '4px 0 0', color: '#c0c5ce' }}>
            Select an item to get started
          </p>
        </div>
      </div>

      {/* Create modal */}
      {showCreateModal && (
        <CreateActivityModal
          token={token}
          onCreated={handleActivityCreated}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
