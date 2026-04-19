'use client';
import { useFinancials } from './FinancialsProvider';
import RDTITooltip from './RDTITooltip';

const NAVY = '#1e3a5f';

export default function SchedulePreview() {
  const { state, derived } = useFinancials();
  if (state.loading) return null;

  const {
    totalNonAssocSalaries,
    totalAssocSalaries,
    contractorsTotal,
    materialsTotal,
    depreciationTotal,
    overheadsTotal,
    adjustmentsTotal,
    eligibleExpenditure,
    isRefundable,
    offsetRate,
    taxOffset,
    corpTaxForgone,
    netBenefit,
  } = derived;

  const fmt = (val) => {
    const n = parseFloat(val);
    if (isNaN(n)) return '$0';
    const sign = n < 0 ? '-' : '';
    return sign + '$' + Math.abs(Math.round(n)).toLocaleString('en-AU');
  };

  const lines = [
    { label: 'Salaries & on-costs (non-associate)', value: totalNonAssocSalaries, tooltip: 'on_costs' },
    { label: 'Associate payments (cash-paid only)', value: totalAssocSalaries, tooltip: 'associate' },
    { label: 'Contractors', value: contractorsTotal },
    { label: 'Materials & consumables', value: materialsTotal },
    { label: 'Decline in value', value: depreciationTotal, tooltip: 'decline_in_value' },
    { label: 'Overheads (apportioned)', value: overheadsTotal, tooltip: 'apportionment' },
  ];

  const belowThreshold = eligibleExpenditure > 0 && eligibleExpenditure < 20000;

  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>
        <RDTITooltip term="notional_deduction">R&D Tax Incentive Schedule</RDTITooltip>
      </h2>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
        Live preview of the schedule that will be exported. All values recompute as you edit.
      </p>

      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: 'white',
      }}>
        {/* Part A — Notional R&D Deduction */}
        <div style={{
          padding: '10px 16px',
          backgroundColor: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
          fontSize: 12,
          fontWeight: 600,
          color: '#6b7280',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          Part A — Calculation of Notional R&D Deduction
        </div>

        {lines.map((line, idx) => (
          <div key={idx} style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '8px 16px',
            borderBottom: '1px solid #f5f5f5',
            fontSize: 14,
          }}>
            <span style={{ color: '#374151' }}>
              {line.tooltip ? (
                <RDTITooltip term={line.tooltip}>{line.label}</RDTITooltip>
              ) : line.label}
            </span>
            <span style={{ fontFamily: 'monospace', color: '#1a1a1a' }}>
              {fmt(line.value)}
            </span>
          </div>
        ))}

        {/* Adjustments */}
        {adjustmentsTotal > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '8px 16px',
            borderBottom: '1px solid #f5f5f5',
            fontSize: 14,
          }}>
            <span style={{ color: '#dc2626' }}>
              Less: Adjustments (feedstock / recoupment / balancing)
            </span>
            <span style={{ fontFamily: 'monospace', color: '#dc2626' }}>
              -{fmt(adjustmentsTotal)}
            </span>
          </div>
        )}

        {/* Total notional deduction */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderTop: '2px solid #1a1a1a',
          fontSize: 16,
          fontWeight: 700,
          color: NAVY,
        }}>
          <span>
            <RDTITooltip term="notional_deduction">Total Notional Deduction</RDTITooltip>
          </span>
          <span style={{ fontFamily: 'monospace' }}>
            {fmt(eligibleExpenditure)}
          </span>
        </div>

        {/* Below threshold warning */}
        {belowThreshold && (
          <div style={{
            padding: '10px 16px',
            backgroundColor: '#fef2f2',
            borderTop: '1px solid #fca5a5',
            fontSize: 13,
            color: '#dc2626',
            fontWeight: 500,
          }}>
            <RDTITooltip term="twenty_k_threshold">
              Eligible expenditure is below the $20,000 minimum threshold. The R&D tax offset cannot be claimed.
            </RDTITooltip>
          </div>
        )}

        {/* Part D — Aggregated Turnover */}
        <div style={{
          padding: '10px 16px',
          backgroundColor: '#f9fafb',
          borderTop: '1px solid #e5e7eb',
          borderBottom: '1px solid #e5e7eb',
          fontSize: 12,
          fontWeight: 600,
          color: '#6b7280',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          Part D — Aggregated Turnover
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '8px 16px',
          borderBottom: '1px solid #e5e7eb',
          fontSize: 14,
        }}>
          <span style={{ color: '#374151' }}>
            <RDTITooltip term="aggregated_turnover">Aggregated turnover</RDTITooltip>
          </span>
          <span style={{ fontFamily: 'monospace', color: '#1a1a1a' }}>
            {state.turnover ? fmt(state.turnover) : 'Not set'}
            <span style={{
              marginLeft: 8,
              fontSize: 11,
              fontWeight: 600,
              color: 'white',
              backgroundColor: isRefundable ? '#16a34a' : '#2563eb',
              padding: '2px 6px',
              borderRadius: 4,
            }}>
              {isRefundable ? 'Refundable' : 'Non-refundable'}
            </span>
          </span>
        </div>

        {/* Part E — R&D Tax Offset */}
        <div style={{
          padding: '10px 16px',
          backgroundColor: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
          fontSize: 12,
          fontWeight: 600,
          color: '#6b7280',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          Part E — R&D Tax Offset Calculation
        </div>
        <div style={{ padding: '8px 16px', borderBottom: '1px solid #f5f5f5', display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
          <span style={{ color: '#374151' }}>
            <RDTITooltip term="offset_rate">Offset rate</RDTITooltip>
          </span>
          <span style={{ fontFamily: 'monospace' }}>{(offsetRate * 100).toFixed(1)}%</span>
        </div>
        <div style={{ padding: '8px 16px', borderBottom: '1px solid #f5f5f5', display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
          <span style={{ color: '#374151' }}>
            <RDTITooltip term="tax_offset">R&D tax offset</RDTITooltip>
          </span>
          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: NAVY }}>{fmt(taxOffset)}</span>
        </div>
        <div style={{ padding: '8px 16px', borderBottom: '1px solid #f5f5f5', display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#6b7280' }}>
          <span>Less: Corp tax deduction foregone (at {isRefundable ? '25' : '30'}%)</span>
          <span style={{ fontFamily: 'monospace' }}>-{fmt(corpTaxForgone)}</span>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderTop: '2px solid #1a1a1a',
          fontSize: 16,
          fontWeight: 700,
        }}>
          <span>
            <RDTITooltip term="net_benefit">
              {isRefundable ? 'Net Cash Benefit' : 'Net Tax Benefit'}
            </RDTITooltip>
          </span>
          <span style={{ fontFamily: 'monospace', color: netBenefit > 0 ? '#16a34a' : '#1a1a1a' }}>
            {fmt(netBenefit)}
          </span>
        </div>
      </div>
    </section>
  );
}
