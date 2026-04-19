'use client';
import { useFinancials } from './FinancialsProvider';
import EditableCell from './EditableCell';
import RDTITooltip from './RDTITooltip';

const NAVY = '#1e3a5f';

function daysToEOFY() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  let eofyYear = year;
  if (month > 5 || (month === 5 && now.getDate() > 30)) eofyYear = year + 1;
  const eofy = new Date(eofyYear, 5, 30);
  return Math.max(0, Math.ceil((eofy - now) / (1000 * 60 * 60 * 24)));
}

export default function AssociatesSection() {
  const { state, derived, api } = useFinancials();
  const associates = state.team.filter(m => m.is_associate);
  const days = daysToEOFY();

  if (state.loading) return null;

  const fmt = (val) => {
    const n = parseFloat(val);
    if (isNaN(n)) return '$0';
    return '$' + Math.round(n).toLocaleString('en-AU');
  };

  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>
        <RDTITooltip term="associate">Associates</RDTITooltip>
        {' '}
        <span style={{ fontSize: 13, fontWeight: 400, color: '#9ca3af' }}>({associates.length})</span>
        {days <= 90 && (
          <span style={{
            marginLeft: 12,
            fontSize: 12,
            fontWeight: 600,
            color: days <= 30 ? '#dc2626' : '#d97706',
            backgroundColor: days <= 30 ? '#fef2f2' : '#fffbeb',
            border: `1px solid ${days <= 30 ? '#fca5a5' : '#fcd34d'}`,
            borderRadius: 12,
            padding: '2px 8px',
          }}>
            <RDTITooltip term="days_to_eofy">{days} days to EOFY</RDTITooltip>
          </span>
        )}
      </h2>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
        <RDTITooltip term="paid_in_cash">Cash payments</RDTITooltip> to associates must be made by 30 June to be claimable (s.355-480).
      </p>

      {associates.length === 0 ? (
        <div style={{
          padding: 24,
          textAlign: 'center',
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          color: '#9ca3af',
          fontSize: 13,
        }}>
          No team members flagged as associates. Mark a team member as an associate in their activity split drawer above.
        </div>
      ) : (
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          overflow: 'hidden',
          backgroundColor: 'white',
        }}>
          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr 100px',
            padding: '8px 12px',
            backgroundColor: '#f9fafb',
            borderBottom: '1px solid #e5e7eb',
            fontSize: 11,
            fontWeight: 600,
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            <div>Associate</div>
            <div style={{ textAlign: 'right' }}>R&D Portion</div>
            <div style={{ textAlign: 'right' }}>
              <RDTITooltip term="paid_in_cash">Paid in Cash</RDTITooltip>
            </div>
            <div style={{ textAlign: 'right' }}>Outstanding</div>
            <div style={{ textAlign: 'right' }}>
              <RDTITooltip term="days_to_eofy">Days to EOFY</RDTITooltip>
            </div>
          </div>

          {/* Rows */}
          {associates.map((member, idx) => {
            const d = derived.teamDerived.get(member.id) || { rdCost: 0 };
            const paidInCash = parseFloat(member.paid_in_cash || 0);
            const outstanding = Math.max(0, d.rdCost - paidInCash);
            const hasRisk = outstanding > 0;

            return (
              <div key={member.id} style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr 100px',
                padding: '10px 12px',
                borderBottom: idx < associates.length - 1 ? '1px solid #f0f0f0' : 'none',
                alignItems: 'center',
                backgroundColor: hasRisk ? '#fef2f2' : 'white',
              }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>
                  {member.person_name}
                  {hasRisk && (
                    <span style={{
                      marginLeft: 8,
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: '#dc2626',
                    }} title="Outstanding payment" />
                  )}
                </div>
                <div style={{ textAlign: 'right', fontSize: 13, fontFamily: 'monospace', color: '#6b7280' }}>
                  {fmt(d.rdCost)}
                </div>
                <div style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                  <EditableCell
                    value={member.paid_in_cash}
                    onChange={(v) => api.updateTeamMember(member.id, 'paid_in_cash', v)}
                    type="money"
                    style={{ textAlign: 'right', fontFamily: 'monospace' }}
                  />
                </div>
                <div style={{
                  textAlign: 'right',
                  fontSize: 13,
                  fontFamily: 'monospace',
                  fontWeight: hasRisk ? 600 : 400,
                  color: hasRisk ? '#dc2626' : '#16a34a',
                }}>
                  {outstanding > 0 ? fmt(outstanding) : '$0'}
                </div>
                <div style={{
                  textAlign: 'right',
                  fontSize: 13,
                  fontWeight: 500,
                  color: days <= 30 ? '#dc2626' : days <= 60 ? '#d97706' : '#6b7280',
                }}>
                  {days}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
