'use client';
import { useState, useEffect } from 'react';
import PayrollDropzone from './PayrollDropzone';
import PayrollMapper from './PayrollMapper';
import CostInterviewPanel from './CostInterviewPanel';
import NonLabourCostsSection from './NonLabourCostsSection';
import TaxBenefitSummary from './TaxBenefitSummary';

export default function SimplifiedCostsPage({ projectToken, activities, onUpdate }) {
  const [peopleData, setPeopleData] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [nonLabourCosts, setNonLabourCosts] = useState([]);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMapper, setShowMapper] = useState(false);
  const [uploadData, setUploadData] = useState(null);
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showInterview, setShowInterview] = useState(false);
  const [manualForm, setManualForm] = useState({
    name: '',
    email: '',
    month: '',
    amount: ''
  });

  useEffect(() => {
    fetchData();
  }, [projectToken]);

  const fetchData = async () => {
    try {
      const [costsRes, nlRes] = await Promise.all([
        fetch(`/api/projects/${projectToken}/costs`),
        fetch(`/api/projects/${projectToken}/costs/non-labour`),
      ]);

      if (costsRes.ok) {
        const data = await costsRes.json();
        // Aggregate by person
        const peopleMap = new Map();
        for (const entry of data.ledger || []) {
          const key = entry.person_identifier;
          if (!peopleMap.has(key)) {
            peopleMap.set(key, {
              person: entry.person_name || entry.person_email || entry.person_identifier,
              personIdentifier: entry.person_identifier,
              personEmail: entry.person_email,
              totalCost: 0,
              rdPercent: entry.apportionment_percent || null,
            });
          }
          peopleMap.get(key).totalCost += parseFloat(entry.total_amount || 0);
        }
        setPeopleData(Array.from(peopleMap.values()));

        // Aggregate allocations
        const allocMap = new Map();
        for (const att of data.attestations || []) {
          const key = `${att.person_identifier}|${att.activity_id}`;
          if (!allocMap.has(key)) {
            allocMap.set(key, {
              person_identifier: att.person_identifier,
              person_email: att.person_email,
              activity_id: att.activity_id,
              activity: att.activity,
              amount_value: 0,
              count: 0
            });
          }
          const agg = allocMap.get(key);
          agg.amount_value += parseFloat(att.amount_value || 0);
          agg.count += 1;
        }
        const aggregated = Array.from(allocMap.values()).map(a => ({
          ...a,
          amount_value: a.amount_value / a.count
        }));
        setAllocations(aggregated);
      }

      if (nlRes.ok) {
        const nlData = await nlRes.json();
        setNonLabourCosts(nlData.costs || []);
      }
    } catch (err) {
      console.error('Failed to fetch costs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (personId, activityId, field, currentValue) => {
    setEditingCell(`${personId}|${activityId}|${field}`);
    setEditValue(currentValue);
  };

  const handleSave = async (personId, personEmail, oldActivityId, field) => {
    setSaving(true);
    try {
      const allocation = allocations.find(
        a => a.person_identifier === personId && a.activity_id === oldActivityId
      );
      const newValue = field === 'percent' ? parseFloat(editValue) : parseFloat(allocation?.amount_value || 0);

      if (field === 'percent') {
        const otherAllocations = allocations
          .filter(a => a.person_identifier === personId && a.activity_id !== oldActivityId)
          .reduce((sum, a) => sum + parseFloat(a.amount_value || 0), 0);
        if (otherAllocations + newValue > 100) {
          alert(`Total allocation cannot exceed 100%. Current other allocations: ${otherAllocations.toFixed(0)}%`);
          setSaving(false);
          setEditingCell(null);
          return;
        }
      }

      const response = await fetch(`/api/projects/${projectToken}/attestations/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personIdentifier: personId,
          personEmail: personEmail,
          activityId: field === 'activity' ? editValue : oldActivityId,
          amountType: 'percent',
          amountValue: newValue,
          oldActivityId: field === 'activity' ? oldActivityId : null
        })
      });

      if (!response.ok) throw new Error('Failed to save');
      setEditingCell(null);
      setEditValue('');
      fetchData();
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddAllocation = async (personId, personEmail) => {
    if (!activities || activities.length === 0) {
      alert('No activities found. Create an activity first.');
      return;
    }
    try {
      const response = await fetch(`/api/projects/${projectToken}/attestations/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personIdentifier: personId,
          personEmail: personEmail,
          activityId: activities[0].id,
          amountType: 'percent',
          amountValue: 0
        })
      });
      if (!response.ok) throw new Error('Failed to add');
      fetchData();
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (personId, activityId) => {
    if (!confirm('Delete this allocation?')) return;
    try {
      const response = await fetch(`/api/projects/${projectToken}/attestations/bulk`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personIdentifier: personId, activityId })
      });
      if (!response.ok) throw new Error('Failed to delete');
      fetchData();
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err.message);
    }
  };

  // Calculate final costs
  const calculateFinalCosts = () => {
    const costs = new Map();
    for (const alloc of allocations) {
      const person = peopleData.find(p => p.personIdentifier === alloc.person_identifier);
      if (!person || !alloc.activity_id) continue;
      const activityName = alloc.activity?.name || 'Unknown';
      const allocatedCost = (person.totalCost * parseFloat(alloc.amount_value)) / 100;
      if (!costs.has(activityName)) costs.set(activityName, { total: 0, details: [] });
      const entry = costs.get(activityName);
      entry.total += allocatedCost;
      entry.details.push({ person: person.person, percent: alloc.amount_value, cost: allocatedCost });
    }
    return costs;
  };

  const finalCosts = calculateFinalCosts();
  const hasCosts = peopleData.length > 0 || nonLabourCosts.length > 0;

  // Calculate totals for summary
  const staffTotal = peopleData.reduce((sum, p) => sum + p.totalCost, 0);
  const contractorTotal = nonLabourCosts
    .filter(c => c.cost_category === 'contractor')
    .reduce((sum, c) => sum + parseFloat(c.rd_amount || c.amount * c.rd_percent / 100), 0);
  const cloudTotal = nonLabourCosts
    .filter(c => c.cost_category === 'cloud_software')
    .reduce((sum, c) => sum + parseFloat(c.rd_amount || c.amount * c.rd_percent / 100), 0);

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>Loading...</div>;
  }

  const handleUploadComplete = (data) => {
    setUploadData(data);
    setShowMapper(true);
  };

  const handleMapperComplete = () => {
    setShowMapper(false);
    setUploadData(null);
    setShowCsvUpload(false);
    fetchData();
    if (onUpdate) onUpdate();
  };

  const handleInterviewComplete = () => {
    setShowInterview(false);
    fetchData();
    if (onUpdate) onUpdate();
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectToken}/costs/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personName: manualForm.name,
          personEmail: manualForm.email,
          month: manualForm.month,
          totalAmount: parseFloat(manualForm.amount)
        })
      });
      if (!response.ok) throw new Error('Failed to add manual entry');
      setManualForm({ name: '', email: '', month: '', amount: '' });
      setShowManualEntry(false);
      fetchData();
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ---- EMPTY STATE: Show AI Interview ----
  if (!hasCosts && !showCsvUpload && !showManualEntry) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {showInterview ? (
          <CostInterviewPanel
            projectToken={projectToken}
            activities={activities}
            onComplete={handleInterviewComplete}
          />
        ) : (
          <div>
            <div style={{
              padding: 32,
              backgroundColor: 'white',
              border: '1px solid #e5e5e5',
              borderRadius: 8,
              textAlign: 'center',
              marginBottom: 24,
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>
                Set up your R&D costs
              </div>
              <p style={{ fontSize: 14, color: '#666', marginBottom: 24, maxWidth: 500, margin: '0 auto 24px' }}>
                Tell us about your team, salaries, contractors, and cloud spend. Our AI will calculate super, on-costs, and estimate your tax benefit automatically.
              </p>

              <button
                onClick={() => setShowInterview(true)}
                style={{
                  padding: '14px 32px',
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'white',
                  backgroundColor: '#021048',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  marginBottom: 16,
                }}
              >
                Start AI Cost Setup
              </button>

              <div style={{ fontSize: 13, color: '#999' }}>
                Takes about 5 minutes
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => setShowCsvUpload(true)}
                style={{ padding: '8px 16px', fontSize: 13, color: '#666', backgroundColor: 'transparent', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer' }}
              >
                Upload payroll CSV instead
              </button>
              <button
                onClick={() => setShowManualEntry(true)}
                style={{ padding: '8px 16px', fontSize: 13, color: '#666', backgroundColor: 'transparent', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer' }}
              >
                Add manually
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---- POPULATED STATE: Show full cost management ----
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>

      {showInterview && (
        <div style={{ marginBottom: 32 }}>
          <CostInterviewPanel
            projectToken={projectToken}
            activities={activities}
            onComplete={handleInterviewComplete}
          />
          <button
            onClick={() => setShowInterview(false)}
            style={{ marginTop: 12, padding: '6px 12px', fontSize: 12, color: '#666', backgroundColor: 'transparent', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer' }}
          >
            Close AI Setup
          </button>
        </div>
      )}

      {/* Section 1: Staff Costs */}
      <section style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
            Staff Costs
          </h2>
          <div style={{ display: 'flex', gap: 8 }}>
            {!showInterview && (
              <button
                onClick={() => setShowInterview(true)}
                style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#021048', backgroundColor: 'transparent', border: '1px solid #021048', borderRadius: 4, cursor: 'pointer' }}
              >
                Re-run AI Setup
              </button>
            )}
            <button
              onClick={() => setShowCsvUpload(!showCsvUpload)}
              style={{ padding: '6px 14px', fontSize: 12, color: '#666', backgroundColor: 'transparent', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer' }}
            >
              {showCsvUpload ? 'Hide Upload' : 'Upload CSV'}
            </button>
          </div>
        </div>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
          Salaries with superannuation and on-costs auto-calculated.
        </p>

        {showCsvUpload && (
          <div style={{ marginBottom: 16 }}>
            {!showMapper ? (
              <PayrollDropzone projectToken={projectToken} onUploadComplete={handleUploadComplete} />
            ) : (
              <PayrollMapper
                uploadData={uploadData}
                projectToken={projectToken}
                onComplete={handleMapperComplete}
                onCancel={() => { setShowMapper(false); setUploadData(null); }}
              />
            )}
          </div>
        )}

        {peopleData.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', backgroundColor: '#fafafa', border: '1px solid #e5e5e5', borderRadius: 4, color: '#999', fontSize: 13 }}>
            No staff costs yet. Use AI Setup above to get started.
          </div>
        ) : (
          <table style={{ width: '100%', backgroundColor: 'white', border: '1px solid #e5e5e5', borderRadius: 4, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#fafafa', borderBottom: '1px solid #e5e5e5' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#666' }}>Person</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#666' }}>Total Cost</th>
              </tr>
            </thead>
            <tbody>
              {peopleData.map((p, idx) => (
                <tr key={p.personIdentifier} style={{ borderBottom: idx < peopleData.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                  <td style={{ padding: '10px 16px', fontSize: 14, color: '#1a1a1a' }}>{p.person}</td>
                  <td style={{ padding: '10px 16px', fontSize: 14, color: '#1a1a1a', textAlign: 'right', fontFamily: 'monospace' }}>
                    ${p.totalCost.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid #1a1a1a', fontWeight: 600 }}>
                <td style={{ padding: '10px 16px', fontSize: 14 }}>Total</td>
                <td style={{ padding: '10px 16px', fontSize: 14, textAlign: 'right', fontFamily: 'monospace' }}>
                  ${staffTotal.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        )}

        <div style={{ marginTop: 12 }}>
          {!showManualEntry ? (
            <button onClick={() => setShowManualEntry(true)}
              style={{ padding: '6px 14px', fontSize: 12, color: '#3b82f6', backgroundColor: 'transparent', border: '1px solid #3b82f6', borderRadius: 4, cursor: 'pointer' }}>
              + Add Staff Manually
            </button>
          ) : (
            <form onSubmit={handleManualSubmit} style={{ backgroundColor: 'white', border: '1px solid #e5e5e5', borderRadius: 4, padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#1a1a1a' }}>Add Staff Member</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <input type="text" placeholder="Full Name" value={manualForm.name}
                  onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })} required style={inputStyle} />
                <input type="email" placeholder="Email" value={manualForm.email}
                  onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })} required style={inputStyle} />
                <input type="month" value={manualForm.month}
                  onChange={(e) => setManualForm({ ...manualForm, month: e.target.value })} required style={inputStyle} />
                <input type="number" step="0.01" min="0" placeholder="Total Cost (AUD)" value={manualForm.amount}
                  onChange={(e) => setManualForm({ ...manualForm, amount: e.target.value })} required style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={saving}
                  style={{ padding: '8px 16px', fontSize: 13, color: 'white', backgroundColor: '#3b82f6', border: 'none', borderRadius: 4, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Adding...' : 'Add'}
                </button>
                <button type="button"
                  onClick={() => { setShowManualEntry(false); setManualForm({ name: '', email: '', month: '', amount: '' }); }}
                  style={{ padding: '8px 16px', fontSize: 13, color: '#666', backgroundColor: 'transparent', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Section 2: Contractors & Cloud */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>
          Contractors & Cloud Costs
        </h2>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
          External R&D expenditure — contractors, cloud services, and software tools.
        </p>
        <NonLabourCostsSection
          projectToken={projectToken}
          activities={activities}
          onUpdate={() => { fetchData(); if (onUpdate) onUpdate(); }}
        />
      </section>

      {/* Section 3: Activity Allocations */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>
          Activity Allocations
        </h2>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
          How each person's time splits across R&D activities. Click to edit.
        </p>

        {peopleData.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', backgroundColor: '#fafafa', border: '1px solid #e5e5e5', borderRadius: 4, color: '#999', fontSize: 13 }}>
            Add staff costs first.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {peopleData.map(person => {
              const personAllocations = allocations.filter(a => a.person_identifier === person.personIdentifier);
              const totalPercent = personAllocations.reduce((sum, a) => sum + parseFloat(a.amount_value || 0), 0);
              const percentColor = totalPercent > 100 ? '#dc2626' : totalPercent < 100 ? '#ea580c' : '#16a34a';

              return (
                <div key={person.personIdentifier} style={{ backgroundColor: 'white', border: '1px solid #e5e5e5', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 16px', backgroundColor: '#fafafa', borderBottom: '1px solid #e5e5e5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{person.person}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: percentColor }}>{totalPercent.toFixed(0)}% allocated</span>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <th style={{ padding: '8px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#999', width: '50%' }}>Activity</th>
                        <th style={{ padding: '8px 16px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#999', width: '30%' }}>% of Time</th>
                        <th style={{ padding: '8px 16px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#999', width: '20%' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {personAllocations.map((alloc, idx) => {
                        const activityCellId = `${person.personIdentifier}|${alloc.activity_id}|activity`;
                        const percentCellId = `${person.personIdentifier}|${alloc.activity_id}|percent`;
                        const isEditingActivity = editingCell === activityCellId;
                        const isEditingPercent = editingCell === percentCellId;

                        return (
                          <tr key={alloc.activity_id} style={{ borderBottom: idx < personAllocations.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                            <td style={{ padding: '8px 16px', fontSize: 13, color: '#1a1a1a' }}>
                              {isEditingActivity ? (
                                <select value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => handleSave(person.personIdentifier, person.personEmail, alloc.activity_id, 'activity')}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSave(person.personIdentifier, person.personEmail, alloc.activity_id, 'activity');
                                    if (e.key === 'Escape') { setEditingCell(null); setEditValue(''); }
                                  }}
                                  autoFocus disabled={saving}
                                  style={{ width: '100%', padding: '4px 8px', fontSize: 13, border: '1px solid #3b82f6', borderRadius: 4, outline: 'none', backgroundColor: 'white', color: '#1a1a1a' }}>
                                  {activities.map(act => <option key={act.id} value={act.id}>{act.name}</option>)}
                                </select>
                              ) : (
                                <span onClick={() => handleEdit(person.personIdentifier, alloc.activity_id, 'activity', alloc.activity_id)}
                                  style={{ cursor: 'pointer', display: 'block' }} title="Click to edit">
                                  {alloc.activity?.name || 'Unknown'}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '8px 16px', fontSize: 13, color: '#1a1a1a', textAlign: 'right' }}>
                              {isEditingPercent ? (
                                <input type="number" min="0" max="100" step="1" value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => handleSave(person.personIdentifier, person.personEmail, alloc.activity_id, 'percent')}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSave(person.personIdentifier, person.personEmail, alloc.activity_id, 'percent');
                                    if (e.key === 'Escape') { setEditingCell(null); setEditValue(''); }
                                  }}
                                  autoFocus disabled={saving}
                                  style={{ width: 70, padding: '4px 8px', fontSize: 13, border: '1px solid #3b82f6', borderRadius: 4, textAlign: 'right', outline: 'none', fontFamily: 'monospace' }} />
                              ) : (
                                <span onClick={() => handleEdit(person.personIdentifier, alloc.activity_id, 'percent', alloc.amount_value)}
                                  style={{ cursor: 'pointer', display: 'block', fontFamily: 'monospace' }} title="Click to edit">
                                  {parseFloat(alloc.amount_value).toFixed(0)}%
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '8px 16px', textAlign: 'right' }}>
                              <button onClick={() => handleDelete(person.personIdentifier, alloc.activity_id)}
                                style={{ padding: '3px 8px', fontSize: 11, color: '#dc2626', backgroundColor: 'transparent', border: '1px solid #fca5a5', borderRadius: 4, cursor: 'pointer' }}>
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div style={{ padding: '8px 16px', borderTop: '1px solid #f0f0f0' }}>
                    <button onClick={() => handleAddAllocation(person.personIdentifier, person.personEmail)}
                      style={{ padding: '4px 12px', fontSize: 12, color: '#3b82f6', backgroundColor: 'transparent', border: '1px solid #3b82f6', borderRadius: 4, cursor: 'pointer' }}>
                      + Add Activity
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Section 4: Cost Summary & Tax Benefit */}
      <section>
        <TaxBenefitSummary
          staffTotal={staffTotal}
          contractorTotal={contractorTotal}
          cloudTotal={cloudTotal}
        />
      </section>
    </div>
  );
}

const inputStyle = {
  padding: '8px 12px',
  fontSize: 13,
  border: '1px solid #d1d5db',
  borderRadius: 4,
  color: '#1a1a1a',
};
