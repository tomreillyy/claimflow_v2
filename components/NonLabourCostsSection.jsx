'use client';
import { useState, useEffect } from 'react';

export default function NonLabourCostsSection({ projectToken, activities, onUpdate }) {
  const [costs, setCosts] = useState([]);
  const [activeTab, setActiveTab] = useState('contractor');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    vendorName: '',
    description: '',
    month: '',
    amount: '',
    rdPercent: '100',
    activityId: '',
  });

  useEffect(() => {
    fetchCosts();
  }, [projectToken]);

  const fetchCosts = async () => {
    try {
      const res = await fetch(`/api/projects/${projectToken}/costs/non-labour`);
      if (!res.ok) return;
      const data = await res.json();
      setCosts(data.costs || []);
    } catch (err) {
      console.error('Failed to fetch non-labour costs:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/projects/${projectToken}/costs/non-labour`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          costCategory: activeTab,
          description: form.description,
          vendorName: form.vendorName,
          month: form.month,
          amount: parseFloat(form.amount),
          rdPercent: parseFloat(form.rdPercent),
          activityId: form.activityId || null,
        }),
      });

      if (!res.ok) throw new Error('Failed to add');

      setForm({ vendorName: '', description: '', month: '', amount: '', rdPercent: '100', activityId: '' });
      setShowForm(false);
      fetchCosts();
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this cost entry?')) return;

    try {
      const res = await fetch(`/api/projects/${projectToken}/costs/non-labour`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) throw new Error('Failed to delete');
      fetchCosts();
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredCosts = costs.filter(c => c.cost_category === activeTab);

  const tabs = [
    { key: 'contractor', label: 'Contractors', icon: 'people' },
    { key: 'cloud_software', label: 'Cloud / Software', icon: 'cloud' },
  ];

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid #e5e5e5' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setShowForm(false); }}
            style={{
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: activeTab === tab.key ? 600 : 400,
              color: activeTab === tab.key ? '#021048' : '#666',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid #021048' : '2px solid transparent',
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            {tab.label} ({costs.filter(c => c.cost_category === tab.key).length})
          </button>
        ))}
      </div>

      {/* Cost table */}
      {filteredCosts.length === 0 && !showForm ? (
        <div style={{
          padding: 32,
          textAlign: 'center',
          backgroundColor: '#fafafa',
          border: '1px solid #e5e5e5',
          borderRadius: 4,
          color: '#999',
        }}>
          No {activeTab === 'contractor' ? 'contractor' : 'cloud/software'} costs yet.
        </div>
      ) : (
        <table style={{
          width: '100%',
          backgroundColor: 'white',
          border: '1px solid #e5e5e5',
          borderRadius: 4,
          borderCollapse: 'collapse',
        }}>
          <thead>
            <tr style={{ backgroundColor: '#fafafa', borderBottom: '1px solid #e5e5e5' }}>
              <th style={thStyle}>{activeTab === 'contractor' ? 'Vendor' : 'Service'}</th>
              <th style={thStyle}>Description</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>R&D %</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>R&D Amount</th>
              <th style={{ ...thStyle, width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredCosts.map((cost, idx) => (
              <tr key={cost.id} style={{
                borderBottom: idx < filteredCosts.length - 1 ? '1px solid #f0f0f0' : 'none',
              }}>
                <td style={tdStyle}>{cost.vendor_name || '—'}</td>
                <td style={{ ...tdStyle, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {cost.description}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>
                  ${parseFloat(cost.amount).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  {cost.rd_percent}%
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                  ${parseFloat(cost.rd_amount || cost.amount * cost.rd_percent / 100).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                </td>
                <td style={tdStyle}>
                  <button
                    onClick={() => handleDelete(cost.id)}
                    style={{
                      padding: '3px 8px',
                      fontSize: 11,
                      color: '#dc2626',
                      backgroundColor: 'transparent',
                      border: '1px solid #fca5a5',
                      borderRadius: 4,
                      cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {/* Total row */}
            {filteredCosts.length > 0 && (
              <tr style={{ borderTop: '2px solid #1a1a1a', fontWeight: 600 }}>
                <td colSpan={4} style={{ ...tdStyle, fontWeight: 600 }}>Total</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#16a34a' }}>
                  ${filteredCosts.reduce((sum, c) => sum + parseFloat(c.rd_amount || c.amount * c.rd_percent / 100), 0)
                    .toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                </td>
                <td style={tdStyle}></td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {/* Add form */}
      <div style={{ marginTop: 16 }}>
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              color: '#3b82f6',
              backgroundColor: 'transparent',
              border: '1px solid #3b82f6',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            + Add {activeTab === 'contractor' ? 'Contractor' : 'Cloud / Software'}
          </button>
        ) : (
          <form onSubmit={handleSubmit} style={{
            backgroundColor: 'white',
            border: '1px solid #e5e5e5',
            borderRadius: 4,
            padding: 16,
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#1a1a1a' }}>
              Add {activeTab === 'contractor' ? 'Contractor' : 'Cloud / Software Cost'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <input
                type="text"
                placeholder={activeTab === 'contractor' ? 'Vendor / Company Name' : 'Service Name (e.g. AWS)'}
                value={form.vendorName}
                onChange={(e) => setForm({ ...form, vendorName: e.target.value })}
                required
                style={inputStyle}
              />
              <input
                type="text"
                placeholder={activeTab === 'contractor' ? 'Description of R&D work' : 'What it\'s used for'}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
                style={inputStyle}
              />
              <input
                type="month"
                value={form.month}
                onChange={(e) => setForm({ ...form, month: e.target.value })}
                required
                style={inputStyle}
              />
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder={activeTab === 'contractor' ? 'Total Amount (AUD)' : 'Monthly Amount (AUD)'}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
                style={inputStyle}
              />
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                placeholder="R&D % (default 100)"
                value={form.rdPercent}
                onChange={(e) => setForm({ ...form, rdPercent: e.target.value })}
                style={inputStyle}
              />
              {activities && activities.length > 0 && (
                <select
                  value={form.activityId}
                  onChange={(e) => setForm({ ...form, activityId: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">Link to activity (optional)</option>
                  {activities.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  color: 'white',
                  backgroundColor: '#3b82f6',
                  border: 'none',
                  borderRadius: 4,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Adding...' : 'Add'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm({ vendorName: '', description: '', month: '', amount: '', rdPercent: '100', activityId: '' }); }}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  color: '#666',
                  backgroundColor: 'transparent',
                  border: '1px solid #d1d5db',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const thStyle = {
  padding: '10px 12px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 600,
  color: '#666',
};

const tdStyle = {
  padding: '10px 12px',
  fontSize: 13,
  color: '#1a1a1a',
};

const inputStyle = {
  padding: '8px 12px',
  fontSize: 13,
  border: '1px solid #d1d5db',
  borderRadius: 4,
  color: '#1a1a1a',
};
