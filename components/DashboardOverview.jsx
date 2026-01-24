'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { Spinner } from '@/components/Spinner';

function formatCurrency(amount) {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}k`;
  }
  return `$${amount.toFixed(0)}`;
}

function formatDate(dateString) {
  if (!dateString) return '—';
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
      minWidth: 0
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8
      }}>
        <span style={{ color: '#64748b' }}>{icon}</span>
        <span style={{
          fontSize: 13,
          fontWeight: 500,
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.03em'
        }}>
          {label}
        </span>
      </div>
      <div style={{
        fontSize: 32,
        fontWeight: 700,
        color: '#0f172a',
        lineHeight: 1.1
      }}>
        {value}
      </div>
      {subtext && (
        <div style={{
          fontSize: 13,
          color: '#94a3b8',
          marginTop: 4
        }}>
          {subtext}
        </div>
      )}
    </div>
  );
}

function CoverageBar({ percent, stepsPresent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 80,
        height: 6,
        backgroundColor: '#e2e8f0',
        borderRadius: 3,
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${percent}%`,
          height: '100%',
          backgroundColor: percent === 100 ? '#10b981' : percent >= 60 ? '#021048' : '#f59e0b',
          borderRadius: 3,
          transition: 'width 0.3s ease'
        }} />
      </div>
      <span style={{
        fontSize: 13,
        color: '#64748b',
        fontWeight: 500,
        minWidth: 45
      }}>
        {stepsPresent}/5
      </span>
    </div>
  );
}

export function DashboardOverview() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;

    const fetchDashboard = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError('Please sign in to view your dashboard');
          setLoading(false);
          return;
        }

        const response = await fetch('/api/dashboard/stats', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Error fetching dashboard:', err);
        setError('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [user]);

  if (!user) return null;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 24px' }}>
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: 18, color: '#dc3545', marginBottom: 20 }}>
          {error}
        </div>
      </div>
    );
  }

  if (!data || data.projects.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px' }}>
        <h2 style={{
          fontSize: 32,
          fontWeight: 600,
          color: '#1a1a1a',
          margin: '0 0 16px 0'
        }}>
          Welcome to ClaimFlow!
        </h2>
        <p style={{
          fontSize: 18,
          color: '#666',
          margin: '0 0 32px 0',
          maxWidth: 500,
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          You don&apos;t have any projects yet. Create your first project to start collecting R&D evidence.
        </p>
        <a
          href="/admin/new-project"
          style={{
            padding: '14px 28px',
            backgroundColor: '#021048',
            color: 'white',
            textDecoration: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 500,
            display: 'inline-block'
          }}
        >
          Create your first project
        </a>
      </div>
    );
  }

  const { projects, totals } = data;

  return (
    <div style={{
      maxWidth: 1000,
      margin: '0 auto',
      padding: '40px 24px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32
      }}>
        <h2 style={{
          fontSize: 32,
          fontWeight: 600,
          color: '#1a1a1a',
          margin: 0
        }}>
          Dashboard
        </h2>
        <a
          href="/admin/new-project"
          style={{
            padding: '10px 20px',
            backgroundColor: '#021048',
            color: 'white',
            textDecoration: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500
          }}
        >
          New Project
        </a>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 32
      }}>
        <StatCard
          label="Projects"
          value={totals.projectCount}
          subtext={`${totals.projectCount} active`}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
          }
        />
        <StatCard
          label="Evidence"
          value={totals.evidenceCount}
          subtext={totals.evidenceThisWeek > 0 ? `+${totals.evidenceThisWeek} this week` : 'No new this week'}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          }
        />
        <StatCard
          label="R&D Spend"
          value={formatCurrency(totals.totalCost)}
          subtext="Total recorded"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          }
        />
        <StatCard
          label="Coverage"
          value={`${totals.avgCoverage}%`}
          subtext="Avg step coverage"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 11 12 14 22 4"></polyline>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
          }
        />
      </div>

      {/* Projects Table */}
      <div style={{
        background: 'linear-gradient(145deg, #ffffff 0%, #fafbfc 100%)',
        borderRadius: 16,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
        border: '1px solid rgba(0,0,0,0.06)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          backgroundColor: 'rgba(0,0,0,0.01)'
        }}>
          <h3 style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#0f172a',
            margin: 0
          }}>
            Projects Overview
          </h3>
        </div>

        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr 1fr',
          padding: '12px 24px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          backgroundColor: 'rgba(0,0,0,0.02)'
        }}>
          {['Project', 'Year', 'Evidence', 'Cost', 'Coverage', 'Last Activity'].map(header => (
            <div key={header} style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              {header}
            </div>
          ))}
        </div>

        {/* Table Rows */}
        {projects.map((project, index) => (
          <a
            key={project.id}
            href={`/p/${project.project_token}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr 1fr',
              padding: '16px 24px',
              borderBottom: index < projects.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'background-color 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(2,16,72,0.02)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <div style={{
              fontWeight: 600,
              color: '#0f172a',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              paddingRight: 16
            }}>
              {project.name}
            </div>
            <div style={{
              fontSize: 14,
              color: '#64748b'
            }}>
              {project.year}
            </div>
            <div style={{
              fontSize: 14,
              color: '#0f172a',
              fontWeight: 500
            }}>
              {project.evidenceCount}
            </div>
            <div style={{
              fontSize: 14,
              color: '#0f172a',
              fontWeight: 500
            }}>
              {project.totalCost > 0 ? formatCurrency(project.totalCost) : '—'}
            </div>
            <div>
              <CoverageBar percent={project.coveragePercent} stepsPresent={project.stepsPresent} />
            </div>
            <div style={{
              fontSize: 13,
              color: '#94a3b8'
            }}>
              {formatDate(project.lastActivity)}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
