'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Spinner } from '@/components/Spinner';
import { Check, AlertCircle, Link2, Unlink } from 'lucide-react';

export default function IntegrationsPage() {
  const { user, session } = useAuth();
  const router = useRouter();
  const [xeroStatus, setXeroStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  // We need a project token to check status — use the most recent project
  // For now, this page shows account-level Xero connection status
  useEffect(() => {
    if (!session?.access_token) return;
    checkXeroConnection();
  }, [session]);

  async function checkXeroConnection() {
    try {
      // Check if user has xero tokens by hitting any project's status endpoint
      // For account-level view, we check the token table directly via a simple endpoint
      const res = await fetch('/api/xero/status', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setXeroStatus(data);
      }
    } catch (err) {
      console.error('Failed to check Xero status:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleConnectXero() {
    setConnecting(true);
    try {
      // Need a project token for the OAuth state — use a placeholder approach
      // In practice, user connects from a project's financials page
      const res = await fetch('/api/xero/auth/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ project_token: '_settings' })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Failed to start Xero OAuth:', err);
    } finally {
      setConnecting(false);
    }
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Header />
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#021048', marginBottom: 8 }}>
          Integrations
        </h1>
        <p style={{ color: '#6b7280', marginBottom: 32 }}>
          Connect third-party services to import data into ClaimFlow.
        </p>

        {/* Xero Card */}
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 24,
          marginBottom: 16,
          background: '#fff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 8,
                background: '#13B5EA', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 14
              }}>
                X
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#021048', margin: 0 }}>
                  Xero
                </h3>
                <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                  Import employee payroll and contractor bills
                </p>
              </div>
            </div>

            {loading ? (
              <Spinner size={20} />
            ) : xeroStatus?.connected ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: '#ecfdf5', color: '#059669', padding: '4px 10px',
                  borderRadius: 6, fontSize: 13, fontWeight: 500
                }}>
                  <Check size={14} /> Connected
                </span>
              </div>
            ) : (
              <button
                onClick={handleConnectXero}
                disabled={connecting}
                style={{
                  background: '#021048', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '8px 16px', fontSize: 14,
                  fontWeight: 500, cursor: 'pointer', opacity: connecting ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', gap: 6
                }}
              >
                <Link2 size={14} />
                {connecting ? 'Connecting...' : 'Connect Xero'}
              </button>
            )}
          </div>

          {xeroStatus?.connected && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
              <div style={{ display: 'flex', gap: 24, fontSize: 13, color: '#6b7280' }}>
                <div>
                  <span style={{ fontWeight: 500 }}>Organisation:</span>{' '}
                  {xeroStatus.tenantName}
                </div>
                {xeroStatus.lastSyncedAt && (
                  <div>
                    <span style={{ fontWeight: 500 }}>Last synced:</span>{' '}
                    {new Date(xeroStatus.lastSyncedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* GitHub Card (existing integration, show status) */}
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 24,
          marginBottom: 16,
          background: '#fff',
          opacity: 0.7
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 8,
              background: '#24292f', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 14
            }}>
              GH
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#021048', margin: 0 }}>
                GitHub
              </h3>
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                Sync commits as R&D evidence. Connected per-project from the Records tab.
              </p>
            </div>
          </div>
        </div>

        {/* Jira Card (existing integration, show status) */}
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 24,
          marginBottom: 16,
          background: '#fff',
          opacity: 0.7
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 8,
              background: '#0052CC', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 14
            }}>
              J
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#021048', margin: 0 }}>
                Jira
              </h3>
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                Sync tickets as R&D evidence. Connected per-project from the Records tab.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
