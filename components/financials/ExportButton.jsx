'use client';
import { useFinancials } from './FinancialsProvider';

const NAVY = '#1e3a5f';

/**
 * Export button that opens a new window with a print-optimized
 * version of the R&D Tax Incentive Schedule and supporting detail.
 */
export default function ExportButton() {
  const { state, derived } = useFinancials();

  const belowThreshold = derived.eligibleExpenditure > 0 && derived.eligibleExpenditure < 20000;

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

  const handleExport = () => {
    if (belowThreshold) {
      if (!confirm('Eligible expenditure is below the $20,000 minimum threshold. Export anyway?')) return;
    }

    const win = window.open('', '_blank');
    if (!win) { alert('Please allow popups for this site.'); return; }

    const html = buildExportHTML();
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  const buildExportHTML = () => {
    const now = new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' });

    // Team detail rows
    const teamRows = state.team.map(m => {
      const d = derived.teamDerived.get(m.id) || { fullyLoaded: 0, rdHours: 0, rdPct: 0, rdCost: 0 };
      return `<tr>
        <td>${esc(m.person_name)}${m.is_associate ? ' <em>(Associate)</em>' : ''}</td>
        <td class="r">${fmt(m.base_salary)}</td>
        <td class="r">${fmt(d.fullyLoaded - parseFloat(m.base_salary || 0))}</td>
        <td class="r">${d.rdHours.toFixed(0)}</td>
        <td class="r">${pctFmt(d.rdPct)}</td>
        <td class="r b">${fmt(d.rdCost)}</td>
      </tr>`;
    }).join('');

    const contractorRows = state.contractors.map(c => `<tr>
      <td>${esc(c.description)}</td>
      <td>${c.activity?.name || ''}</td>
      <td class="r">${fmt(c.invoice_amount)}</td>
      <td class="r b">${fmt(c.rd_portion)}</td>
    </tr>`).join('');

    const materialRows = state.materials.map(m => `<tr>
      <td>${esc(m.description)}</td>
      <td>${m.activity?.name || ''}</td>
      <td class="r">${fmt(m.cost)}</td>
      <td class="r b">${fmt(m.rd_portion)}</td>
    </tr>`).join('');

    const overheadRows = state.overheads.map(o => {
      const rdPortion = parseFloat(o.annual_cost || 0) * parseFloat(o.rd_percent || 0) / 100;
      return `<tr>
        <td>${esc(o.description)}</td>
        <td>${o.apportionment_basis || ''}</td>
        <td class="r">${fmt(o.annual_cost)}</td>
        <td class="r">${o.rd_percent || 0}%</td>
        <td class="r b">${fmt(rdPortion)}</td>
      </tr>`;
    }).join('');

    const depRows = state.depreciation.map(d => {
      const dd = derived.depreciationDerived.get(d.id) || { annualDecline: 0, rdPortion: 0 };
      return `<tr>
        <td>${esc(d.description)}</td>
        <td class="r">${fmt(d.purchase_cost)}</td>
        <td class="r">${d.effective_life_years}y</td>
        <td>${d.method === 'diminishing_value' ? 'DV' : 'PC'}</td>
        <td class="r">${d.rd_use_percent || 0}%</td>
        <td class="r">${fmt(dd.annualDecline)}</td>
        <td class="r b">${fmt(dd.rdPortion)}</td>
      </tr>`;
    }).join('');

    return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>R&D Tax Incentive Schedule</title>
<style>
  body { font-family: system-ui, sans-serif; font-size: 12px; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 20px; }
  h1 { font-size: 18px; color: ${NAVY}; border-bottom: 2px solid ${NAVY}; padding-bottom: 8px; }
  h2 { font-size: 14px; color: #374151; margin-top: 24px; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th, td { padding: 4px 8px; border-bottom: 1px solid #e5e7eb; text-align: left; }
  th { background: #f9fafb; font-weight: 600; font-size: 10px; text-transform: uppercase; color: #6b7280; }
  .r { text-align: right; font-family: monospace; }
  .b { font-weight: 600; }
  .total td { border-top: 2px solid #1a1a1a; font-weight: 700; }
  .navy { color: ${NAVY}; }
  .meta { font-size: 11px; color: #6b7280; margin-bottom: 16px; }
  @media print { body { padding: 0; } }
</style>
</head><body>
<h1>R&D Tax Incentive Schedule</h1>
<div class="meta">Generated ${now}</div>

<h2>Part A — Notional R&D Deduction</h2>
<table>
  <tr><td>Salaries & on-costs (non-associate)</td><td class="r b">${fmt(derived.totalNonAssocSalaries)}</td></tr>
  <tr><td>Associate payments (cash-paid only)</td><td class="r b">${fmt(derived.totalAssocSalaries)}</td></tr>
  <tr><td>Contractors</td><td class="r b">${fmt(derived.contractorsTotal)}</td></tr>
  <tr><td>Materials & consumables</td><td class="r b">${fmt(derived.materialsTotal)}</td></tr>
  <tr><td>Decline in value</td><td class="r b">${fmt(derived.depreciationTotal)}</td></tr>
  <tr><td>Overheads (apportioned)</td><td class="r b">${fmt(derived.overheadsTotal)}</td></tr>
  ${derived.adjustmentsTotal > 0 ? `<tr><td style="color:#dc2626">Less: Adjustments</td><td class="r b" style="color:#dc2626">-${fmt(derived.adjustmentsTotal)}</td></tr>` : ''}
  <tr class="total"><td class="navy">Total Notional Deduction</td><td class="r navy">${fmt(derived.eligibleExpenditure)}</td></tr>
</table>

<h2>Part D — Aggregated Turnover</h2>
<table>
  <tr><td>Aggregated turnover</td><td class="r b">${state.turnover ? fmt(state.turnover) : 'Not set'}</td></tr>
  <tr><td>Offset type</td><td class="r">${derived.isRefundable ? 'Refundable' : 'Non-refundable'}</td></tr>
</table>

<h2>Part E — R&D Tax Offset</h2>
<table>
  <tr><td>Offset rate</td><td class="r">${(derived.offsetRate * 100).toFixed(1)}%</td></tr>
  <tr><td>R&D tax offset</td><td class="r b navy">${fmt(derived.taxOffset)}</td></tr>
  <tr><td>Less: Corp tax deduction foregone</td><td class="r">-${fmt(derived.corpTaxForgone)}</td></tr>
  <tr class="total"><td>${derived.isRefundable ? 'Net Cash Benefit' : 'Net Tax Benefit'}</td><td class="r">${fmt(derived.netBenefit)}</td></tr>
</table>

<h2>Team Apportionment Detail</h2>
<table>
  <tr><th>Person</th><th class="r">Base Salary</th><th class="r">On-Costs</th><th class="r">R&D Hours</th><th class="r">R&D %</th><th class="r">R&D Cost</th></tr>
  ${teamRows}
  <tr class="total"><td>Total</td><td></td><td></td><td></td><td></td><td class="r navy">${fmt(derived.totalSalaries)}</td></tr>
</table>

${state.contractors.length > 0 ? `<h2>Contractor Detail</h2>
<table><tr><th>Description</th><th>Activity</th><th class="r">Invoice</th><th class="r">R&D Portion</th></tr>
${contractorRows}
<tr class="total"><td>Total</td><td></td><td></td><td class="r">${fmt(derived.contractorsTotal)}</td></tr></table>` : ''}

${state.materials.length > 0 ? `<h2>Materials Detail</h2>
<table><tr><th>Description</th><th>Activity</th><th class="r">Cost</th><th class="r">R&D Portion</th></tr>
${materialRows}
<tr class="total"><td>Total</td><td></td><td></td><td class="r">${fmt(derived.materialsTotal)}</td></tr></table>` : ''}

${state.overheads.length > 0 ? `<h2>Overheads Detail</h2>
<table><tr><th>Description</th><th>Basis</th><th class="r">Annual Cost</th><th class="r">R&D %</th><th class="r">R&D Portion</th></tr>
${overheadRows}
<tr class="total"><td>Total</td><td></td><td></td><td></td><td class="r">${fmt(derived.overheadsTotal)}</td></tr></table>` : ''}

${state.depreciation.length > 0 ? `<h2>Decline in Value Detail</h2>
<table><tr><th>Description</th><th class="r">Cost</th><th class="r">Life</th><th>Method</th><th class="r">R&D %</th><th class="r">Annual</th><th class="r">R&D Portion</th></tr>
${depRows}
<tr class="total"><td>Total</td><td></td><td></td><td></td><td></td><td></td><td class="r">${fmt(derived.depreciationTotal)}</td></tr></table>` : ''}

</body></html>`;
  };

  return (
    <button
      onClick={handleExport}
      style={{
        padding: '8px 18px',
        fontSize: 13,
        fontWeight: 600,
        color: 'white',
        backgroundColor: NAVY,
        border: 'none',
        borderRadius: 6,
        cursor: 'pointer',
      }}
    >
      Export PDF
    </button>
  );
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
