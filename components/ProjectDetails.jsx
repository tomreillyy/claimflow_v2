'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Check, AlertCircle, Save } from 'lucide-react';

const TECHNICAL_FIELDS = [
  {
    key: 'technical_uncertainty',
    label: 'Technical uncertainty',
    prompt: 'What outcome cannot be determined in advance?',
    placeholder: 'e.g. Whether a transformer-based model can achieve >95% accuracy on our domain-specific OCR task with limited training data',
  },
  {
    key: 'knowledge_gap',
    label: 'Knowledge gap',
    prompt: "Why can't this be answered using existing knowledge?",
    placeholder: 'e.g. No published research addresses this specific combination of document types and resolution constraints',
  },
  {
    key: 'testing_method',
    label: 'Testing method',
    prompt: 'What experiments or testing are you performing?',
    placeholder: 'e.g. Systematic evaluation of fine-tuned models across varying dataset sizes and augmentation strategies',
  },
  {
    key: 'success_criteria',
    label: 'Success criteria',
    prompt: 'How will you know if it worked?',
    placeholder: 'e.g. Model achieves >95% character-level accuracy on our held-out test set with <200ms inference time',
  },
];

const ALL_FIELDS = [
  { key: 'name', label: 'Project name' },
  { key: 'current_hypothesis', label: 'Hypothesis' },
  { key: 'project_overview', label: 'Project overview' },
  ...TECHNICAL_FIELDS,
];

export default function ProjectDetails({ project, token, onProjectUpdate }) {
  const [form, setForm] = useState({
    name: project.name || '',
    year: project.year || new Date().getFullYear(),
    current_hypothesis: project.current_hypothesis || '',
    project_overview: project.project_overview || '',
    technical_uncertainty: project.technical_uncertainty || '',
    knowledge_gap: project.knowledge_gap || '',
    testing_method: project.testing_method || '',
    success_criteria: project.success_criteria || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const filledCount = ALL_FIELDS.filter(f => form[f.key]?.trim()).length;
  const totalCount = ALL_FIELDS.length;

  function updateField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setError('');
    setSaving(true);
    setSaved(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        setSaving(false);
        return;
      }

      const resp = await fetch('/api/projects/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          projectId: project.id,
          name: form.name.trim(),
          year: Number(form.year),
          current_hypothesis: form.current_hypothesis.trim() || null,
          project_overview: form.project_overview.trim() || null,
          technical_uncertainty: form.technical_uncertainty.trim() || null,
          knowledge_gap: form.knowledge_gap.trim() || null,
          testing_method: form.testing_method.trim() || null,
          success_criteria: form.success_criteria.trim() || null,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to save');

      setSaved(true);
      if (onProjectUpdate) onProjectUpdate(data.project);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    fontSize: 15,
    border: '1px solid #ddd',
    borderRadius: 6,
    outline: 'none',
    boxSizing: 'border-box',
    color: '#1a1a1a',
    transition: 'border-color 0.2s',
  };

  const sectionStyle = {
    backgroundColor: 'white',
    border: '1px solid #e5e5e5',
    borderRadius: 8,
    padding: 24,
    marginBottom: 20,
  };

  return (
    <div style={{ padding: '20px 0', maxWidth: 680 }}>
      {/* Completeness summary */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24,
        padding: '16px 20px',
        backgroundColor: filledCount === totalCount ? '#f0fdf4' : '#fffbeb',
        border: `1px solid ${filledCount === totalCount ? '#bbf7d0' : '#fde68a'}`,
        borderRadius: 8,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 15,
            fontWeight: 600,
            color: '#1a1a1a',
            marginBottom: 6,
          }}>
            {filledCount === totalCount
              ? 'All project details complete'
              : `${filledCount} of ${totalCount} fields complete`}
          </div>
          {/* Progress bar */}
          <div style={{
            width: '100%',
            height: 6,
            backgroundColor: '#e5e5e5',
            borderRadius: 3,
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${(filledCount / totalCount) * 100}%`,
              height: '100%',
              backgroundColor: filledCount === totalCount ? '#22c55e' : '#f59e0b',
              borderRadius: 3,
              transition: 'width 0.3s ease',
            }} />
          </div>
          {filledCount < totalCount && (
            <div style={{ fontSize: 13, color: '#666', marginTop: 6 }}>
              Missing: {ALL_FIELDS.filter(f => !form[f.key]?.trim()).map(f => f.label).join(', ')}
            </div>
          )}
        </div>
      </div>

      {/* Section 1: Basic Information */}
      <div style={sectionStyle}>
        <h3 style={{
          fontSize: 16,
          fontWeight: 600,
          color: '#1a1a1a',
          margin: '0 0 16px 0',
        }}>Basic Information</h3>

        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 500,
              color: '#555',
              marginBottom: 6,
            }}>Project name</label>
            <input
              value={form.name}
              onChange={e => updateField('name', e.target.value)}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#021048'}
              onBlur={e => e.target.style.borderColor = '#ddd'}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: '#555',
                marginBottom: 6,
              }}>Financial year</label>
              <select
                value={form.year}
                onChange={e => updateField('year', e.target.value)}
                style={{ ...inputStyle, backgroundColor: 'white' }}
                onFocus={e => e.target.style.borderColor = '#021048'}
                onBlur={e => e.target.style.borderColor = '#ddd'}
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
                fontSize: 13,
                fontWeight: 500,
                color: '#555',
                marginBottom: 6,
              }}>Created</label>
              <div style={{
                padding: '10px 12px',
                fontSize: 15,
                color: '#666',
                backgroundColor: '#f9fafb',
                borderRadius: 6,
                border: '1px solid #e5e5e5',
              }}>
                {project.created_at
                  ? new Date(project.created_at).toLocaleDateString('en-AU', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })
                  : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Technical Framing */}
      <div style={sectionStyle}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}>
          <h3 style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#1a1a1a',
            margin: 0,
          }}>Technical Framing</h3>
          <span style={{
            fontSize: 12,
            fontWeight: 500,
            color: '#666',
            backgroundColor: '#f3f4f6',
            padding: '4px 10px',
            borderRadius: 12,
          }}>
            {TECHNICAL_FIELDS.filter(f => form[f.key]?.trim()).length} of {TECHNICAL_FIELDS.length} defined
          </span>
        </div>

        <div style={{ display: 'grid', gap: 20 }}>
          {TECHNICAL_FIELDS.map((field) => {
            const isEmpty = !form[field.key]?.trim();
            return (
              <div
                key={field.key}
                style={{
                  borderLeft: `3px solid ${isEmpty ? '#f59e0b' : '#22c55e'}`,
                  paddingLeft: 16,
                  transition: 'border-color 0.2s',
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 4,
                }}>
                  <label style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#1a1a1a',
                  }}>{field.label}</label>
                  {isEmpty ? (
                    <span style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: '#d97706',
                      backgroundColor: '#fffbeb',
                      border: '1px solid #fde68a',
                      padding: '1px 8px',
                      borderRadius: 10,
                    }}>Missing</span>
                  ) : (
                    <Check size={14} color="#22c55e" strokeWidth={3} />
                  )}
                </div>
                <p style={{
                  fontSize: 13,
                  color: '#666',
                  margin: '0 0 8px 0',
                }}>{field.prompt}</p>
                <textarea
                  value={form[field.key]}
                  onChange={e => updateField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={3}
                  style={{
                    ...inputStyle,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                  onFocus={e => e.target.style.borderColor = '#021048'}
                  onBlur={e => e.target.style.borderColor = '#ddd'}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3: Project Overview */}
      <div style={sectionStyle}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
        }}>
          <h3 style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#1a1a1a',
            margin: 0,
          }}>Project Overview</h3>
          {!form.project_overview?.trim() && (
            <span style={{
              fontSize: 11,
              fontWeight: 500,
              color: '#d97706',
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              padding: '1px 8px',
              borderRadius: 10,
            }}>Missing</span>
          )}
        </div>
        <p style={{
          fontSize: 13,
          color: '#666',
          margin: '0 0 8px 0',
        }}>Describe the project context, technical challenges, and what you're trying to achieve.</p>
        <textarea
          value={form.project_overview}
          onChange={e => updateField('project_overview', e.target.value)}
          placeholder="This context is used in claim pack generation..."
          rows={4}
          style={{
            ...inputStyle,
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
          onFocus={e => e.target.style.borderColor = '#021048'}
          onBlur={e => e.target.style.borderColor = '#ddd'}
        />
      </div>

      {/* Section 4: Hypothesis */}
      <div style={sectionStyle}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
        }}>
          <h3 style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#1a1a1a',
            margin: 0,
          }}>Hypothesis</h3>
          {!form.current_hypothesis?.trim() && (
            <span style={{
              fontSize: 11,
              fontWeight: 500,
              color: '#d97706',
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              padding: '1px 8px',
              borderRadius: 10,
            }}>Missing</span>
          )}
        </div>
        <p style={{
          fontSize: 13,
          color: '#666',
          margin: '0 0 8px 0',
        }}>One sentence — technical and testable (not a business goal).</p>
        <input
          value={form.current_hypothesis}
          onChange={e => updateField('current_hypothesis', e.target.value)}
          placeholder="If we <approach> under <conditions>, we expect <measurable outcome> because <technical reason>."
          maxLength={280}
          style={inputStyle}
          onFocus={e => e.target.style.borderColor = '#021048'}
          onBlur={e => e.target.style.borderColor = '#ddd'}
        />
        <div style={{
          fontSize: 12,
          color: '#999',
          marginTop: 4,
          textAlign: 'right',
        }}>{form.current_hypothesis.length}/280</div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: 12,
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 6,
          fontSize: 14,
          color: '#dc2626',
          marginBottom: 16,
        }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          width: '100%',
          padding: '14px 24px',
          fontSize: 16,
          fontWeight: 500,
          color: 'white',
          backgroundColor: saving ? '#ccc' : '#021048',
          border: 'none',
          borderRadius: 8,
          cursor: saving ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.2s',
        }}
        onMouseOver={e => { if (!saving) e.currentTarget.style.backgroundColor = '#010a2e'; }}
        onMouseOut={e => { if (!saving) e.currentTarget.style.backgroundColor = '#021048'; }}
      >
        {saving ? (
          'Saving...'
        ) : saved ? (
          <>
            <Check size={18} />
            Saved
          </>
        ) : (
          <>
            <Save size={18} />
            Save changes
          </>
        )}
      </button>
    </div>
  );
}
