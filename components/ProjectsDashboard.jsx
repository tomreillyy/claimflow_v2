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
          Welcome to Aird!
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
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 24
      }}>
        {projects.map((project) => (
          <div
            key={project.id}
            style={{
              backgroundColor: 'white',
              border: '1px solid #e5e5e5',
              borderRadius: 12,
              padding: 24,
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              transition: 'box-shadow 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 12
            }}>
              <h3 style={{
                fontSize: 20,
                fontWeight: 600,
                color: '#1a1a1a',
                margin: 0,
                lineHeight: 1.3,
                flex: 1
              }}>
                {project.name}
              </h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{
                  backgroundColor: '#f8f9fa',
                  color: '#495057',
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 500
                }}>
                  {project.year}
                </span>
                <div style={{ position: 'relative' }} ref={el => menuRefs.current[project.id] = el}>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === project.id ? null : project.id);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      fontSize: 18,
                      lineHeight: 1,
                      color: '#666',
                      borderRadius: 4
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    ⋮
                  </button>
                  {openMenuId === project.id && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: 4,
                      backgroundColor: 'white',
                      border: '1px solid #e5e5e5',
                      borderRadius: 6,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      zIndex: 1000,
                      minWidth: 150
                    }}>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleEditProject(project);
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 16px',
                          border: 'none',
                          background: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: 14,
                          color: '#333',
                          fontWeight: 500
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
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
                          padding: '10px 16px',
                          border: 'none',
                          background: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: 14,
                          color: '#dc3545',
                          fontWeight: 500,
                          borderTop: '1px solid #e5e5e5'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        Delete Project
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <p style={{
              color: '#666',
              fontSize: 14,
              margin: '0 0 16px 0',
              lineHeight: 1.4
            }}>
              {project.participants && project.participants.length > 0
                ? `${project.participants.length} participant${project.participants.length > 1 ? 's' : ''}`
                : 'No participants yet'
              }
            </p>

            <div style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap'
            }}>
              <a
                href={`/p/${project.project_token}`}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#021048',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 500,
                  flex: 1,
                  textAlign: 'center'
                }}
              >
                View details
              </a>
              <a
                href={`/p/${project.project_token}/upload`}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'white',
                  color: '#021048',
                  textDecoration: 'none',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 500,
                  border: '1px solid #021048'
                }}
              >
                Upload
              </a>
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