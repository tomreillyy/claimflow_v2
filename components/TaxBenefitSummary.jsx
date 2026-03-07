'use client';
import { calculateTaxBenefit } from '@/lib/taxBenefitCalculator';

export default function TaxBenefitSummary({ staffTotal, contractorTotal, cloudTotal, turnoverBand }) {
  const totalEligible = (staffTotal || 0) + (contractorTotal || 0) + (cloudTotal || 0);
  const benefit = calculateTaxBenefit(totalEligible, turnoverBand);

  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #e5e5e5',
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 20px',
        backgroundColor: '#021048',
        color: 'white',
        fontWeight: 600,
        fontSize: 15,
      }}>
        Cost Summary & Tax Benefit
      </div>

      <div style={{ padding: 20 }}>
        {/* Category breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          <CostRow label="Staff costs" sublabel="salary + super + on-costs" amount={staffTotal} />
          <CostRow label="Contractors" amount={contractorTotal} />
          <CostRow label="Cloud / Software" amount={cloudTotal} />
        </div>

        <div style={{ borderTop: '2px solid #1a1a1a', paddingTop: 12, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>
              Total Eligible R&D Expenditure
            </span>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', fontFamily: 'monospace' }}>
              ${totalEligible.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Tax benefit */}
        {totalEligible > 0 && (
          <div style={{
            padding: 16,
            backgroundColor: benefit.refundable ? '#f0fdf4' : '#eff6ff',
            borderRadius: 8,
            border: `1px solid ${benefit.refundable ? '#bbf7d0' : '#bfdbfe'}`,
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}>
              <div>
                <div style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: benefit.refundable ? '#15803d' : '#1d4ed8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: 4,
                }}>
                  Estimated RDTI Tax Benefit
                </div>
                <div style={{
                  fontSize: 11,
                  color: benefit.refundable ? '#166534' : '#1e40af',
                  lineHeight: 1.4,
                }}>
                  {benefit.description}
                  {benefit.estimated && (
                    <span style={{ display: 'block', marginTop: 4, fontStyle: 'italic' }}>
                      Set your turnover band in company settings for accurate calculation
                    </span>
                  )}
                </div>
              </div>
              <div style={{
                fontSize: 24,
                fontWeight: 700,
                fontFamily: 'monospace',
                color: benefit.refundable ? '#16a34a' : '#2563eb',
                whiteSpace: 'nowrap',
                marginLeft: 16,
              }}>
                ${benefit.offsetAmount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div style={{
              marginTop: 10,
              display: 'inline-block',
              padding: '3px 10px',
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 600,
              backgroundColor: benefit.refundable ? '#dcfce7' : '#dbeafe',
              color: benefit.refundable ? '#15803d' : '#1d4ed8',
            }}>
              {benefit.refundable ? 'Refundable — cash back even in a tax loss' : 'Non-refundable — offset against tax payable'}
            </div>
          </div>
        )}

        {totalEligible === 0 && (
          <div style={{
            padding: 16,
            backgroundColor: '#fafafa',
            borderRadius: 8,
            border: '1px solid #e5e5e5',
            textAlign: 'center',
            color: '#999',
            fontSize: 13,
          }}>
            Add costs above to see your estimated tax benefit
          </div>
        )}
      </div>
    </div>
  );
}

function CostRow({ label, sublabel, amount }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <span style={{ fontSize: 14, color: '#1a1a1a' }}>{label}</span>
        {sublabel && (
          <span style={{ fontSize: 12, color: '#999', marginLeft: 6 }}>({sublabel})</span>
        )}
      </div>
      <span style={{ fontSize: 14, fontFamily: 'monospace', color: amount > 0 ? '#1a1a1a' : '#ccc' }}>
        ${(amount || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  );
}
