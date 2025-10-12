'use client';
import { useState } from 'react';

export default function AttestationsTable({ attestations, activities, projectToken, onUpdate }) {
  const [showManualForm, setShowManualForm] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [formData, setFormData] = useState({
    personEmail: '',
    month: '',
    activityId: '',
    amountValue: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleInlineEdit = (attestation) => {
    setEditingRow(attestation.id || `${attestation.person_identifier}_${attestation.month}_${attestation.activity_id}`);
    setEditValue(attestation.amount_value);
  };

  const handleInlineSave = async (attestation) => {
    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/projects/${projectToken}/attestations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personIdentifier: attestation.person_identifier,
          personEmail: attestation.person_email,
          month: attestation.month,
          activityId: attestation.activity_id,
          amountType: 'percent',
          amountValue: parseFloat(editValue),
          createdBy: 'manual_override'
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save');
      }

      setEditingRow(null);
      setEditValue('');
      onUpdate();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/projects/${projectToken}/attestations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personIdentifier: formData.personEmail,
          personEmail: formData.personEmail,
          month: formData.month.includes('-01') ? formData.month : formData.month + '-01',
          activityId: formData.activityId || null,
          amountType: 'percent',
          amountValue: parseFloat(formData.amountValue),
          createdBy: 'manual'
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save');
      }

      setFormData({ personEmail: '', month: '', activityId: '', amountValue: '' });
      setShowManualForm(false);
      setEditingRow(null);
      onUpdate();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (attestationId) => {
    if (!confirm('Delete this manual attestation?')) return;

    try {
      const response = await fetch(`/api/projects/${projectToken}/attestations?id=${attestationId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete');
      }

      onUpdate();
    } catch (err) {
      alert(err.message);
    }
  };

  const getConfidenceLabel = (confidence) => {
    if (!confidence) return '';
    if (confidence >= 0.8) return 'High confidence';
    if (confidence >= 0.5) return 'Medium confidence';
    return 'Low confidence - review?';
  };

  const getConfidenceColor = (confidence) => {
    if (!confidence) return '#666';
    if (confidence >= 0.8) return '#059669';
    if (confidence >= 0.5) return '#d97706';
    return '#dc2626';
  };

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a' }}>A) Cost Allocations</div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            Auto-calculated from evidence. Shows how each person's time is split across activities.
          </div>
        </div>
      </div>

      {/* Table */}
      {(!attestations || attestations.length === 0) ? (
        <div style={{
          padding: 24,
          textAlign: 'center',
          border: '1px solid #e5e5e5',
          borderRadius: 4,
          color: '#999',
          fontSize: 13,
          backgroundColor: 'white'
        }}>
          No evidence with linked activities yet. Add evidence and link it to activities to auto-generate attestations.
        </div>
      ) : (
        <>
          <div style={{ backgroundColor: 'white', border: '1px solid #e5e5e5', borderRadius: 4, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: '#fafafa', borderBottom: '1px solid #e5e5e5' }}>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#333' }}>Person</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#333' }}>Month</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#333' }}>Activity</th>
                  <th style={{ padding: 12, textAlign: 'right', fontWeight: 600, color: '#333' }}>Allocation</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#333' }}>Confidence</th>
                  <th style={{ padding: 12, textAlign: 'center', fontWeight: 600, color: '#333' }}>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {attestations.map((att, idx) => {
                  const rowKey = att.id || `${att.person_identifier}_${att.month}_${att.activity_id}`;
                  const isEditing = editingRow === rowKey;

                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: 12, color: '#1a1a1a' }}>{att.person_email || att.person_identifier}</td>
                      <td style={{ padding: 12, color: '#1a1a1a' }}>
                        {new Date(att.month).toLocaleDateString('en-AU', { year: 'numeric', month: 'short' })}
                      </td>
                      <td style={{ padding: 12, color: '#1a1a1a' }}>{att.activity?.name || 'Unallocated'}</td>
                      <td style={{ padding: 12, textAlign: 'right' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              autoFocus
                              style={{
                                width: 60,
                                padding: '4px 6px',
                                fontSize: 13,
                                border: '1px solid #007acc',
                                borderRadius: 3,
                                textAlign: 'right',
                                color: '#1a1a1a'
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleInlineSave(att);
                                } else if (e.key === 'Escape') {
                                  setEditingRow(null);
                                  setEditValue('');
                                }
                              }}
                            />
                            <button
                              onClick={() => handleInlineSave(att)}
                              disabled={saving}
                              style={{
                                padding: '2px 6px',
                                fontSize: 11,
                                color: 'white',
                                backgroundColor: saving ? '#ccc' : '#16a34a',
                                border: 'none',
                                borderRadius: 3,
                                cursor: saving ? 'not-allowed' : 'pointer'
                              }}
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => {
                                setEditingRow(null);
                                setEditValue('');
                              }}
                              style={{
                                padding: '2px 6px',
                                fontSize: 11,
                                color: '#666',
                                backgroundColor: 'white',
                                border: '1px solid #ddd',
                                borderRadius: 3,
                                cursor: 'pointer'
                              }}
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                            <span style={{ color: '#1a1a1a', fontWeight: 500 }}>{att.amount_value}%</span>
                            <button
                              onClick={() => handleInlineEdit(att)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: 13,
                                color: '#999',
                                padding: '2px 4px',
                                opacity: 0.6
                              }}
                              onMouseEnter={(e) => e.target.style.opacity = 1}
                              onMouseLeave={(e) => e.target.style.opacity = 0.6}
                              title="Edit allocation"
                            >
                              ✏️
                            </button>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: 12 }}>
                        {att.created_by === 'manual' || att.created_by === 'manual_override' ? (
                          <span style={{ fontSize: 12, color: '#666' }}>Manual override</span>
                        ) : att.created_by === 'auto_gap_fill' ? (
                          <span style={{ fontSize: 12, color: '#dc2626' }}>No evidence found</span>
                        ) : (
                          <span style={{
                            fontSize: 12,
                            color: getConfidenceColor(att.confidence_score),
                            fontWeight: att.confidence_score < 0.5 ? 500 : 400
                          }}>
                            {getConfidenceLabel(att.confidence_score)}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: 12, textAlign: 'center', fontSize: 12, color: '#666' }}>
                        {att.evidence_count > 0 ? `${att.evidence_count} item${att.evidence_count !== 1 ? 's' : ''}` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Subtle manual entry link */}
          {!showManualForm && (
            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <button
                onClick={() => setShowManualForm(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#007acc',
                  fontSize: 12,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: '4px 0'
                }}
              >
                + Add manual entry (for edge cases)
              </button>
            </div>
          )}

          {/* Manual entry form (compact) */}
          {showManualForm && (
            <form onSubmit={handleSave} style={{
              marginTop: 12,
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 4,
              padding: 12
            }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, color: '#333' }}>
                Manual Attestation Entry
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 8 }}>
                <input
                  type="email"
                  required
                  value={formData.personEmail}
                  onChange={e => setFormData({ ...formData, personEmail: e.target.value })}
                  placeholder="person@company.com"
                  style={{
                    padding: '6px 8px',
                    fontSize: 12,
                    border: '1px solid #ddd',
                    borderRadius: 3,
                    outline: 'none'
                  }}
                />
                <input
                  type="month"
                  required
                  value={formData.month}
                  onChange={e => setFormData({ ...formData, month: e.target.value })}
                  style={{
                    padding: '6px 8px',
                    fontSize: 12,
                    border: '1px solid #ddd',
                    borderRadius: 3,
                    outline: 'none'
                  }}
                />
                <select
                  required
                  value={formData.activityId}
                  onChange={e => setFormData({ ...formData, activityId: e.target.value })}
                  style={{
                    padding: '6px 8px',
                    fontSize: 12,
                    border: '1px solid #ddd',
                    borderRadius: 3,
                    outline: 'none'
                  }}
                >
                  <option value="">Activity...</option>
                  {activities.map(act => (
                    <option key={act.id} value={act.id}>{act.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  step="1"
                  value={formData.amountValue}
                  onChange={e => setFormData({ ...formData, amountValue: e.target.value })}
                  placeholder="% (0-100)"
                  style={{
                    padding: '6px 8px',
                    fontSize: 12,
                    border: '1px solid #ddd',
                    borderRadius: 3,
                    outline: 'none'
                  }}
                />
              </div>
              {error && (
                <div style={{
                  padding: 6,
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 3,
                  fontSize: 11,
                  color: '#dc2626',
                  marginBottom: 8
                }}>
                  {error}
                </div>
              )}
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowManualForm(false)}
                  style={{
                    padding: '5px 12px',
                    fontSize: 12,
                    color: '#666',
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    borderRadius: 3,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '5px 12px',
                    fontSize: 12,
                    color: 'white',
                    backgroundColor: saving ? '#ccc' : '#007acc',
                    border: 'none',
                    borderRadius: 3,
                    cursor: saving ? 'not-allowed' : 'pointer'
                  }}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
