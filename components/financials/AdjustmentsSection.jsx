'use client';
import { useFinancials } from './FinancialsProvider';
import EditableCell from './EditableCell';
import RDTITooltip from './RDTITooltip';

const ROWS = [
  {
    type: 'feedstock',
    label: 'Feedstock Adjustment',
    tooltip: 'feedstock',
    description: 'R&D outputs sold or used commercially (s.355-465). Amount clawed back from eligible expenditure.',
  },
  {
    type: 'recoupment',
    label: 'Recoupment',
    tooltip: 'recoupment',
    description: 'Government grants that funded R&D expenditure. The grant-covered portion is not eligible.',
  },
  {
    type: 'balancing',
    label: 'Balancing Adjustment',
    tooltip: 'balancing_adjustment',
    description: 'R&D assets sold or disposed during the claim year. Previously claimed decline in value is added back.',
  },
];

export default function AdjustmentsSection() {
  const { state, derived, api } = useFinancials();
  if (state.loading) return null;

  const getAdj = (type) => {
    return state.adjustments.find(a => a.adjustment_type === type) || { applies: false, amount: 0 };
  };

  const fmt = (val) => {
    const n = parseFloat(val);
    if (isNaN(n)) return '$0';
    return '$' + Math.round(n).toLocaleString('en-AU');
  };

  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>
        Adjustments
      </h2>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
        Clawback amounts that reduce eligible expenditure. Only counted when the checkbox is ticked.
      </p>

      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: 'white',
      }}>
        {ROWS.map((row, idx) => {
          const adj = getAdj(row.type);
          const isActive = adj.applies;

          return (
            <div key={row.type} style={{
              padding: '12px 16px',
              borderBottom: idx < ROWS.length - 1 ? '1px solid #f0f0f0' : 'none',
              backgroundColor: isActive ? '#fef2f2' : 'white',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => api.updateAdjustment(row.type, 'applies', e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: '#1e3a5f' }}
                    />
                    <RDTITooltip term={row.tooltip}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>
                        {row.label}
                      </span>
                    </RDTITooltip>
                  </label>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 0 24px', lineHeight: 1.4 }}>
                    {row.description}
                  </p>
                </div>
                <div style={{ width: 140 }}>
                  <EditableCell
                    value={adj.amount}
                    onChange={(v) => api.updateAdjustment(row.type, 'amount', v)}
                    type="money"
                    style={{
                      textAlign: 'right',
                      fontFamily: 'monospace',
                      opacity: isActive ? 1 : 0.4,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {/* Total */}
        <div style={{
          padding: '10px 16px',
          borderTop: '2px solid #1a1a1a',
          display: 'flex',
          justifyContent: 'space-between',
          fontWeight: 600,
          fontSize: 13,
        }}>
          <span>Total Adjustments (reduces eligible expenditure)</span>
          <span style={{ fontFamily: 'monospace', color: derived.adjustmentsTotal > 0 ? '#dc2626' : '#6b7280' }}>
            {derived.adjustmentsTotal > 0 ? '-' : ''}{fmt(derived.adjustmentsTotal)}
          </span>
        </div>
      </div>
    </section>
  );
}
