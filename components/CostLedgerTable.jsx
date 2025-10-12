'use client';
import React from 'react';

export default function CostLedgerTable({ ledger, hasAttestations, projectToken }) {
  const handleExport = () => {
    window.open(`/api/projects/${projectToken}/costs/export`, '_blank');
  };

  if (!ledger || ledger.length === 0) {
    return (
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginBottom: 16 }}>
          C) Cost Ledger
        </div>
        <div style={{
          padding: 24,
          textAlign: 'center',
          border: '1px solid #e5e5e5',
          borderRadius: 4,
          color: '#999',
          fontSize: 13,
          backgroundColor: 'white'
        }}>
          No payroll uploaded yet.
        </div>
      </div>
    );
  }

  // Group by month for better display
  const byMonth = {};
  for (const entry of ledger) {
    if (!byMonth[entry.month]) {
      byMonth[entry.month] = [];
    }
    byMonth[entry.month].push(entry);
  }

  const months = Object.keys(byMonth).sort().reverse();

  // Calculate totals
  const grandTotal = ledger.reduce((sum, e) => sum + parseFloat(e.total_amount || 0), 0);

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a' }}>C) Cost Ledger</div>
          <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
            Costs automatically split across activities based on evidence. Edit allocations above to override.
          </div>
        </div>
        <button
          onClick={handleExport}
          style={{
            padding: '6px 12px',
            fontSize: 13,
            fontWeight: 500,
            color: '#666',
            border: '1px solid #ddd',
            borderRadius: 3,
            backgroundColor: 'white',
            cursor: 'pointer'
          }}
        >
          Export CSV
        </button>
      </div>

      {!hasAttestations && (
        <div style={{
          padding: 12,
          backgroundColor: '#fffbf0',
          border: '1px solid #ffe082',
          borderRadius: 3,
          marginBottom: 16,
          fontSize: 13,
          color: '#f57c00'
        }}>
          No cost allocations found. Link evidence to activities to auto-split costs.
        </div>
      )}

      <div style={{ backgroundColor: 'white', border: '1px solid #e5e5e5', borderRadius: 4, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ backgroundColor: '#fafafa' }}>
              <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #e5e5e5', fontWeight: 600, color: '#333' }}>Month</th>
              <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #e5e5e5', fontWeight: 600, color: '#333' }}>Person</th>
              <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #e5e5e5', fontWeight: 600, color: '#333' }}>Activity</th>
              <th style={{ padding: 12, textAlign: 'right', borderBottom: '1px solid #e5e5e5', fontWeight: 600, color: '#333' }}>%/Hours</th>
              <th style={{ padding: 12, textAlign: 'right', borderBottom: '1px solid #e5e5e5', fontWeight: 600, color: '#333' }}>Gross</th>
              <th style={{ padding: 12, textAlign: 'right', borderBottom: '1px solid #e5e5e5', fontWeight: 600, color: '#333' }}>Super</th>
              <th style={{ padding: 12, textAlign: 'right', borderBottom: '1px solid #e5e5e5', fontWeight: 600, color: '#333' }}>On-Costs</th>
              <th style={{ padding: 12, textAlign: 'right', borderBottom: '1px solid #e5e5e5', fontWeight: 600, color: '#333' }}>Total</th>
              <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #e5e5e5', fontWeight: 600, color: '#333', fontSize: 12 }}>Basis</th>
            </tr>
          </thead>
          <tbody>
            {months.map(month => {
              const entries = byMonth[month];
              const monthTotal = entries.reduce((sum, e) => sum + parseFloat(e.total_amount || 0), 0);

              return (
                <React.Fragment key={month}>
                  {entries.map((entry, idx) => (
                    <tr key={`${entry.id}_${idx}`} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      {idx === 0 && (
                        <td
                          rowSpan={entries.length + 1}
                          style={{
                            padding: 12,
                            verticalAlign: 'top',
                            fontWeight: 600,
                            color: '#1a1a1a',
                            backgroundColor: '#fafafa',
                            borderRight: '1px solid #e5e5e5'
                          }}
                        >
                          {new Date(month).toLocaleDateString('en-AU', { year: 'numeric', month: 'short' })}
                        </td>
                      )}
                      <td style={{ padding: 12, color: '#1a1a1a' }}>
                        {entry.person_name || entry.person_email || entry.person_identifier}
                      </td>
                      <td style={{ padding: 12, color: entry.activity_name ? '#1a1a1a' : '#999' }}>
                        {entry.activity_name || 'Unapportioned'}
                      </td>
                      <td style={{ padding: 12, textAlign: 'right', fontSize: 12, color: '#666' }}>
                        {entry.apportionment_percent
                          ? `${entry.apportionment_percent}%`
                          : entry.apportionment_hours
                            ? `${entry.apportionment_hours}h`
                            : '-'}
                      </td>
                      <td style={{ padding: 12, textAlign: 'right', color: '#1a1a1a' }}>
                        ${parseFloat(entry.gross_wages || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: 12, textAlign: 'right', color: '#1a1a1a' }}>
                        ${parseFloat(entry.superannuation || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: 12, textAlign: 'right', color: '#1a1a1a' }}>
                        ${parseFloat(entry.on_costs || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: 12, textAlign: 'right', fontWeight: 600, color: '#1a1a1a' }}>
                        ${parseFloat(entry.total_amount || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: 12, fontSize: 11, color: '#666', maxWidth: 200 }}>
                        {entry.basis_text}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ backgroundColor: '#fafafa', fontWeight: 600, fontSize: 12, color: '#333' }}>
                    <td colSpan="3" style={{ padding: 12, textAlign: 'right' }}>Month Subtotal</td>
                    <td style={{ padding: 12, textAlign: 'right' }}>-</td>
                    <td style={{ padding: 12, textAlign: 'right' }}>-</td>
                    <td style={{ padding: 12, textAlign: 'right' }}>-</td>
                    <td style={{ padding: 12, textAlign: 'right', color: '#1a1a1a' }}>
                      ${monthTotal.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: 12 }}></td>
                  </tr>
                </React.Fragment>
              );
            })}
            <tr style={{ backgroundColor: '#f0f9ff', fontWeight: 700 }}>
              <td colSpan="4" style={{ padding: 14, textAlign: 'right', fontSize: 14, color: '#1a1a1a' }}>
                Grand Total
              </td>
              <td style={{ padding: 14, textAlign: 'right' }}>-</td>
              <td style={{ padding: 14, textAlign: 'right' }}>-</td>
              <td style={{ padding: 14, textAlign: 'right' }}>-</td>
              <td style={{ padding: 14, textAlign: 'right', fontSize: 15, color: '#1a1a1a' }}>
                ${grandTotal.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td style={{ padding: 14 }}></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
