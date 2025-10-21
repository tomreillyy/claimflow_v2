'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function EditProjectModal({ project, onClose, onUpdate }) {
  const [name, setName] = useState(project?.name || '');
  const [year, setYear] = useState(project?.year || new Date().getFullYear());
  const [projectOverview, setProjectOverview] = useState(project?.project_overview || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (project) {
      setName(project.name);
      setYear(project.year);
      setProjectOverview(project.project_overview || '');
    }
  }, [project]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        setIsSaving(false);
        return;
      }

      const response = await fetch('/api/projects/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          projectId: project.id,
          name,
          year: Number(year),
          project_overview: projectOverview.trim() || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update project');
      }

      onUpdate(data.project);
      onClose();
    } catch (err) {
      console.error('Error updating project:', err);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!project) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: 24
    }}
    onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: 12,
          padding: 32,
          maxWidth: 500,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{
          fontSize: 24,
          fontWeight: 600,
          color: '#1a1a1a',
          margin: '0 0 24px 0'
        }}>
          Edit Project
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 20 }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 500,
              color: '#333',
              marginBottom: 6
            }}>
              Project name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 16,
                border: '1px solid #ddd',
                borderRadius: 6,
                outline: 'none',
                boxSizing: 'border-box',
                color: '#1a1a1a'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 500,
              color: '#333',
              marginBottom: 6
            }}>
              Year
            </label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 16,
                border: '1px solid #ddd',
                borderRadius: 6,
                outline: 'none',
                boxSizing: 'border-box',
                color: '#1a1a1a',
                backgroundColor: 'white'
              }}
            >
              {Array.from({ length: 10 }, (_, i) => {
                const yearOption = new Date().getFullYear() - i;
                return <option key={yearOption} value={yearOption}>{yearOption}</option>;
              })}
            </select>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 500,
              color: '#333',
              marginBottom: 6
            }}>
              Project overview
            </label>
            <textarea
              value={projectOverview}
              onChange={(e) => setProjectOverview(e.target.value)}
              placeholder="Describe the project context, technical challenges, and what you're trying to achieve."
              rows={5}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 16,
                border: '1px solid #ddd',
                borderRadius: 6,
                outline: 'none',
                boxSizing: 'border-box',
                color: '#1a1a1a',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
            <p style={{
              fontSize: 13,
              color: '#555',
              margin: '4px 0 0 0'
            }}>
              This context is used in claim pack generation.
            </p>
          </div>

          {error && (
            <div style={{
              padding: 12,
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 6,
              fontSize: 14,
              color: '#dc2626'
            }}>
              {error}
            </div>
          )}

          <div style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'flex-end',
            marginTop: 8
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              style={{
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 500,
                color: '#666',
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: 6,
                cursor: isSaving ? 'not-allowed' : 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 500,
                color: 'white',
                backgroundColor: isSaving ? '#ccc' : '#021048',
                border: 'none',
                borderRadius: 6,
                cursor: isSaving ? 'not-allowed' : 'pointer'
              }}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
