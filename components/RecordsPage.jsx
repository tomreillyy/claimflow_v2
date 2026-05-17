'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

const NAVY = '#021048';

const INTEGRATIONS = [
  {
    key: 'github',
    name: 'GitHub',
    description: 'Sync commits and pull requests as R&D evidence.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="#24292f">
        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
      </svg>
    ),
  },
  {
    key: 'jira',
    name: 'Jira',
    description: 'Sync tickets and epics as R&D evidence.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="#2684FF">
        <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24.013 12.487V1.005A1.005 1.005 0 0 0 23.013 0z"/>
      </svg>
    ),
  },
];

function IntegrationCard({ integration, connection, onConnect, onDisconnect, onSync, syncing }) {
  const connected = connection?.connected;
  const lastSynced = connection?.last_synced_at;

  return (
    <div style={{
      padding: '20px', borderRadius: 10, border: '1px solid #f0f1f3',
      background: 'white', display: 'flex', alignItems: 'flex-start', gap: 16,
    }}>
      <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 8, background: '#f8f9fb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {integration.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{integration.name}</span>
          {connected && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#16a34a', fontWeight: 500 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }} />
              Connected
            </span>
          )}
        </div>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 12px', lineHeight: 1.5 }}>
          {integration.description}
        </p>
        {connected && lastSynced && (
          <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>
            Last synced {new Date(lastSynced).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          {connected ? (
            <>
              <button
                onClick={() => onSync(integration.key)}
                disabled={syncing}
                style={{
                  padding: '7px 16px', fontSize: 13, fontWeight: 600,
                  color: 'white', background: syncing ? '#9ca3af' : NAVY,
                  border: 'none', borderRadius: 7, cursor: syncing ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {syncing ? 'Syncing…' : 'Sync now'}
              </button>
              <button
                onClick={() => onDisconnect(integration.key)}
                style={{
                  padding: '7px 14px', fontSize: 13, fontWeight: 500,
                  color: '#6b7280', background: 'white', border: '1px solid #d1d5db',
                  borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={() => onConnect(integration.key)}
              style={{
                padding: '7px 16px', fontSize: 13, fontWeight: 600,
                color: 'white', background: NAVY,
                border: 'none', borderRadius: 7, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Connect {integration.name}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RecordsPage({ token, projectId, activities }) {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState({});
  const [syncResult, setSyncResult] = useState(null);
  const [error, setError] = useState('');

  const getHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  }, []);

  const fetchConnections = useCallback(async () => {
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/projects/${token}/records/connections`, { headers });
      const data = await res.json();
      if (res.ok) setConnections(data.connections || []);
    } catch { /* non-critical */ }
    setLoading(false);
  }, [token, getHeaders]);

  useEffect(() => { fetchConnections(); }, [fetchConnections]);

  const handleConnect = (source) => {
    if (source === 'jira') window.open('/api/jira/auth/start', '_blank');
    else if (source === 'github') window.open('/api/github/auth/start', '_blank');
  };

  const handleDisconnect = async (source) => {
    if (!confirm(`Disconnect ${source}? Existing evidence will be kept.`)) return;
    // TODO: implement disconnect endpoint
  };

  const handleSync = async (source) => {
    setSyncing(prev => ({ ...prev, [source]: true }));
    setSyncResult(null);
    setError('');
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/projects/${token}/records/sync`, { method: 'POST', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setSyncResult(data.results);
      await fetchConnections();
    } catch (err) {
      setError(err.message);
    }
    setSyncing(prev => ({ ...prev, [source]: false }));
  };

  const getConnection = (key) => connections.find(c => c.source === key);
  const connectedCount = connections.filter(c => c.connected).length;

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 19, fontWeight: 700, color: '#111827' }}>Integrations</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
          Connect your tools so ClaimFlow can automatically gather R&D evidence.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '10px 14px', marginBottom: 16, borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 13, color: '#dc2626', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {error}
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 16 }}>×</button>
        </div>
      )}

      {/* Sync result */}
      {syncResult && (
        <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {syncResult.github?.synced && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: 13, color: '#166534' }}>
              GitHub: synced {syncResult.github.sync?.synced || 0} commits, matched {syncResult.github.match?.matched || 0} to activities
            </div>
          )}
          {syncResult.jira?.synced && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: 13, color: '#1e40af' }}>
              Jira: matched {syncResult.jira.match?.matched || 0} issues to activities
            </div>
          )}
          {syncResult.github?.error && syncResult.github.error !== 'not_connected' && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 13, color: '#dc2626' }}>
              GitHub error: {syncResult.github.error}
            </div>
          )}
          {syncResult.jira?.error && syncResult.jira.error !== 'not_connected' && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 13, color: '#dc2626' }}>
              Jira error: {syncResult.jira.error}
            </div>
          )}
        </div>
      )}

      {/* Integration cards */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {INTEGRATIONS.map(integration => (
            <IntegrationCard
              key={integration.key}
              integration={integration}
              connection={getConnection(integration.key)}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onSync={handleSync}
              syncing={syncing[integration.key]}
            />
          ))}
        </div>
      )}

      {/* Status summary */}
      {connectedCount > 0 && (
        <div style={{ marginTop: 20, padding: '14px 16px', borderRadius: 8, background: '#f8f9fb', border: '1px solid #eef0f2', fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
          {connectedCount} integration{connectedCount > 1 ? 's' : ''} connected. Evidence from synced tools appears automatically in your workspace activities.
        </div>
      )}

      {connectedCount === 0 && !loading && (
        <div style={{ marginTop: 20, padding: '14px 16px', borderRadius: 8, background: '#f8f9fb', border: '1px solid #eef0f2', fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
          No integrations connected yet. Connect GitHub or Jira above to start gathering R&D evidence automatically.
        </div>
      )}
    </div>
  );
}
