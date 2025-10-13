'use client';
import { useState } from 'react';

export default function CoreActivitiesList({ activities, onUpdate, onCreate }) {
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editUncertainty, setEditUncertainty] = useState('');
  const [updating, setUpdating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUncertainty, setNewUncertainty] = useState('');
  const [creating, setCreating] = useState(false);

  function startEdit(activity) {
    setEditingId(activity.id);
    setEditName(activity.name);
    setEditUncertainty(activity.uncertainty);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName('');
    setEditUncertainty('');
  }

  async function saveEdit(id) {
    setUpdating(true);
    await onUpdate(id, editName, editUncertainty);
    setUpdating(false);
    setEditingId(null);
  }

  async function handleCreate() {
    if (!newName.trim() || !newUncertainty.trim()) return;
    setCreating(true);
    await onCreate(newName, newUncertainty);
    setCreating(false);
    setIsCreating(false);
    setNewName('');
    setNewUncertainty('');
  }

  return (
    <div>
      {(!activities || activities.length === 0) && !isCreating && (
        <div style={{
          fontSize: 12,
          color: '#999',
          marginBottom: 12,
          lineHeight: 1.5
        }}>
          AI will auto-generate activities from your evidence. You can also add them manually.
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {activities.map(activity => {
          if (editingId === activity.id) {
            return (
              <div key={activity.id} style={{
                padding: '8px 12px',
                backgroundColor: '#f9fafb',
                borderRadius: 6,
                border: '1px solid #e5e7eb'
              }}>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Short label (e.g., 'Queue-based API')"
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    fontSize: 13,
                    border: '1px solid #ddd',
                    borderRadius: 4,
                    outline: 'none',
                    marginBottom: 6,
                    boxSizing: 'border-box',
                    color: '#1a1a1a',
                    backgroundColor: 'white'
                  }}
                  onFocus={e => e.target.style.borderColor = '#021048'}
                  onBlur={e => e.target.style.borderColor = '#ddd'}
                />
                <textarea
                  value={editUncertainty}
                  onChange={e => setEditUncertainty(e.target.value)}
                  placeholder="1–2 sentences: the specific technical unknown this activity tests."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    fontSize: 13,
                    border: '1px solid #ddd',
                    borderRadius: 4,
                    outline: 'none',
                    resize: 'vertical',
                    marginBottom: 6,
                    boxSizing: 'border-box',
                    color: '#1a1a1a',
                    backgroundColor: 'white'
                  }}
                  onFocus={e => e.target.style.borderColor = '#021048'}
                  onBlur={e => e.target.style.borderColor = '#ddd'}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => saveEdit(activity.id)}
                    disabled={updating || !editName.trim() || !editUncertainty.trim()}
                    style={{
                      padding: '4px 10px',
                      backgroundColor: (updating || !editName.trim() || !editUncertainty.trim()) ? '#ccc' : '#021048',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: (updating || !editName.trim() || !editUncertainty.trim()) ? 'default' : 'pointer'
                    }}
                  >
                    {updating ? 'Updating...' : 'Update'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    disabled={updating}
                    style={{
                      padding: '4px 10px',
                      backgroundColor: 'white',
                      color: '#666',
                      border: '1px solid #ddd',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: updating ? 'default' : 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
                <style jsx>{`
                  input::placeholder, textarea::placeholder {
                    color: #666 !important;
                    opacity: 1;
                  }
                `}</style>
              </div>
            );
          }

          return (
            <div key={activity.id} style={{
              paddingBottom: 12,
              marginBottom: 12,
              borderBottom: '1px solid #f0f0f0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <strong style={{ fontSize: 13, color: '#1a1a1a', lineHeight: 1.4 }}>{activity.name}</strong>
                <button
                  onClick={() => startEdit(activity)}
                  style={{
                    color: '#021048',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: 11,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    flexShrink: 0,
                    marginLeft: 8
                  }}
                >
                  Edit
                </button>
              </div>
              <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>
                {activity.uncertainty}
              </div>
            </div>
          );
        })}

        {/* Manual creation form */}
        {isCreating && (
          <div style={{
            padding: '10px',
            backgroundColor: '#f9fafb',
            borderRadius: 4,
            border: '1px solid #e5e7eb',
            marginBottom: 8
          }}>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Activity name"
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: 12,
                border: '1px solid #ddd',
                borderRadius: 3,
                outline: 'none',
                marginBottom: 6,
                boxSizing: 'border-box',
                color: '#1a1a1a',
                backgroundColor: 'white'
              }}
              onFocus={e => e.target.style.borderColor = '#021048'}
              onBlur={e => e.target.style.borderColor = '#ddd'}
            />
            <textarea
              value={newUncertainty}
              onChange={e => setNewUncertainty(e.target.value)}
              placeholder="What uncertainty does this explore?"
              rows={3}
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: 12,
                border: '1px solid #ddd',
                borderRadius: 3,
                outline: 'none',
                resize: 'vertical',
                marginBottom: 6,
                boxSizing: 'border-box',
                color: '#1a1a1a',
                backgroundColor: 'white'
              }}
              onFocus={e => e.target.style.borderColor = '#021048'}
              onBlur={e => e.target.style.borderColor = '#ddd'}
            />
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim() || !newUncertainty.trim()}
                style={{
                  flex: 1,
                  padding: '5px 8px',
                  backgroundColor: (creating || !newName.trim() || !newUncertainty.trim()) ? '#ccc' : '#021048',
                  color: 'white',
                  border: 'none',
                  borderRadius: 3,
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: (creating || !newName.trim() || !newUncertainty.trim()) ? 'default' : 'pointer'
                }}
              >
                {creating ? 'Adding...' : 'Add'}
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewName('');
                  setNewUncertainty('');
                }}
                disabled={creating}
                style={{
                  flex: 1,
                  padding: '5px 8px',
                  backgroundColor: 'white',
                  color: '#666',
                  border: '1px solid #ddd',
                  borderRadius: 3,
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: creating ? 'default' : 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
            <style jsx>{`
              input::placeholder, textarea::placeholder {
                color: #666 !important;
                opacity: 1;
              }
            `}</style>
          </div>
        )}

        {/* Add button */}
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            style={{
              width: '100%',
              padding: '6px',
              backgroundColor: 'white',
              color: '#021048',
              border: '1px solid #e5e5e5',
              borderRadius: 3,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              marginTop: 8
            }}
          >
            + Add activity
          </button>
        )}
      </div>
    </div>
  );
}
