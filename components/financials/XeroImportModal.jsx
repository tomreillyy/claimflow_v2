'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Spinner } from '@/components/Spinner';
import { Check, AlertTriangle, X, Download, Link2, ChevronRight, ChevronLeft, Building2, Users, FileText } from 'lucide-react';

const STEPS = ['company', 'team', 'bills'];
const STEP_LABELS = { company: 'Company', team: 'Team', bills: 'Bills' };
const STEP_ICONS = { company: Building2, team: Users, bills: FileText };

export function XeroImportModal({ projectToken, onClose, onImportComplete }) {
  const [status, setStatus] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('company');

  // Company data toggles
  const [importCompanyName, setImportCompanyName] = useState(true);
  const [importAbn, setImportAbn] = useState(true);
  const [importTurnover, setImportTurnover] = useState(true);

  // Selection state
  const [selectedEmployees, setSelectedEmployees] = useState(new Set());
  const [selectedBills, setSelectedBills] = useState(new Set());
  const [overwriteChoices, setOverwriteChoices] = useState({});

  // Claim period
  const now = new Date();
  const fyStart = now.getMonth() >= 6 ? `${now.getFullYear()}-07-01` : `${now.getFullYear() - 1}-07-01`;
  const fyEnd = now.getMonth() >= 6 ? `${now.getFullYear() + 1}-06-30` : `${now.getFullYear()}-06-30`;
  const [claimStartDate, setClaimStartDate] = useState(fyStart);
  const [claimEndDate, setClaimEndDate] = useState(fyEnd);
  const [state, setState] = useState('NSW');

  async function getHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token
      ? { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' };
  }

  useEffect(() => { checkStatus(); }, []);

  async function checkStatus() {
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/projects/${projectToken}/xero/status`, { headers });
      const data = await res.json();
      if (res.ok) setStatus(data);
      else {
        setStatus({ connected: false });
        if (data.error && !data.error.includes('Not authenticated')) setError(data.error);
      }
    } catch {
      setStatus({ connected: false });
      setError('Failed to check Xero connection');
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/xero/auth/start', {
        method: 'POST', headers,
        body: JSON.stringify({ project_token: projectToken })
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch { setError('Failed to start Xero connection'); }
  }

  async function handleFetchPreview() {
    setSyncing(true);
    setError(null);
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/projects/${projectToken}/xero/sync`, {
        method: 'POST', headers,
        body: JSON.stringify({ claimStartDate, claimEndDate, state })
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to fetch Xero data'); }
      const data = await res.json();
      setPreview(data);
      setStep('company');

      const newEmps = new Set();
      data.employees?.forEach(emp => { if (emp.status === 'new') newEmps.add(emp.employeeId); });
      setSelectedEmployees(newEmps);
      setSelectedBills(new Set());
    } catch (err) { setError(err.message); }
    finally { setSyncing(false); }
  }

  async function handleConfirmImport() {
    setImporting(true);
    setError(null);
    try {
      const employeesToImport = (preview?.employees || []).filter(emp => selectedEmployees.has(emp.employeeId));
      const billsToImport = (preview?.bills || []).filter(bill => selectedBills.has(bill.invoiceId));

      // Build company data from selections
      const companyData = {};
      if (importCompanyName && preview?.organisation?.name) companyData.companyName = preview.organisation.legalName || preview.organisation.name;
      if (importAbn && preview?.organisation?.abn) companyData.abn = preview.organisation.abn;
      if (importTurnover && preview?.revenue != null) companyData.turnover = preview.revenue;

      const headers = await getHeaders();
      const res = await fetch(`/api/projects/${projectToken}/xero/sync`, {
        method: 'PUT', headers,
        body: JSON.stringify({
          employees: employeesToImport,
          bills: billsToImport,
          overwriteConflicts: overwriteChoices,
          companyData: Object.keys(companyData).length > 0 ? companyData : undefined
        })
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Import failed'); }
      const result = await res.json();
      onImportComplete?.(result);
      onClose();
    } catch (err) { setError(err.message); }
    finally { setImporting(false); }
  }

  function toggleEmployee(id) {
    setSelectedEmployees(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleBill(id) {
    setSelectedBills(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAllBills() {
    const nb = (preview?.bills || []).filter(b => b.status === 'new');
    setSelectedBills(selectedBills.size === nb.length ? new Set() : new Set(nb.map(b => b.invoiceId)));
  }
  function toggleOverwrite(id) {
    setOverwriteChoices(prev => ({ ...prev, [id]: !prev[id] }));
  }

  const fmt = (n) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
  const fmtFull = (n) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 2 }).format(n);
  const newBillsCount = (preview?.bills || []).filter(b => b.status === 'new').length;
  const stepIdx = STEPS.indexOf(step);
  const nextStep = STEPS[stepIdx + 1];
  const prevStep = STEPS[stepIdx - 1];

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: 24
    }} onClick={onClose}>
      <div
        style={{
          backgroundColor: 'white', borderRadius: 12, padding: 32,
          maxWidth: 800, width: '100%', maxHeight: '85vh', overflow: 'auto',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#021048', margin: 0 }}>Import from Xero</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
            <X size={20} />
          </button>
        </div>

        {/* Step indicator */}
        {preview && (
          <div style={{ display: 'flex', gap: 2, marginBottom: 24 }}>
            {STEPS.map((s, i) => {
              const Icon = STEP_ICONS[s];
              const active = s === step;
              const done = i < stepIdx;
              return (
                <button key={s} onClick={() => setStep(s)} style={{
                  flex: 1, padding: '10px 0', fontSize: 12, fontWeight: 600, border: 'none',
                  borderBottom: active ? '2px solid #021048' : done ? '2px solid #059669' : '2px solid #e5e7eb',
                  background: 'none', cursor: 'pointer',
                  color: active ? '#021048' : done ? '#059669' : '#9ca3af',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                }}>
                  {done ? <Check size={14} /> : <Icon size={14} />}
                  {STEP_LABELS[s]}
                </button>
              );
            })}
          </div>
        )}

        {/* Warnings from partial fetch failures */}
        {preview?.warnings?.length > 0 && (
          <div style={{ marginBottom: 16, padding: 12, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8 }}>
            {preview.warnings.map((w, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 13, color: '#92400e', marginBottom: i < preview.warnings.length - 1 ? 6 : 0 }}>
                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                {w}
              </div>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spinner size={24} />
            <p style={{ color: '#6b7280', marginTop: 12 }}>Checking Xero connection...</p>
          </div>
        )}

        {/* Not connected */}
        {!loading && !status?.connected && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: '#13B5EA', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 20, margin: '0 auto 16px' }}>X</div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Connect your Xero account</h3>
            <p style={{ color: '#6b7280', marginBottom: 20, fontSize: 14 }}>Import company details, payroll data, and contractor invoices from Xero.</p>
            <button onClick={handleConnect} style={{ background: '#021048', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Link2 size={14} /> Connect Xero
            </button>
          </div>
        )}

        {/* Connected — fetch options */}
        {!loading && status?.connected && !preview && (
          <div>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
              Connected to <strong>{status.tenantName}</strong>
              {status.lastSyncedAt && ` \u2022 Last synced ${new Date(status.lastSyncedAt).toLocaleDateString()}`}
            </p>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Claim period start</label>
                <input type="date" value={claimStartDate} onChange={e => setClaimStartDate(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Claim period end</label>
                <input type="date" value={claimEndDate} onChange={e => setClaimEndDate(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ width: 120 }}>
                <label style={labelStyle}>State</label>
                <select value={state} onChange={e => setState(e.target.value)} style={inputStyle}>
                  {['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleFetchPreview} disabled={syncing} style={{
              background: '#021048', color: '#fff', border: 'none', borderRadius: 8,
              padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
              opacity: syncing ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6
            }}>
              <Download size={14} />
              {syncing ? 'Fetching from Xero...' : 'Fetch Data'}
            </button>
          </div>
        )}

        {/* ===== STEP 1: Company Details ===== */}
        {preview && step === 'company' && (
          <div>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
              Review company details from Xero. Toggle which fields to import.
            </p>

            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
              {/* Company Name */}
              <div style={rowStyle}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>Company Name</div>
                  <div style={{ fontSize: 14, color: '#021048', marginTop: 2 }}>
                    {preview.organisation?.legalName || preview.organisation?.name || 'Not available'}
                  </div>
                </div>
                <input type="checkbox" checked={importCompanyName} onChange={() => setImportCompanyName(!importCompanyName)}
                  disabled={!preview.organisation?.name} />
              </div>

              {/* ABN */}
              <div style={{ ...rowStyle, borderTop: '1px solid #f3f4f6' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>ABN</div>
                  <div style={{ fontSize: 14, color: '#021048', marginTop: 2, fontFamily: 'monospace' }}>
                    {preview.organisation?.abn || 'Not available'}
                  </div>
                </div>
                <input type="checkbox" checked={importAbn} onChange={() => setImportAbn(!importAbn)}
                  disabled={!preview.organisation?.abn} />
              </div>

              {/* Revenue / Turnover */}
              <div style={{ ...rowStyle, borderTop: '1px solid #f3f4f6' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>Aggregated Turnover</div>
                  <div style={{ fontSize: 14, color: '#021048', marginTop: 2 }}>
                    {preview.revenue != null ? fmtFull(preview.revenue) : 'Not available'}
                  </div>
                  {preview.revenue != null && (
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                      {preview.revenue < 20000000 ? 'Under $20M — Refundable offset (43.5%)' : '$20M+ — Non-refundable offset'}
                    </div>
                  )}
                </div>
                <input type="checkbox" checked={importTurnover} onChange={() => setImportTurnover(!importTurnover)}
                  disabled={preview.revenue == null} />
              </div>
            </div>

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={onClose} style={btnSecondary}>Cancel</button>
              <button onClick={() => setStep('team')} style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
                Next: Team Members <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ===== STEP 2: Team Members ===== */}
        {preview && step === 'team' && (
          <div>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
              Found <strong>{preview.employees.length}</strong> employees. Select which to import as team members.
            </p>

            <div style={{ maxHeight: 320, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f9fafb', position: 'sticky', top: 0 }}>
                    <th style={thStyle}></th>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Email</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Salary</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Super</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.employees.map(emp => (
                    <tr key={emp.employeeId} style={{ borderTop: '1px solid #f3f4f6' }}>
                      <td style={tdStyle}>
                        <input type="checkbox" checked={selectedEmployees.has(emp.employeeId)}
                          onChange={() => toggleEmployee(emp.employeeId)}
                          disabled={emp.status === 'conflict' && !overwriteChoices[emp.employeeId]} />
                      </td>
                      <td style={tdStyle}>{emp.personName}</td>
                      <td style={{ ...tdStyle, color: '#6b7280' }}>{emp.personEmail}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(emp.baseSalary)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(emp.superAmount)}</td>
                      <td style={tdStyle}>
                        {emp.status === 'new' && <span style={badgeGreen}>New</span>}
                        {emp.status === 'conflict' && <span style={badgeYellow}>Conflict</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {preview.employees.some(e => e.status === 'conflict') && (
              <div style={{ marginTop: 16, padding: 12, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <AlertTriangle size={14} color="#d97706" />
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#92400e' }}>Conflicts detected</span>
                </div>
                <p style={{ fontSize: 12, color: '#78350f', marginBottom: 8 }}>
                  These employees already exist. Choose whether to overwrite with Xero values:
                </p>
                {preview.employees.filter(e => e.status === 'conflict').map(emp => (
                  <div key={emp.employeeId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #fde68a' }}>
                    <div style={{ fontSize: 12 }}>
                      <strong>{emp.personName}</strong>
                      <span style={{ color: '#6b7280', marginLeft: 8 }}>
                        Existing: {fmt(emp.existingRow?.baseSalary || 0)} → Xero: {fmt(emp.baseSalary)}
                      </span>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!overwriteChoices[emp.employeeId]}
                        onChange={() => {
                          toggleOverwrite(emp.employeeId);
                          if (!overwriteChoices[emp.employeeId]) setSelectedEmployees(prev => new Set([...prev, emp.employeeId]));
                          else setSelectedEmployees(prev => { const n = new Set(prev); n.delete(emp.employeeId); return n; });
                        }} />
                      Use Xero value
                    </label>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => setStep('company')} style={{ ...btnSecondary, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ChevronLeft size={16} /> Back
              </button>
              <button onClick={() => setStep('bills')} style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
                Next: Contractor Bills <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ===== STEP 3: Bills ===== */}
        {preview && step === 'bills' && (
          <div>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
              Found <strong>{newBillsCount}</strong> bills. Select only R&D-related contractor invoices.
              {preview.bills.filter(b => b.status === 'already_imported').length > 0 &&
                ` (${preview.bills.filter(b => b.status === 'already_imported').length} already imported)`}
            </p>
            <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>
              Skip non-R&D expenses like rent, cleaning, utilities, parking, etc.
            </p>

            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: '#6b7280' }}>
                <input type="checkbox" checked={newBillsCount > 0 && selectedBills.size === newBillsCount} onChange={toggleAllBills} />
                Select all ({newBillsCount})
              </label>
            </div>

            <div style={{ maxHeight: 300, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f9fafb', position: 'sticky', top: 0 }}>
                    <th style={thStyle}></th>
                    <th style={thStyle}>Supplier</th>
                    <th style={thStyle}>Reference</th>
                    <th style={thStyle}>Date</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.bills.map(bill => (
                    <tr key={bill.invoiceId} style={{ borderTop: '1px solid #f3f4f6', opacity: bill.status === 'already_imported' ? 0.5 : 1 }}>
                      <td style={tdStyle}>
                        <input type="checkbox" checked={selectedBills.has(bill.invoiceId)}
                          onChange={() => toggleBill(bill.invoiceId)} disabled={bill.status === 'already_imported'} />
                      </td>
                      <td style={tdStyle}>{bill.contactName}</td>
                      <td style={{ ...tdStyle, color: '#6b7280' }}>{bill.reference}</td>
                      <td style={tdStyle}>{bill.date}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(bill.total)}</td>
                      <td style={tdStyle}>
                        {bill.status === 'new' && <span style={badgeGreen}>New</span>}
                        {bill.status === 'already_imported' && <span style={badgeGrey}>Imported</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Import summary */}
            <div style={{ marginTop: 16, padding: 12, background: '#f9fafb', borderRadius: 8, fontSize: 13, color: '#374151' }}>
              <strong>Import summary:</strong>{' '}
              {(importCompanyName || importAbn || importTurnover) ? 'Company details, ' : ''}
              {selectedEmployees.size} employee{selectedEmployees.size !== 1 ? 's' : ''},{' '}
              {selectedBills.size} bill{selectedBills.size !== 1 ? 's' : ''}
            </div>

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => setStep('team')} style={{ ...btnSecondary, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ChevronLeft size={16} /> Back
              </button>
              <button onClick={handleConfirmImport}
                disabled={importing || (selectedEmployees.size === 0 && selectedBills.size === 0 && !importCompanyName && !importAbn && !importTurnover)}
                style={{ ...btnPrimary, opacity: importing ? 0.5 : 1 }}>
                {importing ? 'Importing...' : 'Confirm Import'}
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ marginTop: 16, padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#dc2626', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <span>{error}</span>
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 16, flexShrink: 0 }}>×</button>
          </div>
        )}
      </div>
    </div>
  );
}

const thStyle = { padding: '8px 12px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: '#6b7280' };
const tdStyle = { padding: '8px 12px' };
const rowStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' };
const labelStyle = { fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 };
const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 };
const btnPrimary = { background: '#021048', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer' };
const btnSecondary = { background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 16px', fontSize: 14, cursor: 'pointer' };
const badgeGreen = { background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500 };
const badgeYellow = { background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500 };
const badgeGrey = { background: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500 };
