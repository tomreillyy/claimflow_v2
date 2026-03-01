'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { Spinner } from '@/components/Spinner';
import { UserPlus, X, Check, Users } from 'lucide-react';

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

export function ConsultantTeamManager() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [formData, setFormData] = useState({ email: '', name: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Assignment editing
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [selectedClientIds, setSelectedClientIds] = useState(new Set());
  const [savingAssignments, setSavingAssignments] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const fetchData = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const [teamRes, clientsRes] = await Promise.all([
        fetch('/api/consultant/team', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('/api/consultant/clients', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      if (teamRes.ok) {
        const data = await teamRes.json();
        setMembers(data.members || []);
      }

      if (clientsRes.ok) {
        const data = await clientsRes.json();
        setClients(data.clients || []);
      }
    } catch (err) {
      console.error('Failed to fetch team data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const token = await getToken();
      const response = await fetch('/api/consultant/team', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to invite team member');
      }

      setFormData({ email: '', name: '' });
      setShowInviteForm(false);
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (memberId, memberName) => {
    if (!confirm(`Remove ${memberName || 'this team member'}? They will lose access to all assigned clients.`)) {
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch(`/api/consultant/team/${memberId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        setMembers(prev => prev.filter(m => m.id !== memberId));
      }
    } catch (err) {
      console.error('Failed to remove team member:', err);
    }
  };

  const startEditAssignments = (member) => {
    setEditingMemberId(member.id);
    setSelectedClientIds(new Set(member.assignments.map(a => a.client_id)));
  };

  const cancelEditAssignments = () => {
    setEditingMemberId(null);
    setSelectedClientIds(new Set());
  };

  const toggleClientId = (clientId) => {
    setSelectedClientIds(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  };

  const saveAssignments = async (memberId) => {
    setSavingAssignments(true);
    try {
      const token = await getToken();
      const response = await fetch(`/api/consultant/team/${memberId}/assignments`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ client_ids: [...selectedClientIds] }),
      });

      if (response.ok) {
        // Refresh data to get updated assignments
        await fetchData();
        setEditingMemberId(null);
        setSelectedClientIds(new Set());
      }
    } catch (err) {
      console.error('Failed to save assignments:', err);
    } finally {
      setSavingAssignments(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spinner />
      </div>
    );
  }

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
      }}>
        <h2 style={{ fontSize: 32, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
          Team
        </h2>
        {!showInviteForm && (
          <button
            onClick={() => {
              setShowInviteForm(true);
              setFormData({ email: '', name: '' });
              setError('');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
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
            <UserPlus size={16} />
            Invite member
          </button>
        )}
      </div>

      {/* Invite Form */}
      {showInviteForm && (
        <form onSubmit={handleInvite} style={{
          background: 'linear-gradient(145deg, #ffffff 0%, #fafbfc 100%)',
          border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: 16,
          padding: 20,
          marginBottom: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: '#0f172a' }}>
            Invite Team Member
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#64748b', marginBottom: 4 }}>
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Jane Smith"
                style={{
                  width: '100%', padding: '8px 12px', fontSize: 14,
                  border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none',
                  boxSizing: 'border-box', color: '#1a1a1a',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#64748b', marginBottom: 4 }}>
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="jane@company.com"
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
              {saving ? 'Inviting...' : 'Invite'}
            </button>
            <button type="button" onClick={() => { setShowInviteForm(false); setError(''); }} style={{
              padding: '8px 16px', fontSize: 14, color: '#64748b',
              backgroundColor: 'white', border: '1px solid #e2e8f0',
              borderRadius: 8, cursor: 'pointer',
            }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Team Members */}
      {members.length === 0 ? (
        <div style={{
          padding: 40,
          textAlign: 'center',
          background: 'linear-gradient(145deg, #ffffff 0%, #fafbfc 100%)',
          borderRadius: 16,
          border: '1px solid rgba(0,0,0,0.06)',
        }}>
          <Users size={32} color="#94a3b8" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 500, color: '#64748b', marginBottom: 4 }}>
            No team members yet
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>
            Invite a colleague to help with your clients.
          </div>
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
              Team Members
            </h3>
          </div>

          {members.map((member, index) => (
            <div key={member.id}>
              <div style={{
                padding: '16px 24px',
                borderBottom: (index < members.length - 1 && editingMemberId !== member.id) ? '1px solid rgba(0,0,0,0.04)' : 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>
                        {member.member_name || member.member_email}
                      </span>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 10,
                        fontSize: 12, fontWeight: 500,
                        backgroundColor: member.member_user_id ? '#ecfdf5' : '#fefce8',
                        color: member.member_user_id ? '#059669' : '#ca8a04',
                      }}>
                        {member.member_user_id ? 'Active' : 'Pending signup'}
                      </span>
                    </div>
                    {member.member_name && (
                      <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>
                        {member.member_email}
                      </div>
                    )}
                    <div style={{ fontSize: 13, color: '#64748b', marginBottom: 6 }}>
                      {member.assignments.length === 0
                        ? 'No clients assigned'
                        : `Assigned: ${member.assignments.map(a => a.client_name || a.client_email).join(', ')}`
                      }
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                      Joined {formatDate(member.created_at)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => startEditAssignments(member)}
                      style={{
                        padding: '6px 12px', fontSize: 13, fontWeight: 500,
                        color: '#021048', backgroundColor: 'transparent',
                        border: '1px solid #021048', borderRadius: 6,
                        cursor: 'pointer',
                      }}
                    >
                      Manage
                    </button>
                    <button
                      onClick={() => handleRemove(member.id, member.member_name || member.member_email)}
                      style={{
                        padding: '6px 12px', fontSize: 13, fontWeight: 500,
                        color: '#dc2626', backgroundColor: 'transparent',
                        border: '1px solid #fecaca', borderRadius: 6,
                        cursor: 'pointer',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>

              {/* Assignment Editor (inline) */}
              {editingMemberId === member.id && (
                <div style={{
                  padding: '16px 24px',
                  backgroundColor: 'rgba(2, 16, 72, 0.02)',
                  borderTop: '1px solid rgba(0,0,0,0.06)',
                  borderBottom: index < members.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
                    Assign clients for {member.member_name || member.member_email}
                  </div>

                  {clients.length === 0 ? (
                    <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>
                      No clients to assign. Add clients first from your dashboard.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                      {clients.map(client => {
                        const isChecked = selectedClientIds.has(client.id);
                        return (
                          <label
                            key={client.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: '8px 12px',
                              borderRadius: 8,
                              cursor: 'pointer',
                              backgroundColor: isChecked ? 'rgba(2, 16, 72, 0.04)' : 'transparent',
                              transition: 'background-color 0.15s',
                            }}
                          >
                            <div style={{
                              width: 18, height: 18, borderRadius: 4,
                              border: isChecked ? 'none' : '2px solid #d1d5db',
                              backgroundColor: isChecked ? '#021048' : 'white',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              {isChecked && <Check size={12} color="white" />}
                            </div>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleClientId(client.id)}
                              style={{ display: 'none' }}
                            />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 500, color: '#0f172a' }}>
                                {client.client_name || client.client_email}
                              </div>
                              {client.client_name && (
                                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                                  {client.client_email}
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => saveAssignments(member.id)}
                      disabled={savingAssignments}
                      style={{
                        padding: '8px 16px', fontSize: 14, fontWeight: 500, color: 'white',
                        backgroundColor: savingAssignments ? '#ccc' : '#021048', border: 'none',
                        borderRadius: 8, cursor: savingAssignments ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {savingAssignments ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={cancelEditAssignments}
                      style={{
                        padding: '8px 16px', fontSize: 14, color: '#64748b',
                        backgroundColor: 'white', border: '1px solid #e2e8f0',
                        borderRadius: 8, cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
