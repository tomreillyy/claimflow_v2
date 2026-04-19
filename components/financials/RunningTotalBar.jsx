'use client';
import { useFinancials } from './FinancialsProvider';
import RDTITooltip from './RDTITooltip';

const NAVY = '#1e3a5f';
const NAVY_SOFT = '#e8eef4';

export default function RunningTotalBar() {
  const { state, derived } = useFinancials();
  const { turnover } = state;
  const {
    eligibleExpenditure,
    isRefundable,
    offsetRate,
    taxOffset,
    risks,
  } = derived;

  const fmt = (val) => {
    if (!val && val !== 0) return '--';
    if (Math.abs(val) >= 1000000) return '$' + (val / 1000000).toFixed(1) + 'M';
    if (Math.abs(val) >= 1000) return '$' + (val / 1000).toFixed(0) + 'K';
    return '$' + Math.round(val).toLocaleString();
  };

  const figures = [
    {
      label: isRefundable ? 'Refundable Cash Offset' : 'Tax Offset Applied',
      value: fmt(taxOffset),
      tooltip: isRefundable ? 'refundable_cash_offset' : 'tax_offset',
      primary: true,
    },
    {
      label: 'Eligible R&D Spend',
      value: fmt(eligibleExpenditure),
      tooltip: 'eligible_rd_spend',
    },
    {
      label: 'Offset Rate',
      value: (offsetRate * 100).toFixed(1) + '%',
      tooltip: 'offset_rate',
    },
    {
      label: 'Aggregated Turnover',
      value: turnover ? fmt(turnover) : 'Not set',
      tooltip: 'aggregated_turnover',
      badge: turnover ? (isRefundable ? 'Refundable' : 'Non-refundable') : null,
      badgeColor: isRefundable ? '#16a34a' : '#2563eb',
    },
  ];

  const riskPills = risks.filter(r => r.severity === 'red' || r.severity === 'amber');

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backgroundColor: 'white',
      borderBottom: '1px solid #e5e7eb',
      padding: '12px 0',
      marginBottom: 24,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        justifyContent: 'space-between',
      }}>
        {/* Figures */}
        <div style={{ display: 'flex', gap: 24, flex: 1 }}>
          {figures.map((fig, i) => (
            <div key={i} style={{ minWidth: 0 }}>
              <RDTITooltip
                term={fig.tooltip}
                text={fig.tooltip === 'refundable_cash_offset' || fig.tooltip === 'tax_offset'
                  ? `${fig.label}: ${fig.value}. Formula: ${fmt(eligibleExpenditure)} x ${(offsetRate * 100).toFixed(1)}% = ${fmt(taxOffset)}`
                  : undefined
                }
              >
                <div style={{
                  fontSize: 11,
                  color: '#6b7280',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 2,
                }}>
                  {fig.label}
                </div>
              </RDTITooltip>
              <div style={{
                fontSize: fig.primary ? 20 : 16,
                fontWeight: fig.primary ? 700 : 600,
                color: fig.primary ? NAVY : '#1a1a1a',
                fontFamily: 'monospace',
                whiteSpace: 'nowrap',
              }}>
                {fig.value}
                {fig.badge && (
                  <span style={{
                    marginLeft: 8,
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'white',
                    backgroundColor: fig.badgeColor,
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontFamily: 'system-ui',
                    verticalAlign: 'middle',
                  }}>
                    {fig.badge}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Risk pills */}
        {riskPills.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 280 }}>
            {riskPills.slice(0, 3).map((risk, i) => (
              <span key={i} style={{
                fontSize: 11,
                fontWeight: 500,
                color: risk.severity === 'red' ? '#dc2626' : '#d97706',
                backgroundColor: risk.severity === 'red' ? '#fef2f2' : '#fffbeb',
                border: `1px solid ${risk.severity === 'red' ? '#fca5a5' : '#fcd34d'}`,
                borderRadius: 12,
                padding: '3px 10px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 260,
              }}>
                {risk.message}
              </span>
            ))}
            {riskPills.length > 3 && (
              <span style={{
                fontSize: 11,
                color: '#6b7280',
                padding: '3px 6px',
              }}>
                +{riskPills.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
