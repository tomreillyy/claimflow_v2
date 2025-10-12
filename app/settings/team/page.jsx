'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Header } from '@/components/Header';

export default function TeamPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAutoPopulate, setShowAutoPopulate] = useState(false);
  const [formData, setFormData] = useState({ email: '', full_name: '' });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
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

      const endpoint = editingId ? '/api/team' : '/api/team';
      const method = editingId ? 'PATCH' : 'POST';
      const body = editingId
        ? { id: editingId, ...formData }
        : formData;

      const response = await fetch(endpoint, {
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

      setFormData({ email: '', full_name: '' });
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
    setFormData({ email: member.email, full_name: member.full_name });
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

  if (authLoading || loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'white',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
    }}>
      <Header />

      <main style={{
        maxWidth: 800,
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
            Manage your team roster for evidence attribution.
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
                  backgroundColor: saving ? '#ccc' : '#007acc',
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
                setFormData({ email: '', full_name: '' });
                setError('');
              }}
              style={{
                padding: '8px 16px',
                fontSize: 14,
                fontWeight: 500,
                color: 'white',
                backgroundColor: '#007acc',
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
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#333', marginBottom: 4 }}>
                  Full name
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Alice Chen"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: 14,
                    border: '1px solid #ddd',
                    borderRadius: 4,
                    outline: 'none',
                    boxSizing: 'border-box',
                    color: '#1a1a1a'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#333', marginBottom: 4 }}>
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="alice@company.com"
                  disabled={editingId} // Can't change email when editing
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: 14,
                    border: '1px solid #ddd',
                    borderRadius: 4,
                    outline: 'none',
                    boxSizing: 'border-box',
                    backgroundColor: editingId ? '#f5f5f5' : 'white',
                    cursor: editingId ? 'not-allowed' : 'text',
                    color: '#1a1a1a'
                  }}
                />
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
                  backgroundColor: saving ? '#ccc' : '#007acc',
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
                  setFormData({ email: '', full_name: '' });
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
                  <th style={{ padding: 12, textAlign: 'center', fontWeight: 600, color: '#333', width: 50 }}></th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: 12, color: '#1a1a1a' }}>{member.full_name}</td>
                    <td style={{ padding: 12, color: '#666' }}>{member.email}</td>
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
                              minWidth: 100,
                              zIndex: 20
                            }}>
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
    </div>
  );
}
