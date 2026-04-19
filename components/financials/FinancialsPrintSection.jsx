'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { computeDerived } from '@/lib/financialsCompute';

const NAVY = '#021048';

/**
 * Renders the full financials schedule + detail tables for print layout.
 * Two modes:
 *   - Pass `data` prop directly (server-side fetched, used in Claim Pack page)
 *   - Pass `token` prop to fetch client-side (used in Workspace page)
 */
export default function FinancialsPrintSection({ data: dataProp, token }) {
  const [fetched, setFetched] = useState(null);
  const [loading, setLoading] = useState(!dataProp && !!token);

  useEffect(() => {
    if (dataProp || !token) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      const headers = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};
      fetch(`/api/projects/${token}/financials`, { headers })
        .then(res => res.ok ? res.json() : null)
        .then(d => { if (d) setFetched(d); })
        .catch(() => {})
        .finally(() => setLoading(false));
    });
  }, [token, dataProp]);

  const data = dataProp || fetched;
  if (loading || !data) return null;

  const state = {
    turnover: data.turnover,
    team: data.team || [],
    contractors: data.contractors || [],
    materials: data.materials || [],
    overheads: data.overheads || [],
    depreciation: data.depreciation || [],
    adjustments: data.adjustments || [],
  };

  const derived = computeDerived(state);
  const hasData = state.team.length > 0 || state.contractors.length > 0 ||
    state.materials.length > 0 || state.overheads.length > 0 ||
    state.depreciation.length > 0;

  if (!hasData) return null;

  const fmt = (val) => {
    const n = parseFloat(val);
    if (isNaN(n)) return '$0';
    return '$' + Math.round(n).toLocaleString('en-AU');
  };

  const pctFmt = (val) => {
    const n = parseFloat(val);
    if (isNaN(n)) return '0%';
    return (n * 100).toFixed(1) + '%';
  };

  const associates = state.team.filter(m => m.is_associate);
  const activeAdj = (state.adjustments || []).filter(a => a.applies && parseFloat(a.amount) > 0);

  return (
    <div style={{ pageBreakBefore: 'always' }}>
      <h1 style={{
        fontSize: 22,
        fontWeight: 700,
        color: NAVY,
        borderBottom: `2px solid ${NAVY}`,
        paddingBottom: 8,
        marginBottom: 16,
      }}>
        R&D Tax Incentive Schedule
      </h1>

      {/* Part A */}
      <h2 style={h2Style}>Part A — Calculation of Notional R&D Deduction</h2>
      <table style={tableStyle}>
        <tbody>
          <Row label="Salaries & on-costs (non-associate)" value={fmt(derived.totalNonAssocSalaries)} />
          <Row label="Associate payments (cash-paid only)" value={fmt(derived.totalAssocSalaries)} />
          <Row label="Contractors" value={fmt(derived.contractorsTotal)} />
          <Row label="Materials & consumables" value={fmt(derived.materialsTotal)} />
          <Row label="Decline in value" value={fmt(derived.depreciationTotal)} />
          <Row label="Overheads (apportioned)" value={fmt(derived.overheadsTotal)} />
          {derived.adjustmentsTotal > 0 && (
            <Row label="Less: Adjustments" value={`-${fmt(derived.adjustmentsTotal)}`} color="#dc2626" />
          )}
          <tr style={{ borderTop: '2px solid #1a1a1a' }}>
            <td style={{ ...cellStyle, fontWeight: 700, color: NAVY }}>Total Notional Deduction</td>
            <td style={{ ...cellStyle, ...rStyle, fontWeight: 700, color: NAVY }}>{fmt(derived.eligibleExpenditure)}</td>
          </tr>
        </tbody>
      </table>

      {/* Part B — Adjustments */}
      {activeAdj.length > 0 && (
        <>
          <h2 style={h2Style}>Part B — Clawback Adjustments</h2>
          <table style={tableStyle}>
            <thead><tr><Th>Type</Th><Th right>Amount</Th></tr></thead>
            <tbody>
              {activeAdj.map(a => (
                <Row key={a.adjustment_type}
                  label={a.adjustment_type.charAt(0).toUpperCase() + a.adjustment_type.slice(1)}
                  value={`-${fmt(a.amount)}`} color="#dc2626" />
              ))}
              <tr style={{ borderTop: '2px solid #1a1a1a' }}>
                <td style={{ ...cellStyle, fontWeight: 700 }}>Total Adjustments</td>
                <td style={{ ...cellStyle, ...rStyle, fontWeight: 700, color: '#dc2626' }}>-{fmt(derived.adjustmentsTotal)}</td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      {/* Part C — Associates */}
      {associates.length > 0 && (
        <>
          <h2 style={h2Style}>Part C — Associate Payments</h2>
          <table style={tableStyle}>
            <thead><tr><Th>Associate</Th><Th right>R&D Portion</Th><Th right>Paid in Cash</Th><Th right>Outstanding</Th></tr></thead>
            <tbody>
              {associates.map(m => {
                const d = derived.teamDerived.get(m.id) || { rdCost: 0 };
                const paid = parseFloat(m.paid_in_cash || 0);
                const outstanding = Math.max(0, d.rdCost - paid);
                return (
                  <tr key={m.id}>
                    <td style={cellStyle}>{m.person_name}</td>
                    <td style={{ ...cellStyle, ...rStyle }}>{fmt(d.rdCost)}</td>
                    <td style={{ ...cellStyle, ...rStyle }}>{fmt(paid)}</td>
                    <td style={{ ...cellStyle, ...rStyle, color: outstanding > 0 ? '#dc2626' : undefined, fontWeight: outstanding > 0 ? 600 : 400 }}>{fmt(outstanding)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      {/* Part D — Turnover */}
      <h2 style={h2Style}>Part D — Aggregated Turnover</h2>
      <table style={tableStyle}>
        <tbody>
          <Row label="Aggregated turnover" value={state.turnover ? fmt(state.turnover) : 'Not set'} />
          <Row label="Offset type" value={derived.isRefundable ? 'Refundable' : 'Non-refundable'} />
        </tbody>
      </table>

      {/* Part E — Offset */}
      <h2 style={h2Style}>Part E — R&D Tax Offset Calculation</h2>
      <table style={tableStyle}>
        <tbody>
          <Row label="Offset rate" value={`${(derived.offsetRate * 100).toFixed(1)}%`} />
          <Row label="R&D tax offset" value={fmt(derived.taxOffset)} bold navy />
          <Row label={`Less: Corp tax deduction foregone (at ${derived.isRefundable ? '25' : '30'}%)`} value={`-${fmt(derived.corpTaxForgone)}`} />
          <tr style={{ borderTop: '2px solid #1a1a1a' }}>
            <td style={{ ...cellStyle, fontWeight: 700 }}>{derived.isRefundable ? 'Net Cash Benefit' : 'Net Tax Benefit'}</td>
            <td style={{ ...cellStyle, ...rStyle, fontWeight: 700, color: derived.netBenefit > 0 ? '#16a34a' : '#1a1a1a' }}>{fmt(derived.netBenefit)}</td>
          </tr>
        </tbody>
      </table>

      {/* Team detail */}
      {state.team.length > 0 && (
        <>
          <h2 style={{ ...h2Style, pageBreakBefore: 'always' }}>Team Apportionment Detail</h2>
          <table style={tableStyle}>
            <thead>
              <tr><Th>Person</Th><Th right>Base Salary</Th><Th right>On-Costs</Th><Th right>R&D Hours</Th><Th right>R&D %</Th><Th right>R&D Cost</Th></tr>
            </thead>
            <tbody>
              {state.team.map(m => {
                const d = derived.teamDerived.get(m.id) || { fullyLoaded: 0, rdHours: 0, rdPct: 0, rdCost: 0 };
                const onCosts = d.fullyLoaded - parseFloat(m.base_salary || 0);
                return (
                  <tr key={m.id}>
                    <td style={cellStyle}>{m.person_name}{m.is_associate ? ' (Associate)' : ''}</td>
                    <td style={{ ...cellStyle, ...rStyle }}>{fmt(m.base_salary)}</td>
                    <td style={{ ...cellStyle, ...rStyle }}>{fmt(onCosts)}</td>
                    <td style={{ ...cellStyle, ...rStyle }}>{d.rdHours.toFixed(0)}</td>
                    <td style={{ ...cellStyle, ...rStyle }}>{pctFmt(d.rdPct)}</td>
                    <td style={{ ...cellStyle, ...rStyle, fontWeight: 600 }}>{fmt(d.rdCost)}</td>
                  </tr>
                );
              })}
              <tr style={{ borderTop: '2px solid #1a1a1a' }}>
                <td style={{ ...cellStyle, fontWeight: 700 }}>Total</td>
                <td style={cellStyle}></td><td style={cellStyle}></td><td style={cellStyle}></td><td style={cellStyle}></td>
                <td style={{ ...cellStyle, ...rStyle, fontWeight: 700, color: NAVY }}>{fmt(derived.totalSalaries)}</td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      {/* Contractor detail */}
      {state.contractors.length > 0 && (
        <>
          <h2 style={h2Style}>Contractor Detail</h2>
          <table style={tableStyle}>
            <thead><tr><Th>Description</Th><Th>Activity</Th><Th right>Invoice</Th><Th right>R&D Portion</Th></tr></thead>
            <tbody>
              {state.contractors.map(c => (
                <tr key={c.id}>
                  <td style={cellStyle}>{c.description}</td>
                  <td style={cellStyle}>{c.activity?.name || ''}</td>
                  <td style={{ ...cellStyle, ...rStyle }}>{fmt(c.invoice_amount)}</td>
                  <td style={{ ...cellStyle, ...rStyle, fontWeight: 600 }}>{fmt(c.rd_portion)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid #1a1a1a' }}>
                <td style={{ ...cellStyle, fontWeight: 700 }}>Total</td>
                <td style={cellStyle}></td><td style={cellStyle}></td>
                <td style={{ ...cellStyle, ...rStyle, fontWeight: 700 }}>{fmt(derived.contractorsTotal)}</td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      {/* Materials detail */}
      {state.materials.length > 0 && (
        <>
          <h2 style={h2Style}>Materials & Consumables Detail</h2>
          <table style={tableStyle}>
            <thead><tr><Th>Description</Th><Th>Activity</Th><Th right>Cost</Th><Th right>R&D Portion</Th></tr></thead>
            <tbody>
              {state.materials.map(m => (
                <tr key={m.id}>
                  <td style={cellStyle}>{m.description}</td>
                  <td style={cellStyle}>{m.activity?.name || ''}</td>
                  <td style={{ ...cellStyle, ...rStyle }}>{fmt(m.cost)}</td>
                  <td style={{ ...cellStyle, ...rStyle, fontWeight: 600 }}>{fmt(m.rd_portion)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid #1a1a1a' }}>
                <td style={{ ...cellStyle, fontWeight: 700 }}>Total</td>
                <td style={cellStyle}></td><td style={cellStyle}></td>
                <td style={{ ...cellStyle, ...rStyle, fontWeight: 700 }}>{fmt(derived.materialsTotal)}</td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      {/* Overheads detail */}
      {state.overheads.length > 0 && (
        <>
          <h2 style={h2Style}>Overheads Detail</h2>
          <table style={tableStyle}>
            <thead><tr><Th>Description</Th><Th>Basis</Th><Th right>Annual Cost</Th><Th right>R&D %</Th><Th right>R&D Portion</Th></tr></thead>
            <tbody>
              {state.overheads.map(o => {
                const rdPortion = parseFloat(o.annual_cost || 0) * parseFloat(o.rd_percent || 0) / 100;
                return (
                  <tr key={o.id}>
                    <td style={cellStyle}>{o.description}</td>
                    <td style={cellStyle}>{o.apportionment_basis || ''}</td>
                    <td style={{ ...cellStyle, ...rStyle }}>{fmt(o.annual_cost)}</td>
                    <td style={{ ...cellStyle, ...rStyle }}>{o.rd_percent}%</td>
                    <td style={{ ...cellStyle, ...rStyle, fontWeight: 600 }}>{fmt(rdPortion)}</td>
                  </tr>
                );
              })}
              <tr style={{ borderTop: '2px solid #1a1a1a' }}>
                <td style={{ ...cellStyle, fontWeight: 700 }}>Total</td>
                <td style={cellStyle}></td><td style={cellStyle}></td><td style={cellStyle}></td>
                <td style={{ ...cellStyle, ...rStyle, fontWeight: 700 }}>{fmt(derived.overheadsTotal)}</td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      {/* Depreciation detail */}
      {state.depreciation.length > 0 && (
        <>
          <h2 style={h2Style}>Decline in Value Detail</h2>
          <table style={tableStyle}>
            <thead><tr><Th>Description</Th><Th right>Cost</Th><Th right>Life</Th><Th>Method</Th><Th right>R&D %</Th><Th right>Annual</Th><Th right>R&D Portion</Th></tr></thead>
            <tbody>
              {state.depreciation.map(d => {
                const dd = derived.depreciationDerived.get(d.id) || { annualDecline: 0, rdPortion: 0 };
                return (
                  <tr key={d.id}>
                    <td style={cellStyle}>{d.description}</td>
                    <td style={{ ...cellStyle, ...rStyle }}>{fmt(d.purchase_cost)}</td>
                    <td style={{ ...cellStyle, ...rStyle }}>{d.effective_life_years}y</td>
                    <td style={cellStyle}>{d.method === 'diminishing_value' ? 'Diminishing Value' : 'Prime Cost'}</td>
                    <td style={{ ...cellStyle, ...rStyle }}>{d.rd_use_percent}%</td>
                    <td style={{ ...cellStyle, ...rStyle }}>{fmt(dd.annualDecline)}</td>
                    <td style={{ ...cellStyle, ...rStyle, fontWeight: 600 }}>{fmt(dd.rdPortion)}</td>
                  </tr>
                );
              })}
              <tr style={{ borderTop: '2px solid #1a1a1a' }}>
                <td style={{ ...cellStyle, fontWeight: 700 }}>Total</td>
                <td style={cellStyle}></td><td style={cellStyle}></td><td style={cellStyle}></td><td style={cellStyle}></td><td style={cellStyle}></td>
                <td style={{ ...cellStyle, ...rStyle, fontWeight: 700 }}>{fmt(derived.depreciationTotal)}</td>
              </tr>
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

// Shared styles
const h2Style = { fontSize: 14, fontWeight: 600, color: '#374151', marginTop: 24, marginBottom: 8 };
const tableStyle = { width: '100%', borderCollapse: 'collapse', marginBottom: 16, fontSize: 12 };
const cellStyle = { padding: '4px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'left' };
const rStyle = { textAlign: 'right', fontFamily: 'monospace' };

function Row({ label, value, color, bold, navy }) {
  return (
    <tr>
      <td style={{ ...cellStyle, color: color || undefined }}>{label}</td>
      <td style={{
        ...cellStyle, ...rStyle,
        color: navy ? NAVY : color || undefined,
        fontWeight: bold ? 600 : undefined,
      }}>{value}</td>
    </tr>
  );
}

function Th({ children, right }) {
  return (
    <th style={{
      padding: '4px 8px',
      borderBottom: '1px solid #e5e7eb',
      textAlign: right ? 'right' : 'left',
      backgroundColor: '#f9fafb',
      fontWeight: 600,
      fontSize: 10,
      textTransform: 'uppercase',
      color: '#6b7280',
    }}>
      {children}
    </th>
  );
}
