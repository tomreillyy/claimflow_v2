'use client';
import { useState } from 'react';
import { calculateFullStaffCost, getStates, getSGCRate } from '@/lib/onCostCalculator';
import { calculateTaxBenefit } from '@/lib/taxBenefitCalculator';

const STEPS = [
  { key: 'company', label: 'Company Info' },
  { key: 'staff', label: 'Staff Costs' },
  { key: 'external', label: 'External Costs' },
  { key: 'review', label: 'Review & Save' },
];

const states = getStates();

export default function CostSetupWizard({ projectToken, activities, fyYear, turnoverBand, onComplete }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Form data
  const [state, setState] = useState('');
  const [staffCosts, setStaffCosts] = useState([{ name: '', role: '', annualSalary: '', rdPercent: '100' }]);
  const [contractors, setContractors] = useState([]);
  const [cloudCosts, setCloudCosts] = useState([]);

  const year = fyYear || '2025';

  // --- Helpers ---
  const fmt = (n) => (n || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getStaffCalc = (salary) => {
    if (!salary || salary <= 0) return null;
    return calculateFullStaffCost(salary, year, { state: state || undefined });
  };

  const canGoNext = () => {
    if (step === 0) return !!state;
    if (step === 1) return staffCosts.some(s => s.name && s.annualSalary);
    return true;
  };

  // --- Staff handlers ---
  const updateStaff = (idx, field, value) => {
    const updated = [...staffCosts];
    updated[idx] = { ...updated[idx], [field]: value };
    setStaffCosts(updated);
  };

  const addStaff = () => {
    setStaffCosts([...staffCosts, { name: '', role: '', annualSalary: '', rdPercent: '100' }]);
  };

  const removeStaff = (idx) => {
    if (staffCosts.length <= 1) return;
    setStaffCosts(staffCosts.filter((_, i) => i !== idx));
  };

  // --- Contractor handlers ---
  const updateContractor = (idx, field, value) => {
    const updated = [...contractors];
    updated[idx] = { ...updated[idx], [field]: value };
    setContractors(updated);
  };

  const addContractor = () => {
    setContractors([...contractors, { vendor: '', description: '', amount: '', rdPercent: '100' }]);
  };

  const removeContractor = (idx) => {
    setContractors(contractors.filter((_, i) => i !== idx));
  };

  // --- Cloud handlers ---
  const updateCloud = (idx, field, value) => {
    const updated = [...cloudCosts];
    updated[idx] = { ...updated[idx], [field]: value };
    setCloudCosts(updated);
  };

  const addCloud = () => {
    setCloudCosts([...cloudCosts, { service: '', monthlyAmount: '', rdPercent: '100' }]);
  };

  const removeCloud = (idx) => {
    setCloudCosts(cloudCosts.filter((_, i) => i !== idx));
  };

  // --- Summary calculations ---
  const validStaff = staffCosts.filter(s => s.name && parseFloat(s.annualSalary) > 0);
  const validContractors = contractors.filter(c => c.vendor && parseFloat(c.amount) > 0);
  const validCloud = cloudCosts.filter(c => c.service && parseFloat(c.monthlyAmount) > 0);

  const staffTotal = validStaff.reduce((sum, s) => {
    const calc = getStaffCalc(parseFloat(s.annualSalary));
    if (!calc) return sum;
    return sum + calc.annualTotal * (parseFloat(s.rdPercent) || 100) / 100;
  }, 0);

  const contractorTotal = validContractors.reduce((sum, c) =>
    sum + parseFloat(c.amount) * (parseFloat(c.rdPercent) || 100) / 100, 0);

  const cloudTotal = validCloud.reduce((sum, c) =>
    sum + parseFloat(c.monthlyAmount) * 12 * (parseFloat(c.rdPercent) || 100) / 100, 0);

  const totalEligible = staffTotal + contractorTotal + cloudTotal;

  // --- Confirm ---
  const handleConfirm = async () => {
    setSaving(true);
    setError(null);

    const extractedData = {
      state: state || null,
      staffCosts: validStaff.map(s => ({
        name: s.name,
        role: s.role || 'Staff',
        annualSalary: parseFloat(s.annualSalary),
        rdPercent: parseFloat(s.rdPercent) || 100,
      })),
      contractors: validContractors.map(c => ({
        vendor: c.vendor,
        description: c.description || 'R&D consulting services',
        amount: parseFloat(c.amount),
        rdPercent: parseFloat(c.rdPercent) || 100,
      })),
      cloudCosts: validCloud.map(c => ({
        service: c.service,
        monthlyAmount: parseFloat(c.monthlyAmount),
        rdPercent: parseFloat(c.rdPercent) || 100,
      })),
    };

    try {
      const res = await fetch(`/api/projects/${projectToken}/costs/ai-interview/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extractedData }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save costs');
      }

      if (onComplete) onComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // --- Render ---
  return (
    <div style={{ display: 'flex', gap: 24 }}>
      {/* Sidebar stepper */}
      <div style={{ width: 200, flexShrink: 0 }}>
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e5e5',
          borderRadius: 8,
          padding: 16,
          position: 'sticky',
          top: 80,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
            Cost Setup
          </div>
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              onClick={() => i < step && setStep(i)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 0',
                cursor: i < step ? 'pointer' : 'default',
              }}
            >
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 600,
                backgroundColor: i < step ? '#10b981' : i === step ? '#021048' : '#e5e7eb',
                color: i <= step ? 'white' : '#9ca3af',
              }}>
                {i < step ? '\u2713' : i + 1}
              </div>
              <span style={{
                fontSize: 13,
                fontWeight: i === step ? 600 : 400,
                color: i === step ? '#021048' : i < step ? '#10b981' : '#9ca3af',
              }}>
                {s.label}
              </span>
            </div>
          ))}

          {/* Running total */}
          {totalEligible > 0 && (
            <div style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: '1px solid #e5e5e5',
            }}>
              <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>Estimated R&D total</div>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: '#021048' }}>
                ${fmt(totalEligible)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e5e5',
          borderRadius: 8,
          overflow: 'hidden',
        }}>
          {/* Step header */}
          <div style={{
            padding: '14px 20px',
            backgroundColor: '#021048',
            color: 'white',
          }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              Step {step + 1}: {STEPS[step].label}
            </div>
          </div>

          <div style={{ padding: 20 }}>
            {step === 0 && renderCompanyStep()}
            {step === 1 && renderStaffStep()}
            {step === 2 && renderExternalStep()}
            {step === 3 && renderReviewStep()}
          </div>

          {/* Navigation */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderTop: '1px solid #e5e5e5',
            backgroundColor: '#fafafa',
          }}>
            <button
              onClick={() => setStep(step - 1)}
              disabled={step === 0}
              style={{
                padding: '8px 16px',
                fontSize: 13,
                color: step === 0 ? '#ccc' : '#666',
                backgroundColor: 'transparent',
                border: `1px solid ${step === 0 ? '#e5e5e5' : '#d1d5db'}`,
                borderRadius: 4,
                cursor: step === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              Back
            </button>

            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canGoNext()}
                style={{
                  padding: '8px 20px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'white',
                  backgroundColor: canGoNext() ? '#021048' : '#ccc',
                  border: 'none',
                  borderRadius: 4,
                  cursor: canGoNext() ? 'pointer' : 'not-allowed',
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleConfirm}
                disabled={saving || validStaff.length === 0}
                style={{
                  padding: '8px 24px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'white',
                  backgroundColor: saving ? '#999' : '#10b981',
                  border: 'none',
                  borderRadius: 4,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Saving...' : 'Confirm & Save All Costs'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // --- Step renderers ---

  function renderCompanyStep() {
    const sgcRate = getSGCRate(year);
    return (
      <div>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 1.5 }}>
          Select your company's state or territory. This determines payroll tax rates for on-cost calculations.
        </p>

        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 6 }}>
          State / Territory
        </label>
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          style={{
            ...inputStyle,
            width: 300,
          }}
        >
          <option value="">Select state...</option>
          {states.map(s => (
            <option key={s.code} value={s.code}>
              {s.name} ({s.code}) — payroll tax {(s.rate * 100).toFixed(2)}%
            </option>
          ))}
        </select>

        <div style={{
          marginTop: 20,
          padding: 14,
          backgroundColor: '#f8fafc',
          borderRadius: 6,
          border: '1px solid #e5e5e5',
          fontSize: 12,
          color: '#666',
          lineHeight: 1.6,
        }}>
          <strong>FY{year} rates that will be applied:</strong><br />
          Superannuation (SGC): {(sgcRate * 100).toFixed(1)}%<br />
          Workers compensation: 2.0%<br />
          Leave provisions: 8.33%<br />
          {state && <>Payroll tax ({state}): {(states.find(s => s.code === state)?.rate * 100 || 0).toFixed(2)}%</>}
        </div>
      </div>
    );
  }

  function renderStaffStep() {
    return (
      <div>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 1.5 }}>
          Add each person who worked on R&D. Enter their gross annual salary — super and on-costs are calculated automatically.
        </p>

        {staffCosts.map((s, idx) => {
          const salary = parseFloat(s.annualSalary) || 0;
          const calc = getStaffCalc(salary);
          const rdPct = parseFloat(s.rdPercent) || 100;
          const rdAmount = calc ? calc.annualTotal * rdPct / 100 : 0;

          return (
            <div key={idx} style={{
              padding: 14,
              marginBottom: 12,
              backgroundColor: '#fafafa',
              border: '1px solid #e5e5e5',
              borderRadius: 6,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#999' }}>Person {idx + 1}</span>
                {staffCosts.length > 1 && (
                  <button onClick={() => removeStaff(idx)} style={removeBtn}>Remove</button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 100px', gap: 10, marginBottom: 8 }}>
                <input
                  type="text"
                  placeholder="Full name"
                  value={s.name}
                  onChange={(e) => updateStaff(idx, 'name', e.target.value)}
                  style={inputStyle}
                />
                <input
                  type="text"
                  placeholder="Role (e.g. Senior Developer)"
                  value={s.role}
                  onChange={(e) => updateStaff(idx, 'role', e.target.value)}
                  style={inputStyle}
                />
                <input
                  type="number"
                  placeholder="Annual salary ($)"
                  value={s.annualSalary}
                  onChange={(e) => updateStaff(idx, 'annualSalary', e.target.value)}
                  min="0"
                  step="1000"
                  style={inputStyle}
                />
                <input
                  type="number"
                  placeholder="R&D %"
                  value={s.rdPercent}
                  onChange={(e) => updateStaff(idx, 'rdPercent', e.target.value)}
                  min="0"
                  max="100"
                  style={inputStyle}
                />
              </div>

              {calc && (
                <div style={{ fontSize: 11, color: '#666', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <span>Salary: ${fmt(calc.monthlySalary)}/mo</span>
                  <span>+ Super: ${fmt(calc.monthlySuper)}/mo</span>
                  <span>+ On-costs: ${fmt(calc.monthlyOnCosts)}/mo</span>
                  <span style={{ fontWeight: 600, color: '#021048' }}>
                    = ${fmt(calc.annualTotal)}/yr total
                  </span>
                  {rdPct < 100 && (
                    <span style={{ fontWeight: 600, color: '#10b981' }}>
                      R&D ({rdPct}%): ${fmt(rdAmount)}/yr
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <button onClick={addStaff} style={addBtn}>
          + Add another person
        </button>
      </div>
    );
  }

  function renderExternalStep() {
    return (
      <div>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 1.5 }}>
          Add any external contractors or cloud/software costs related to R&D. Both are optional — skip if not applicable.
        </p>

        {/* Contractors */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 10 }}>
            Contractors
          </div>

          {contractors.length === 0 ? (
            <div style={{ fontSize: 13, color: '#999', marginBottom: 8 }}>
              No contractors added yet.
            </div>
          ) : (
            contractors.map((c, idx) => (
              <div key={idx} style={{
                padding: 14,
                marginBottom: 8,
                backgroundColor: '#fafafa',
                border: '1px solid #e5e5e5',
                borderRadius: 6,
              }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                  <button onClick={() => removeContractor(idx)} style={removeBtn}>Remove</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 100px', gap: 10 }}>
                  <input
                    type="text"
                    placeholder="Vendor / company name"
                    value={c.vendor}
                    onChange={(e) => updateContractor(idx, 'vendor', e.target.value)}
                    style={inputStyle}
                  />
                  <input
                    type="text"
                    placeholder="Description of R&D work"
                    value={c.description}
                    onChange={(e) => updateContractor(idx, 'description', e.target.value)}
                    style={inputStyle}
                  />
                  <input
                    type="number"
                    placeholder="Total amount ($)"
                    value={c.amount}
                    onChange={(e) => updateContractor(idx, 'amount', e.target.value)}
                    min="0"
                    step="100"
                    style={inputStyle}
                  />
                  <input
                    type="number"
                    placeholder="R&D %"
                    value={c.rdPercent}
                    onChange={(e) => updateContractor(idx, 'rdPercent', e.target.value)}
                    min="0"
                    max="100"
                    style={inputStyle}
                  />
                </div>
              </div>
            ))
          )}

          <button onClick={addContractor} style={addBtn}>
            + Add contractor
          </button>
        </div>

        {/* Cloud / Software */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 10 }}>
            Cloud / Software
          </div>

          {cloudCosts.length === 0 ? (
            <div style={{ fontSize: 13, color: '#999', marginBottom: 8 }}>
              No cloud/software costs added yet.
            </div>
          ) : (
            cloudCosts.map((c, idx) => (
              <div key={idx} style={{
                padding: 14,
                marginBottom: 8,
                backgroundColor: '#fafafa',
                border: '1px solid #e5e5e5',
                borderRadius: 6,
              }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                  <button onClick={() => removeCloud(idx)} style={removeBtn}>Remove</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: 10 }}>
                  <input
                    type="text"
                    placeholder="Service name (e.g. AWS, GitHub)"
                    value={c.service}
                    onChange={(e) => updateCloud(idx, 'service', e.target.value)}
                    style={inputStyle}
                  />
                  <input
                    type="number"
                    placeholder="Monthly amount ($)"
                    value={c.monthlyAmount}
                    onChange={(e) => updateCloud(idx, 'monthlyAmount', e.target.value)}
                    min="0"
                    step="10"
                    style={inputStyle}
                  />
                  <input
                    type="number"
                    placeholder="R&D %"
                    value={c.rdPercent}
                    onChange={(e) => updateCloud(idx, 'rdPercent', e.target.value)}
                    min="0"
                    max="100"
                    style={inputStyle}
                  />
                </div>
                {parseFloat(c.monthlyAmount) > 0 && (
                  <div style={{ fontSize: 11, color: '#666', marginTop: 6 }}>
                    Annual: ${fmt(parseFloat(c.monthlyAmount) * 12)} | R&D: ${fmt(parseFloat(c.monthlyAmount) * 12 * (parseFloat(c.rdPercent) || 100) / 100)}
                  </div>
                )}
              </div>
            ))
          )}

          <button onClick={addCloud} style={addBtn}>
            + Add cloud / software service
          </button>
        </div>
      </div>
    );
  }

  function renderReviewStep() {
    const benefit = calculateTaxBenefit(totalEligible, turnoverBand);

    return (
      <div>
        {error && (
          <div style={{
            padding: 12,
            marginBottom: 16,
            backgroundColor: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: 6,
            fontSize: 13,
            color: '#dc2626',
          }}>
            {error}
          </div>
        )}

        {/* Staff summary */}
        {validStaff.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>
              Staff Costs ({validStaff.length} {validStaff.length === 1 ? 'person' : 'people'})
            </div>
            <table style={tableStyle}>
              <thead>
                <tr style={{ backgroundColor: '#fafafa' }}>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Role</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Salary</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>+ Super + On-costs</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>R&D %</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>R&D Cost</th>
                </tr>
              </thead>
              <tbody>
                {validStaff.map((s, idx) => {
                  const salary = parseFloat(s.annualSalary);
                  const calc = getStaffCalc(salary);
                  const rdPct = parseFloat(s.rdPercent) || 100;
                  const rdAmt = calc ? calc.annualTotal * rdPct / 100 : 0;
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={tdStyle}>{s.name}</td>
                      <td style={tdStyle}>{s.role || '—'}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>${fmt(salary)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>${fmt(calc?.annualTotal || 0)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{rdPct}%</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>${fmt(rdAmt)}</td>
                    </tr>
                  );
                })}
                <tr style={{ borderTop: '2px solid #1a1a1a' }}>
                  <td colSpan={5} style={{ ...tdStyle, fontWeight: 600 }}>Staff Total</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#021048' }}>${fmt(staffTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Contractor summary */}
        {validContractors.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>
              Contractors ({validContractors.length})
            </div>
            <table style={tableStyle}>
              <thead>
                <tr style={{ backgroundColor: '#fafafa' }}>
                  <th style={thStyle}>Vendor</th>
                  <th style={thStyle}>Description</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>R&D %</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>R&D Cost</th>
                </tr>
              </thead>
              <tbody>
                {validContractors.map((c, idx) => {
                  const amt = parseFloat(c.amount);
                  const rdPct = parseFloat(c.rdPercent) || 100;
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={tdStyle}>{c.vendor}</td>
                      <td style={tdStyle}>{c.description || '—'}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>${fmt(amt)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{rdPct}%</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>${fmt(amt * rdPct / 100)}</td>
                    </tr>
                  );
                })}
                <tr style={{ borderTop: '2px solid #1a1a1a' }}>
                  <td colSpan={4} style={{ ...tdStyle, fontWeight: 600 }}>Contractor Total</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#021048' }}>${fmt(contractorTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Cloud summary */}
        {validCloud.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>
              Cloud / Software ({validCloud.length})
            </div>
            <table style={tableStyle}>
              <thead>
                <tr style={{ backgroundColor: '#fafafa' }}>
                  <th style={thStyle}>Service</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Monthly</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Annual</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>R&D %</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>R&D Cost</th>
                </tr>
              </thead>
              <tbody>
                {validCloud.map((c, idx) => {
                  const monthly = parseFloat(c.monthlyAmount);
                  const rdPct = parseFloat(c.rdPercent) || 100;
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={tdStyle}>{c.service}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>${fmt(monthly)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>${fmt(monthly * 12)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{rdPct}%</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>${fmt(monthly * 12 * rdPct / 100)}</td>
                    </tr>
                  );
                })}
                <tr style={{ borderTop: '2px solid #1a1a1a' }}>
                  <td colSpan={4} style={{ ...tdStyle, fontWeight: 600 }}>Cloud Total</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#021048' }}>${fmt(cloudTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Grand total + tax benefit */}
        <div style={{
          padding: 16,
          backgroundColor: benefit.refundable ? '#f0fdf4' : '#eff6ff',
          borderRadius: 8,
          border: `1px solid ${benefit.refundable ? '#bbf7d0' : '#bfdbfe'}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Total Eligible R&D Expenditure</span>
            <span style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace', color: '#021048' }}>
              ${fmt(totalEligible)}
            </span>
          </div>

          {totalEligible > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: benefit.refundable ? '#15803d' : '#1d4ed8' }}>
                  Estimated RDTI Tax Benefit
                </div>
                <div style={{ fontSize: 11, color: benefit.refundable ? '#166534' : '#1e40af' }}>
                  {benefit.description}
                </div>
              </div>
              <span style={{
                fontSize: 20,
                fontWeight: 700,
                fontFamily: 'monospace',
                color: benefit.refundable ? '#16a34a' : '#2563eb',
              }}>
                ${fmt(benefit.offsetAmount)}
              </span>
            </div>
          )}
        </div>

        {validStaff.length === 0 && (
          <div style={{
            marginTop: 16,
            padding: 12,
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 6,
            fontSize: 13,
            color: '#92400e',
          }}>
            You need at least one staff member to save. Go back to Step 2.
          </div>
        )}
      </div>
    );
  }
}

// --- Shared styles ---
const inputStyle = {
  padding: '8px 12px',
  fontSize: 13,
  border: '1px solid #d1d5db',
  borderRadius: 4,
  color: '#1a1a1a',
  backgroundColor: 'white',
};

const addBtn = {
  padding: '8px 16px',
  fontSize: 13,
  color: '#3b82f6',
  backgroundColor: 'transparent',
  border: '1px solid #3b82f6',
  borderRadius: 4,
  cursor: 'pointer',
};

const removeBtn = {
  padding: '2px 8px',
  fontSize: 11,
  color: '#dc2626',
  backgroundColor: 'transparent',
  border: '1px solid #fca5a5',
  borderRadius: 4,
  cursor: 'pointer',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  border: '1px solid #e5e5e5',
  borderRadius: 4,
};

const thStyle = {
  padding: '8px 12px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 600,
  color: '#666',
  borderBottom: '1px solid #e5e5e5',
};

const tdStyle = {
  padding: '8px 12px',
  fontSize: 13,
  color: '#1a1a1a',
};
