'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Spinner } from '@/components/Spinner';
import { Check, AlertTriangle, X, Download, Link2 } from 'lucide-react';

/**
 * Modal for importing Xero data into the financials workspace.
 * Handles: not connected → connect flow, preview → conflict resolution → confirm import.
 *
 * @param {object} props
 * @param {'team'|'contractors'} props.mode - Which tab to show
 * @param {string} props.projectToken
 * @param {function} props.onClose
 * @param {function} props.onImportComplete - Called after successful import to refresh data
 */
export function XeroImportModal({ mode = 'team', projectToken, onClose, onImportComplete }) {
  const { session } = useAuth();
  const [status, setStatus] = useState(null); // null = loading, object = status data
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);

  // Selection state
  const [selectedEmployees, setSelectedEmployees] = useState(new Set());
  const [selectedBills, setSelectedBills] = useState(new Set());
  const [overwriteChoices, setOverwriteChoices] = useState({}); // { employeeId: true/false }

  // Claim period defaults (current FY: Jul 1 - Jun 30)
  const now = new Date();
  const fyStart = now.getMonth() >= 6
    ? `${now.getFullYear()}-07-01`
    : `${now.getFullYear() - 1}-07-01`;
  const fyEnd = now.getMonth() >= 6
    ? `${now.getFullYear() + 1}-06-30`
    : `${now.getFullYear()}-06-30`;

  const [claimStartDate, setClaimStartDate] = useState(fyStart);
  const [claimEndDate, setClaimEndDate] = useState(fyEnd);
  const [state, setState] = useState('NSW');

  const headers = { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    try {
      const res = await fetch(`/api/projects/${projectToken}/xero/status`, { headers });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      setError('Failed to check Xero connection');
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    try {
      const res = await fetch('/api/xero/auth/start', {
        method: 'POST',
        headers,
        body: JSON.stringify({ project_token: projectToken })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError('Failed to start Xero connection');
    }
  }

  async function handleFetchPreview() {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectToken}/xero/sync`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ claimStartDate, claimEndDate, state })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch Xero data');
      }
      const data = await res.json();
      setPreview(data);

      // Auto-select all new items
      const newEmps = new Set();
      data.employees?.forEach(emp => {
        if (emp.status === 'new') newEmps.add(emp.employeeId);
      });
      setSelectedEmployees(newEmps);

      const newBills = new Set();
      data.bills?.forEach(bill => {
        if (bill.status === 'new') newBills.add(bill.invoiceId);
      });
      setSelectedBills(newBills);
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  }

  async function handleConfirmImport() {
    setImporting(true);
    setError(null);
    try {
      const employeesToImport = (preview?.employees || []).filter(emp =>
        selectedEmployees.has(emp.employeeId)
      );
      const billsToImport = (preview?.bills || []).filter(bill =>
        selectedBills.has(bill.invoiceId)
      );

      const res = await fetch(`/api/projects/${projectToken}/xero/sync`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          employees: employeesToImport,
          bills: billsToImport,
          overwriteConflicts: overwriteChoices
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Import failed');
      }

      const result = await res.json();
      onImportComplete?.(result);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  }

  function toggleEmployee(employeeId) {
    setSelectedEmployees(prev => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId);
      else next.add(employeeId);
      return next;
    });
  }

  function toggleBill(invoiceId) {
    setSelectedBills(prev => {
      const next = new Set(prev);
      if (next.has(invoiceId)) next.delete(invoiceId);
      else next.add(invoiceId);
      return next;
    });
  }

  function toggleOverwrite(employeeId) {
    setOverwriteChoices(prev => ({ ...prev, [employeeId]: !prev[employeeId] }));
  }

  const fmt = (n) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);

  // --- Render ---

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
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#021048', margin: 0 }}>
            Import from Xero
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
            <X size={20} />
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spinner size={24} />
            <p style={{ color: '#6b7280', marginTop: 12 }}>Checking Xero connection...</p>
          </div>
        )}

        {/* Not connected state */}
        {!loading && !status?.connected && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 12, background: '#13B5EA',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 20, margin: '0 auto 16px'
            }}>X</div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Connect your Xero account</h3>
            <p style={{ color: '#6b7280', marginBottom: 20, fontSize: 14 }}>
              Import employee payroll data and contractor invoices directly from Xero.
            </p>
            <button onClick={handleConnect} style={{
              background: '#021048', color: '#fff', border: 'none', borderRadius: 8,
              padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6
            }}>
              <Link2 size={14} /> Connect Xero
            </button>
          </div>
        )}

        {/* Connected — show sync options or preview */}
        {!loading && status?.connected && !preview && (
          <div>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
              Connected to <strong>{status.tenantName}</strong>
              {status.lastSyncedAt && ` \u2022 Last synced ${new Date(status.lastSyncedAt).toLocaleDateString()}`}
            </p>

            {/* Claim period selector */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>
                  Claim period start
                </label>
                <input type="date" value={claimStartDate} onChange={e => setClaimStartDate(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>
                  Claim period end
                </label>
                <input type="date" value={claimEndDate} onChange={e => setClaimEndDate(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }} />
              </div>
              <div style={{ width: 120 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>
                  State
                </label>
                <select value={state} onChange={e => setState(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}>
                  {['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
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

        {/* Preview — Employees */}
        {preview && mode === 'team' && (
          <div>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
              Found <strong>{preview.employees.length}</strong> employees in Xero. Select which to import.
            </p>

            <div style={{ maxHeight: 400, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
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
                        <input
                          type="checkbox"
                          checked={selectedEmployees.has(emp.employeeId)}
                          onChange={() => toggleEmployee(emp.employeeId)}
                          disabled={emp.status === 'conflict' && !overwriteChoices[emp.employeeId]}
                        />
                      </td>
                      <td style={tdStyle}>{emp.personName}</td>
                      <td style={{ ...tdStyle, color: '#6b7280' }}>{emp.personEmail}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(emp.baseSalary)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(emp.superAmount)}</td>
                      <td style={tdStyle}>
                        {emp.status === 'new' && (
                          <span style={{ background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500 }}>
                            New
                          </span>
                        )}
                        {emp.status === 'conflict' && (
                          <span style={{ background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500 }}>
                            Conflict
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Conflict resolution section */}
            {preview.employees.some(e => e.status === 'conflict') && (
              <div style={{ marginTop: 16, padding: 12, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <AlertTriangle size={14} color="#d97706" />
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#92400e' }}>Conflicts detected</span>
                </div>
                <p style={{ fontSize: 12, color: '#78350f', marginBottom: 8 }}>
                  These employees already exist in your team. Choose whether to overwrite with Xero values:
                </p>
                {preview.employees.filter(e => e.status === 'conflict').map(emp => (
                  <div key={emp.employeeId} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 0', borderTop: '1px solid #fde68a'
                  }}>
                    <div style={{ fontSize: 12 }}>
                      <strong>{emp.personName}</strong>
                      <span style={{ color: '#6b7280', marginLeft: 8 }}>
                        Existing: {fmt(emp.existingRow?.baseSalary || 0)} → Xero: {fmt(emp.baseSalary)}
                      </span>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={!!overwriteChoices[emp.employeeId]}
                        onChange={() => {
                          toggleOverwrite(emp.employeeId);
                          // Also select/deselect the employee
                          if (!overwriteChoices[emp.employeeId]) {
                            setSelectedEmployees(prev => new Set([...prev, emp.employeeId]));
                          } else {
                            setSelectedEmployees(prev => {
                              const next = new Set(prev);
                              next.delete(emp.employeeId);
                              return next;
                            });
                          }
                        }}
                      />
                      Use Xero value
                    </label>
                  </div>
                ))}
              </div>
            )}

            {/* Import button */}
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={onClose} style={{
                background: '#fff', color: '#374151', border: '1px solid #d1d5db',
                borderRadius: 8, padding: '10px 16px', fontSize: 14, cursor: 'pointer'
              }}>Cancel</button>
              <button
                onClick={handleConfirmImport}
                disabled={importing || selectedEmployees.size === 0}
                style={{
                  background: '#021048', color: '#fff', border: 'none', borderRadius: 8,
                  padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                  opacity: (importing || selectedEmployees.size === 0) ? 0.5 : 1
                }}
              >
                {importing ? 'Importing...' : `Import ${selectedEmployees.size} employee${selectedEmployees.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}

        {/* Preview — Bills */}
        {preview && mode === 'contractors' && (
          <div>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
              Found <strong>{preview.bills.filter(b => b.status === 'new').length}</strong> new bills in Xero.
              {preview.bills.filter(b => b.status === 'already_imported').length > 0 &&
                ` (${preview.bills.filter(b => b.status === 'already_imported').length} already imported)`}
            </p>

            <div style={{ maxHeight: 400, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
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
                    <tr key={bill.invoiceId} style={{ borderTop: '1px solid #f3f4f6' }}>
                      <td style={tdStyle}>
                        <input
                          type="checkbox"
                          checked={selectedBills.has(bill.invoiceId)}
                          onChange={() => toggleBill(bill.invoiceId)}
                          disabled={bill.status === 'already_imported'}
                        />
                      </td>
                      <td style={tdStyle}>{bill.contactName}</td>
                      <td style={{ ...tdStyle, color: '#6b7280' }}>{bill.reference}</td>
                      <td style={tdStyle}>{bill.date}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(bill.total)}</td>
                      <td style={tdStyle}>
                        {bill.status === 'new' && (
                          <span style={{ background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500 }}>
                            New
                          </span>
                        )}
                        {bill.status === 'already_imported' && (
                          <span style={{ background: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500 }}>
                            Already imported
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={onClose} style={{
                background: '#fff', color: '#374151', border: '1px solid #d1d5db',
                borderRadius: 8, padding: '10px 16px', fontSize: 14, cursor: 'pointer'
              }}>Cancel</button>
              <button
                onClick={handleConfirmImport}
                disabled={importing || selectedBills.size === 0}
                style={{
                  background: '#021048', color: '#fff', border: 'none', borderRadius: 8,
                  padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                  opacity: (importing || selectedBills.size === 0) ? 0.5 : 1
                }}
              >
                {importing ? 'Importing...' : `Import ${selectedBills.size} bill${selectedBills.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div style={{ marginTop: 16, padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

const thStyle = { padding: '8px 12px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: '#6b7280' };
const tdStyle = { padding: '8px 12px' };
