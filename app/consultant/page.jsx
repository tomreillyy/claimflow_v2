'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Header } from '@/components/Header';
import { Spinner } from '@/components/Spinner';
import Link from 'next/link';

function formatCurrency(amount) {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}k`;
  return `$${amount.toFixed(0)}`;
}

function formatDate(dateString) {
  if (!dateString) return '\u2014';
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function StatCard({ label, value, subtext, icon }) {
  return (
    <div style={{
      background: 'linear-gradient(145deg, #ffffff 0%, #fafbfc 100%)',
      borderRadius: 16,
      padding: '20px 24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
      border: '1px solid rgba(0,0,0,0.06)',
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ color: '#64748b' }}>{icon}</span>
        <span style={{
          fontSize: 13,
          fontWeight: 500,
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
        }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>
        {value}
      </div>
      {subtext && (
        <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
          {subtext}
        </div>
      )}
    </div>
  );
}

export default function ConsultantDashboardPage() {
  const { user, loading: authLoading, isConsultant, consultantStatusLoaded, refreshConsultantStatus } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ email: '', name: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    } else if (!authLoading && consultantStatusLoaded && user && !isConsultant) {
      router.push('/dashboard');
    }
  }, [user, authLoading, isConsultant, consultantStatusLoaded, router]);

  useEffect(() => {
    if (!user) return;
    fetchDashboard();
  }, [user]);

  const fetchDashboard = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/consultant/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setClients(data.clients || []);
        setTotals(data.totals || null);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/consultant/clients', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add client');
      }

      setFormData({ email: '', name: '' });
      setShowAddForm(false);
      fetchDashboard();
      refreshConsultantStatus();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FAFAFA',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
    }}>
      <Header />

      {(authLoading || loading) ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <Spinner />
        </div>
      ) : (
      <main style={{
        maxWidth: 1000,
        margin: '0 auto',
        padding: '40px 24px'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 32,
        }}>
          <h2 style={{ fontSize: 32, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
            Dashboard
          </h2>
          {!showAddForm && (
            <button
              onClick={() => {
                setShowAddForm(true);
                setFormData({ email: '', name: '' });
                setError('');
              }}
              style={{
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 500,
                color: 'white',
                backgroundColor: '#021048',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              + Add client
            </button>
          )}
        </div>

        {/* Add client form */}
        {showAddForm && (
          <form onSubmit={handleSubmit} style={{
            background: 'linear-gradient(145deg, #ffffff 0%, #fafbfc 100%)',
            border: '1px solid rgba(0,0,0,0.06)',
            borderRadius: 16,
            padding: 20,
            marginBottom: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: '#0f172a' }}>
              Add Client
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#64748b', marginBottom: 4 }}>
                  Company name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Acme Corp"
                  style={{
                    width: '100%', padding: '8px 12px', fontSize: 14,
                    border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none',
                    boxSizing: 'border-box', color: '#1a1a1a',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#64748b', marginBottom: 4 }}>
                  Client email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@client.com"
                  style={{
                    width: '100%', padding: '8px 12px', fontSize: 14,
                    border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none',
                    boxSizing: 'border-box', color: '#1a1a1a',
                  }}
                />
              </div>
            </div>

            {error && (
              <div style={{
                padding: 8, backgroundColor: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 8, fontSize: 13, color: '#dc2626', marginBottom: 12,
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={saving} style={{
                padding: '8px 16px', fontSize: 14, fontWeight: 500, color: 'white',
                backgroundColor: saving ? '#ccc' : '#021048', border: 'none',
                borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer',
              }}>
                {saving ? 'Adding...' : 'Add'}
              </button>
              <button type="button" onClick={() => { setShowAddForm(false); setError(''); }} style={{
                padding: '8px 16px', fontSize: 14, color: '#64748b',
                backgroundColor: 'white', border: '1px solid #e2e8f0',
                borderRadius: 8, cursor: 'pointer',
              }}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Stats Cards */}
        {totals && totals.client_count > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 32,
          }}>
            <StatCard
              label="Clients"
              value={totals.active_clients}
              subtext={totals.pending_clients > 0 ? `${totals.pending_clients} pending signup` : 'All active'}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
            />
            <StatCard
              label="Projects"
              value={totals.project_count}
              subtext="Across all clients"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              }
            />
            <StatCard
              label="Evidence"
              value={totals.evidence_count}
              subtext={totals.evidence_this_week > 0 ? `+${totals.evidence_this_week} this week` : 'No new this week'}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              }
            />
            <StatCard
              label="R&D Spend"
              value={formatCurrency(totals.total_cost)}
              subtext="Total recorded"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              }
            />
          </div>
        )}

        {/* Clients Table */}
        {clients.length === 0 ? (
          <div style={{
            padding: 40,
            textAlign: 'center',
            background: 'linear-gradient(145deg, #ffffff 0%, #fafbfc 100%)',
            borderRadius: 16,
            border: '1px solid rgba(0,0,0,0.06)',
            color: '#94a3b8',
            fontSize: 14,
          }}>
            No clients yet. Add your first client above.
          </div>
        ) : (
          <div style={{
            background: 'linear-gradient(145deg, #ffffff 0%, #fafbfc 100%)',
            borderRadius: 16,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
            border: '1px solid rgba(0,0,0,0.06)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
              backgroundColor: 'rgba(0,0,0,0.01)',
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', margin: 0 }}>
                Clients Overview
              </h3>
            </div>

            {/* Table Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 0.8fr 80px',
              padding: '12px 24px',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
              backgroundColor: 'rgba(0,0,0,0.02)',
            }}>
              {['Company', 'Projects', 'Evidence', 'R&D Spend', 'Last Activity', 'Status', ''].map(header => (
                <div key={header || 'action'} style={{
                  fontSize: 12, fontWeight: 600, color: '#64748b',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  {header}
                </div>
              ))}
            </div>

            {/* Rows */}
            {clients.map((client, index) => (
              <div
                key={client.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 0.8fr 80px',
                  padding: '16px 24px',
                  borderBottom: index < clients.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                  alignItems: 'center',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(2,16,72,0.02)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {client.client_name || client.client_email}
                  </div>
                  {client.client_name && (
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                      {client.client_email}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 500 }}>
                  {client.client_user_id ? client.project_count : '\u2014'}
                </div>
                <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 500 }}>
                  {client.client_user_id ? client.evidence_count : '\u2014'}
                </div>
                <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 500 }}>
                  {client.client_user_id && client.total_cost > 0 ? formatCurrency(client.total_cost) : '\u2014'}
                </div>
                <div style={{ fontSize: 13, color: '#94a3b8' }}>
                  {client.client_user_id ? formatDate(client.last_activity) : '\u2014'}
                </div>
                <div>
                  <span style={{
                    display: 'inline-block', padding: '2px 8px', borderRadius: 10,
                    fontSize: 12, fontWeight: 500,
                    backgroundColor: client.client_user_id ? '#ecfdf5' : '#fefce8',
                    color: client.client_user_id ? '#059669' : '#ca8a04',
                  }}>
                    {client.client_user_id ? 'Active' : 'Pending'}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {client.client_user_id ? (
                    <Link
                      href={`/consultant/clients/${client.id}`}
                      style={{
                        padding: '6px 12px', fontSize: 13, fontWeight: 500,
                        color: '#021048', backgroundColor: 'transparent',
                        border: '1px solid #021048', borderRadius: 6,
                        textDecoration: 'none',
                      }}
                    >
                      View
                    </Link>
                  ) : (
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>Awaiting</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      )}
    </div>
  );
}
