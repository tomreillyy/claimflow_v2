'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Header } from '@/components/Header';
import { Spinner } from '@/components/Spinner';
import { ConsultantBreadcrumb } from '@/components/ConsultantBreadcrumb';
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

export default function ClientProjectsPage() {
  const { user, loading: authLoading, isConsultant, consultantStatusLoaded } = useAuth();
  const router = useRouter();
  const params = useParams();
  const clientId = params.id;
  const [projects, setProjects] = useState([]);
  const [totals, setTotals] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    } else if (!authLoading && consultantStatusLoaded && user && !isConsultant) {
      router.push('/dashboard');
    }
  }, [user, authLoading, isConsultant, consultantStatusLoaded, router]);

  useEffect(() => {
    if (!user || !clientId) return;
    fetchProjects();
  }, [user, clientId]);

  const fetchProjects = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/consultant/clients/${clientId}/projects`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (response.status === 404) {
        router.push('/consultant');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
        setTotals(data.totals || null);
        setClient(data.client || null);
        setMessage(data.message || '');
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setLoading(false);
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
        <ConsultantBreadcrumb items={[
          { label: 'Clients', href: '/consultant' },
          { label: client?.name || client?.email || 'Client' },
        ]} />

        {/* Client header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 32,
        }}>
          <div>
            <h1 style={{
              fontSize: 32,
              fontWeight: 600,
              color: '#0f172a',
              margin: '0 0 4px 0'
            }}>
              {client?.name || client?.email || 'Client'}
            </h1>
            {client?.name && (
              <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
                {client.email}
              </p>
            )}
          </div>
        </div>

        {/* Pending signup banner */}
        {message && (
          <div style={{
            padding: '14px 20px',
            background: 'linear-gradient(145deg, #fffbeb 0%, #fef9c3 100%)',
            border: '1px solid #fde68a',
            borderRadius: 12,
            marginBottom: 24,
            fontSize: 14,
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {message}
          </div>
        )}

        {/* Stat cards */}
        {totals && totals.project_count > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 16,
            marginBottom: 32,
          }}>
            <StatCard
              label="Projects"
              value={totals.project_count}
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
              value={totals.total_cost > 0 ? formatCurrency(totals.total_cost) : '\u2014'}
              subtext="Total recorded"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              }
            />
            <StatCard
              label="Team"
              value={totals.team_members}
              subtext="Unique participants"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
            />
          </div>
        )}

        {/* Projects list */}
        {projects.length === 0 && !message ? (
          <div style={{
            padding: 48,
            textAlign: 'center',
            background: 'linear-gradient(145deg, #ffffff 0%, #fafbfc 100%)',
            borderRadius: 16,
            border: '1px solid rgba(0,0,0,0.06)',
            color: '#94a3b8',
            fontSize: 14,
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <div style={{ fontWeight: 500, color: '#64748b', marginBottom: 4 }}>No projects yet</div>
            <div>This client hasn{"'"}t created any projects.</div>
          </div>
        ) : projects.length > 0 && (
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
                Projects
              </h3>
            </div>

            {/* Table Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 0.7fr 1fr 1fr 1fr 1fr 80px',
              padding: '12px 24px',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
              backgroundColor: 'rgba(0,0,0,0.02)',
            }}>
              {['Project', 'Year', 'Evidence', 'Team', 'R&D Spend', 'Last Activity', ''].map(header => (
                <div key={header || 'action'} style={{
                  fontSize: 12, fontWeight: 600, color: '#64748b',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  {header}
                </div>
              ))}
            </div>

            {/* Rows */}
            {projects.map((project, index) => (
              <div
                key={project.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 0.7fr 1fr 1fr 1fr 1fr 80px',
                  padding: '16px 24px',
                  borderBottom: index < projects.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
                onClick={() => router.push(`/p/${project.project_token}?cid=${clientId}&cn=${encodeURIComponent(client?.name || client?.email || 'Client')}`)}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(2,16,72,0.02)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {project.name}
                </div>
                <div>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 10px',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 500,
                    backgroundColor: 'rgba(0,0,0,0.04)',
                    color: '#64748b',
                  }}>
                    {project.year_end && project.year_end !== project.year ? `${project.year}–${project.year_end}` : (project.year || '\u2014')}
                  </span>
                </div>
                <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 500 }}>
                  {project.evidence_count}
                  {project.evidence_this_week > 0 && (
                    <span style={{ fontSize: 12, color: '#059669', fontWeight: 500, marginLeft: 6 }}>
                      +{project.evidence_this_week}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 500 }}>
                  {project.participant_count}
                </div>
                <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 500 }}>
                  {project.total_cost > 0 ? formatCurrency(project.total_cost) : '\u2014'}
                </div>
                <div style={{ fontSize: 13, color: '#94a3b8' }}>
                  {formatDate(project.last_activity)}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      padding: '6px 12px',
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#021048',
                      border: '1px solid #021048',
                      borderRadius: 6,
                      display: 'inline-block',
                    }}
                  >
                    View
                  </span>
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
