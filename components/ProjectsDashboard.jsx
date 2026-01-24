'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { EditProjectModal } from '@/components/EditProjectModal';

export function ProjectsDashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
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

      // Remove the project from the UI
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
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{
          fontSize: 18,
          color: '#666'
        }}>
          Loading your projects...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{
          fontSize: 18,
          color: '#dc3545',
          marginBottom: 20
        }}>
          {error}
        </div>
        <a
          href="/admin/new-project"
          style={{
            padding: '12px 24px',
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

  if (projects.length === 0) {
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

  return (
    <div style={{
      maxWidth: 1000,
      margin: '0 auto',
      padding: '40px 24px'
    }}>
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
          Your Projects
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

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: 20
      }}>
        {projects.map((project) => (
          <div
            key={project.id}
            className="project-card"
            style={{
              background: 'linear-gradient(145deg, #ffffff 0%, #fafbfc 100%)',
              borderRadius: 16,
              padding: 0,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              border: '1px solid rgba(0,0,0,0.06)',
              overflow: 'hidden',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              const card = e.currentTarget;
              card.style.transform = 'translateY(-2px)';
              card.style.boxShadow = '0 4px 12px rgba(2,16,72,0.08), 0 12px 28px rgba(2,16,72,0.12)';
              card.style.borderColor = 'rgba(2,16,72,0.12)';
            }}
            onMouseLeave={(e) => {
              const card = e.currentTarget;
              card.style.transform = 'translateY(0)';
              card.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)';
              card.style.borderColor = 'rgba(0,0,0,0.06)';
            }}
          >
            {/* Top accent line */}
            <div style={{
              height: 3,
              background: 'linear-gradient(90deg, #021048 0%, #1a3a8f 50%, #021048 100%)',
              opacity: 0.85
            }} />

            <div style={{ padding: '20px 22px 22px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 16
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{
                    fontSize: 17,
                    fontWeight: 600,
                    color: '#0f172a',
                    margin: 0,
                    lineHeight: 1.35,
                    letterSpacing: '-0.01em',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {project.name}
                  </h3>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 8
                  }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      backgroundColor: 'rgba(2,16,72,0.06)',
                      color: '#021048',
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: '0.02em'
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                      {project.year}
                    </span>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      color: '#64748b',
                      fontSize: 13,
                      fontWeight: 500
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                      {project.participants && project.participants.length > 0
                        ? `${project.participants.length}`
                        : '0'
                      }
                    </span>
                  </div>
                </div>
                <div style={{ position: 'relative', marginLeft: 12 }} ref={el => menuRefs.current[project.id] = el}>
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
                      padding: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8',
                      borderRadius: 8,
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)';
                      e.currentTarget.style.color = '#64748b';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#94a3b8';
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
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
                      marginTop: 6,
                      backgroundColor: 'white',
                      border: '1px solid rgba(0,0,0,0.08)',
                      borderRadius: 12,
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 10px 20px -2px rgba(0,0,0,0.1)',
                      zIndex: 1000,
                      minWidth: 160,
                      overflow: 'hidden',
                      padding: '4px'
                    }}>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleEditProject(project);
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          border: 'none',
                          background: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: 14,
                          color: '#374151',
                          fontWeight: 500,
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          border: 'none',
                          background: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: 14,
                          color: '#ef4444',
                          fontWeight: 500,
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        Delete Project
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: 10,
                marginTop: 20
              }}>
                <a
                  href={`/p/${project.project_token}`}
                  style={{
                    padding: '10px 18px',
                    background: 'linear-gradient(135deg, #021048 0%, #0a1f5c 100%)',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    flex: 1,
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 2px rgba(2,16,72,0.15)',
                    letterSpacing: '0.01em'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #0a1f5c 0%, #142d6e 100%)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(2,16,72,0.25)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #021048 0%, #0a1f5c 100%)';
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(2,16,72,0.15)';
                  }}
                >
                  View Details
                </a>
                <a
                  href={`/p/${project.project_token}/upload`}
                  style={{
                    padding: '10px 18px',
                    backgroundColor: 'transparent',
                    color: '#021048',
                    textDecoration: 'none',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    border: '1.5px solid rgba(2,16,72,0.2)',
                    transition: 'all 0.2s ease',
                    letterSpacing: '0.01em',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#021048';
                    e.currentTarget.style.backgroundColor = 'rgba(2,16,72,0.04)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(2,16,72,0.2)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  Upload
                </a>
              </div>
            </div>
          </div>
        ))}
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