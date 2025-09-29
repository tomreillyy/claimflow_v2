'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

export function ProjectsDashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
            backgroundColor: '#007acc',
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
            backgroundColor: '#007acc',
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
            backgroundColor: '#007acc',
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
                lineHeight: 1.3
              }}>
                {project.name}
              </h3>
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
                  backgroundColor: '#007acc',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 500,
                  flex: 1,
                  textAlign: 'center'
                }}
              >
                View Timeline
              </a>
              <a
                href={`/p/${project.project_token}/upload`}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'white',
                  color: '#007acc',
                  textDecoration: 'none',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 500,
                  border: '1px solid #007acc'
                }}
              >
                Upload
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}