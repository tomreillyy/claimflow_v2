'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const NAVY = '#1e3a5f';

export default function AuditDrawer({ token, isOpen, onClose }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !token) return;
    setLoading(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      const headers = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};
      fetch(`/api/projects/${token}/financials/audit`, { headers })
        .then(res => res.ok ? res.json() : { events: [] })
        .then(data => setEvents(data.events || []))
        .catch(() => setEvents([]))
        .finally(() => setLoading(false));
    });
  }, [isOpen, token]);

  if (!isOpen) return null;

  const formatAction = (action) => {
    // financials.team.create -> Team: Created
    const parts = action.replace('financials.', '').split('.');
    const section = parts[0]?.charAt(0).toUpperCase() + parts[0]?.slice(1);
    const verb = parts[1] === 'create' ? 'Added' : parts[1] === 'delete' ? 'Deleted' : 'Updated';
    return `${section}: ${verb}`;
  };

  const formatChanges = (metadata) => {
    if (!metadata) return null;
    if (metadata.changes) {
      return Object.entries(metadata.changes).map(([field, { old: oldVal, new: newVal }]) => (
        `${field}: ${oldVal ?? '(empty)'} → ${newVal ?? '(empty)'}`
      )).join(', ');
    }
    if (metadata.person_name) return metadata.person_name;
    if (metadata.description) return metadata.description;
    return null;
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return d.toLocaleDateString('en-AU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.3)',
          zIndex: 100,
        }}
      />
      {/* Drawer */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 400,
        maxWidth: '90vw',
        backgroundColor: 'white',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        zIndex: 101,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1a1a1a' }}>
            Change History
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              color: '#6b7280',
              cursor: 'pointer',
              padding: '2px 6px',
            }}
          >
            x
          </button>
        </div>

        {/* Events */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: 20 }}>Loading...</div>
          ) : events.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: 20, fontSize: 13 }}>
              No changes recorded yet. Edits to the Financials workspace will appear here.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {events.map((event, idx) => {
                const details = formatChanges(event.metadata);
                return (
                  <div key={event.id} style={{
                    padding: '10px 0',
                    borderBottom: idx < events.length - 1 ? '1px solid #f0f0f0' : 'none',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>
                          {formatAction(event.action)}
                        </span>
                        <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8 }}>
                          by {event.user_email?.split('@')[0] || 'unknown'}
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap', marginLeft: 8 }}>
                        {formatTime(event.created_at)}
                      </span>
                    </div>
                    {details && (
                      <div style={{
                        fontSize: 12,
                        color: '#6b7280',
                        marginTop: 4,
                        fontFamily: 'monospace',
                        wordBreak: 'break-all',
                        lineHeight: 1.4,
                      }}>
                        {details}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
