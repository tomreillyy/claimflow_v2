'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Header } from '@/components/Header';
import { Spinner } from '@/components/Spinner';

const emptyForm = { email: '', full_name: '', role: '', department: '' };

export default function TeamPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAutoPopulate, setShowAutoPopulate] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [invitingId, setInvitingId] = useState(null);
  const [error, setError] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    fetchMembers();
  }, [user]);

  const fetchMembers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/team', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);

        // Show auto-populate banner if no members
        if (!data.members || data.members.length === 0) {
          setShowAutoPopulate(true);
        }
      }
    } catch (err) {
      console.error('Failed to fetch team:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoPopulate = async () => {
    setSaving(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/team/auto-populate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to auto-populate');
      }

      setShowAutoPopulate(false);
      fetchMembers();
      alert(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const method = editingId ? 'PATCH' : 'POST';
      const body = editingId
        ? { id: editingId, ...formData }
        : formData;

      const response = await fetch('/api/team', {
        method,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save');
      }

      setFormData(emptyForm);
      setShowAddForm(false);
      setEditingId(null);
      fetchMembers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (member) => {
    setFormData({
      email: member.email,
      full_name: member.full_name,
      role: member.role || '',
      department: member.department || ''
    });
    setEditingId(member.id);
    setShowAddForm(true);
    setOpenMenuId(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this team member?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/team?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to delete');
      }

      fetchMembers();
      setOpenMenuId(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleInvite = async (member) => {
    setInvitingId(member.id);
    setOpenMenuId(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ teamMemberId: member.id })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invite');
      }

      alert('Invitation sent!');
      fetchMembers();
    } catch (err) {
      alert(err.message);
    } finally {
      setInvitingId(null);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    fontSize: 14,
    border: '1px solid #ddd',
    borderRadius: 4,
    outline: 'none',
    boxSizing: 'border-box',
    color: '#1a1a1a'
  };

  const labelStyle = { display: 'block', fontSize: 13, fontWeight: 500, color: '#333', marginBottom: 4 };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
    }}>
      <Header />

      {(authLoading || loading) ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <Spinner />
        </div>
      ) : (
      <main style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: '60px 24px'
      }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{
            fontSize: 24,
            fontWeight: 600,
            color: '#1a1a1a',
            margin: '0 0 8px 0'
          }}>Team</h1>
          <p style={{
            fontSize: 14,
            color: '#666',
            margin: 0
          }}>
            Manage your team roster. Invite members so they can sign in and enter timesheets.
          </p>
        </div>

        {/* Auto-populate banner */}
        {showAutoPopulate && !loading && (
          <div style={{
            padding: 16,
            backgroundColor: '#f0f9ff',
            border: '1px solid #bfdbfe',
            borderRadius: 4,
            marginBottom: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', marginBottom: 4 }}>
                Auto-populate from existing projects?
              </div>
              <div style={{ fontSize: 13, color: '#666' }}>
                We can import people from your payroll data and evidence.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowAutoPopulate(false)}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  color: '#666',
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                No thanks
              </button>
              <button
                onClick={handleAutoPopulate}
                disabled={saving}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'white',
                  backgroundColor: saving ? '#ccc' : '#021048',
                  border: 'none',
                  borderRadius: 4,
                  cursor: saving ? 'not-allowed' : 'pointer'
                }}
              >
                {saving ? 'Importing...' : 'Yes, import'}
              </button>
            </div>
          </div>
        )}

        {/* Add button */}
        {!showAddForm && (
          <div style={{ marginBottom: 20 }}>
            <button
              onClick={() => {
                setShowAddForm(true);
                setEditingId(null);
                setFormData(emptyForm);
                setError('');
              }}
              style={{
                padding: '8px 16px',
                fontSize: 14,
                fontWeight: 500,
                color: 'white',
                backgroundColor: '#021048',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              + Add person
            </button>
          </div>
        )}

        {/* Add/Edit form */}
        {showAddForm && (
          <form onSubmit={handleSubmit} style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 4,
            padding: 16,
            marginBottom: 24
          }}>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 12, color: '#1a1a1a' }}>
              {editingId ? 'Edit Team Member' : 'Add Team Member'}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Full name</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Alice Chen"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="alice@company.com"
                  disabled={editingId}
                  style={{
                    ...inputStyle,
                    backgroundColor: editingId ? '#f5f5f5' : 'white',
                    cursor: editingId ? 'not-allowed' : 'text'
                  }}
                />
              </div>
              <div>
                <label style={labelStyle}>Role</label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g. Developer, Project Manager"
                  list="role-suggestions"
                  style={inputStyle}
                />
                <datalist id="role-suggestions">
                  <option value="Developer" />
                  <option value="Senior Developer" />
                  <option value="Project Manager" />
                  <option value="Designer" />
                  <option value="QA Engineer" />
                  <option value="Data Scientist" />
                  <option value="Technical Lead" />
                  <option value="CTO" />
                </datalist>
              </div>
              <div>
                <label style={labelStyle}>Department</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={e => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g. Engineering, Product"
                  list="dept-suggestions"
                  style={inputStyle}
                />
                <datalist id="dept-suggestions">
                  <option value="Engineering" />
                  <option value="Product" />
                  <option value="Design" />
                  <option value="Data" />
                  <option value="Operations" />
                  <option value="Finance" />
                  <option value="Marketing" />
                </datalist>
              </div>
            </div>

            {error && (
              <div style={{
                padding: 8,
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 4,
                fontSize: 13,
                color: '#dc2626',
                marginBottom: 12
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '8px 16px',
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'white',
                  backgroundColor: saving ? '#ccc' : '#021048',
                  border: 'none',
                  borderRadius: 4,
                  cursor: saving ? 'not-allowed' : 'pointer'
                }}
              >
                {saving ? 'Saving...' : (editingId ? 'Update' : 'Add')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingId(null);
                  setFormData(emptyForm);
                  setError('');
                }}
                style={{
                  padding: '8px 16px',
                  fontSize: 14,
                  color: '#666',
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Team members table */}
        {members.length === 0 && !loading ? (
          <div style={{
            padding: 40,
            textAlign: 'center',
            border: '1px solid #e5e5e5',
            borderRadius: 4,
            color: '#999',
            fontSize: 14,
            backgroundColor: 'white'
          }}>
            No team members yet. Add your first person above.
          </div>
        ) : (
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e5e5e5',
            borderRadius: 4,
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ backgroundColor: '#fafafa', borderBottom: '1px solid #e5e5e5' }}>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#333' }}>Name</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#333' }}>Email</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#333' }}>Role</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#333' }}>Department</th>
                  <th style={{ padding: 12, textAlign: 'center', fontWeight: 600, color: '#333', width: 50 }}></th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: 12, color: '#1a1a1a' }}>{member.full_name}</td>
                    <td style={{ padding: 12, color: '#666' }}>
                      {member.email}
                      {member.invited_at && (
                        <span style={{
                          fontSize: 11,
                          color: '#059669',
                          marginLeft: 8,
                          backgroundColor: '#ecfdf5',
                          padding: '2px 6px',
                          borderRadius: 3
                        }}>Invited</span>
                      )}
                    </td>
                    <td style={{ padding: 12, color: '#666' }}>{member.role || '-'}</td>
                    <td style={{ padding: 12, color: '#666' }}>{member.department || '-'}</td>
                    <td style={{ padding: 12, textAlign: 'center' }}>
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 16,
                            color: '#666',
                            padding: '4px 8px'
                          }}
                        >
                          ⋮
                        </button>

                        {openMenuId === member.id && (
                          <>
                            <div
                              style={{
                                position: 'fixed',
                                inset: 0,
                                zIndex: 10
                              }}
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              right: 0,
                              marginTop: 4,
                              backgroundColor: 'white',
                              border: '1px solid #e5e5e5',
                              borderRadius: 4,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                              minWidth: 140,
                              zIndex: 20
                            }}>
                              <button
                                onClick={() => handleInvite(member)}
                                disabled={invitingId === member.id}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  border: 'none',
                                  background: 'none',
                                  textAlign: 'left',
                                  cursor: invitingId === member.id ? 'not-allowed' : 'pointer',
                                  fontSize: 13,
                                  color: '#021048'
                                }}
                                onMouseEnter={e => e.target.style.backgroundColor = '#f0f9ff'}
                                onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}
                              >
                                {invitingId === member.id
                                  ? 'Sending...'
                                  : member.invited_at ? 'Resend invite' : 'Send invite'}
                              </button>
                              <div style={{ height: 1, backgroundColor: '#e5e5e5', margin: '4px 0' }} />
                              <button
                                onClick={() => handleEdit(member)}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  border: 'none',
                                  background: 'none',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  fontSize: 13,
                                  color: '#333'
                                }}
                                onMouseEnter={e => e.target.style.backgroundColor = '#f5f5f5'}
                                onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}
                              >
                                Edit
                              </button>
                              <div style={{ height: 1, backgroundColor: '#e5e5e5', margin: '4px 0' }} />
                              <button
                                onClick={() => handleDelete(member.id)}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  border: 'none',
                                  background: 'none',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  fontSize: 13,
                                  color: '#dc2626'
                                }}
                                onMouseEnter={e => e.target.style.backgroundColor = '#fef2f2'}
                                onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}
                              >
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
      )}
    </div>
  );
}
