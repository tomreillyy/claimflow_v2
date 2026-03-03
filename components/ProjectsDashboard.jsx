'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { EditProjectModal } from '@/components/EditProjectModal';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
}

export function ProjectsDashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);
  const menuRefs = useRef({});

  useEffect(() => {
    if (!user) return;

    const fetchProjects = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError('Please sign in to view your projects');
          setLoading(false);
          return;
        }

        const response = await fetch('/api/projects', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch projects');
        }

        const data = await response.json();
        setProjects(data.projects);
      } catch (err) {
        console.error('Error fetching projects:', err);
        setError('Failed to load projects');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuId && menuRefs.current[openMenuId] && !menuRefs.current[openMenuId].contains(event.target)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  const handleEditProject = (project) => {
    setEditingProject(project);
    setOpenMenuId(null);
  };

  const handleProjectUpdated = (updatedProject) => {
    setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const handleDeleteProject = async (projectId) => {
    if (!confirm('Are you sure you want to delete this project? It will be hidden but can be recovered.')) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please sign in to delete projects');
        return;
      }

      const response = await fetch('/api/projects/delete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete project');
      }

      setProjects(projects.filter(p => p.id !== projectId));
      setOpenMenuId(null);
    } catch (err) {
      console.error('Error deleting project:', err);
      alert('Failed to delete project: ' + err.message);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px', color: '#6b7280', fontSize: 15 }}>
        Loading your projects...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px' }}>
        <div style={{ fontSize: 16, color: '#dc3545', marginBottom: 20 }}>{error}</div>
        <a href="/admin/new-project" style={btnPrimary}>Create your first project</a>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 24px' }}>
        <h2 style={{ fontSize: 28, fontWeight: 600, color: '#1a1a1a', margin: '0 0 12px 0' }}>
          Welcome to ClaimFlow!
        </h2>
        <p style={{ fontSize: 16, color: '#6b7280', margin: '0 0 28px 0', maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
          You don&apos;t have any projects yet. Create your first project to start collecting R&D evidence.
        </p>
        <a href="/admin/new-project" style={btnPrimary}>Create your first project</a>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 600, color: '#0f172a', margin: 0 }}>
          Your Projects
        </h2>
        <a href="/admin/new-project" style={btnPrimary}>
          + New Project
        </a>
      </div>

      {/* Table container */}
      <div style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                <th style={th({ width: '45%' })}>Project Name</th>
                <th style={th({ width: '12%' })}>Year</th>
                <th style={th({ width: '12%' })}>Team</th>
                <th style={th({ width: '14%' })}>Created</th>
                <th style={th({ width: '17%', textAlign: 'right' })}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr
                  key={project.id}
                  onMouseEnter={() => setHoveredRow(project.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: hoveredRow === project.id ? '#fafbff' : 'transparent',
                    transition: 'background 0.1s ease'
                  }}
                >
                  {/* Project Name */}
                  <td style={td()}>
                    <a
                      href={`/p/${project.project_token}`}
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#0f172a',
                        textDecoration: 'none',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#021048'; e.currentTarget.style.textDecoration = 'underline'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.textDecoration = 'none'; }}
                    >
                      {project.name}
                    </a>
                  </td>

                  {/* Year */}
                  <td style={td()}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      backgroundColor: 'rgba(2,16,72,0.06)',
                      color: '#021048',
                      padding: '3px 9px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: '0.02em',
                      whiteSpace: 'nowrap'
                    }}>
                      {project.year || '—'}
                    </span>
                  </td>

                  {/* Team */}
                  <td style={td()}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#64748b', fontSize: 13 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                      {project.participants?.length ?? 0}
                    </span>
                  </td>

                  {/* Created */}
                  <td style={td()}>
                    <span style={{ fontSize: 13, color: '#94a3b8' }}>{formatDate(project.created_at)}</span>
                  </td>

                  {/* Actions */}
                  <td style={{ ...td(), textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <a
                        href={`/p/${project.project_token}`}
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#021048',
                          textDecoration: 'none',
                          padding: '5px 12px',
                          border: '1.5px solid rgba(2,16,72,0.2)',
                          borderRadius: 7,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          transition: 'all 0.15s ease',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#021048';
                          e.currentTarget.style.color = '#fff';
                          e.currentTarget.style.borderColor = '#021048';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = '#021048';
                          e.currentTarget.style.borderColor = 'rgba(2,16,72,0.2)';
                        }}
                      >
                        Open
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </a>

                      {/* Kebab menu */}
                      <div style={{ position: 'relative' }} ref={el => menuRefs.current[project.id] = el}>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === project.id ? null : project.id);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '5px 6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#94a3b8',
                            borderRadius: 7,
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)';
                            e.currentTarget.style.color = '#64748b';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = '#94a3b8';
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="5" r="2"></circle>
                            <circle cx="12" cy="12" r="2"></circle>
                            <circle cx="12" cy="19" r="2"></circle>
                          </svg>
                        </button>

                        {openMenuId === project.id && (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            marginTop: 4,
                            backgroundColor: 'white',
                            border: '1px solid rgba(0,0,0,0.08)',
                            borderRadius: 10,
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 10px 20px -2px rgba(0,0,0,0.1)',
                            zIndex: 1000,
                            minWidth: 150,
                            overflow: 'hidden',
                            padding: '4px'
                          }}>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleEditProject(project);
                              }}
                              style={menuItem()}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                              Edit Details
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeleteProject(project.id);
                              }}
                              style={menuItem({ color: '#ef4444' })}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              </svg>
                              Delete Project
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingProject && (
        <EditProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onUpdate={handleProjectUpdated}
        />
      )}
    </div>
  );
}

// Style helpers
const btnPrimary = {
  padding: '8px 18px',
  backgroundColor: '#021048',
  color: 'white',
  textDecoration: 'none',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 500,
  display: 'inline-block',
  whiteSpace: 'nowrap'
};

function th(extra = {}) {
  return {
    padding: '11px 16px',
    fontSize: 12,
    fontWeight: 600,
    color: '#6b7280',
    textAlign: 'left',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    ...extra
  };
}

function td(extra = {}) {
  return {
    padding: '13px 16px',
    fontSize: 14,
    color: '#374151',
    verticalAlign: 'middle',
    ...extra
  };
}

function menuItem(extra = {}) {
  return {
    width: '100%',
    padding: '9px 12px',
    border: 'none',
    background: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: 13,
    color: '#374151',
    fontWeight: 500,
    borderRadius: 7,
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    transition: 'background 0.1s ease',
    ...extra
  };
}
