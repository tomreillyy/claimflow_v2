/**
 * Pure computation function for the Financials workspace.
 * Takes raw state and returns all derived values.
 * Runs on every state change — must be fast (no I/O).
 */

const FY_HOURS = 1720;

/**
 * Compute all derived values from financials state
 * @param {object} state - The full financials state tree
 * @returns {object} All derived values, totals, and risk flags
 */
export function computeDerived(state) {
  const { team, contractors, materials, overheads, depreciation, adjustments, turnover } = state;

  // --- Team derived values ---
  const teamDerived = new Map();
  let totalNonAssocSalaries = 0;
  let totalAssocSalaries = 0;

  for (const member of (team || [])) {
    const baseSalary = num(member.base_salary);
    const superAmt = num(member.super_amount);
    const payrollTax = num(member.payroll_tax_amount);
    const workersComp = num(member.workers_comp_amount);
    const leaveAccrual = num(member.leave_accrual_amount);

    const fullyLoaded = baseSalary + superAmt + payrollTax + workersComp + leaveAccrual;

    const splits = member.splits || [];
    const rdHours = splits.reduce((sum, s) => sum + num(s.hours), 0);
    const rdPct = FY_HOURS > 0 ? rdHours / FY_HOURS : 0;
    const rdCost = rdPct * fullyLoaded;

    teamDerived.set(member.id, {
      fullyLoaded,
      rdHours,
      rdPct,
      rdCost,
      totalHours: rdHours, // all split hours count toward 1720 check
    });

    if (member.is_associate) {
      // Associate salary capped at paid_in_cash
      const paidInCash = num(member.paid_in_cash);
      totalAssocSalaries += Math.min(paidInCash, rdCost);
    } else {
      totalNonAssocSalaries += rdCost;
    }
  }

  // --- Expenditure totals ---
  const contractorsTotal = (contractors || []).reduce((sum, c) => sum + num(c.rd_portion), 0);
  const materialsTotal = (materials || []).reduce((sum, m) => sum + num(m.rd_portion), 0);

  const overheadsTotal = (overheads || []).reduce((sum, o) => {
    return sum + (num(o.annual_cost) * num(o.rd_percent) / 100);
  }, 0);

  let depreciationTotal = 0;
  const depreciationDerived = new Map();
  for (const item of (depreciation || [])) {
    const purchaseCost = num(item.purchase_cost);
    const effectiveLife = num(item.effective_life_years) || 1;
    const rdUsePct = num(item.rd_use_percent) / 100;

    let annualDecline;
    if (item.method === 'diminishing_value') {
      annualDecline = purchaseCost * (2 / effectiveLife);
    } else {
      // prime_cost
      annualDecline = purchaseCost / effectiveLife;
    }

    const rdPortion = annualDecline * rdUsePct;
    depreciationDerived.set(item.id, { annualDecline, rdPortion });
    depreciationTotal += rdPortion;
  }

  // --- Adjustments ---
  let adjustmentsTotal = 0;
  const adjMap = {};
  if (adjustments) {
    for (const adj of (Array.isArray(adjustments) ? adjustments : Object.values(adjustments))) {
      adjMap[adj.adjustment_type] = adj;
      if (adj.applies) {
        adjustmentsTotal += num(adj.amount);
      }
    }
  }

  // --- Eligible expenditure ---
  const totalSalaries = totalNonAssocSalaries + totalAssocSalaries;
  const eligibleExpenditure = totalSalaries + contractorsTotal + materialsTotal + overheadsTotal + depreciationTotal - adjustmentsTotal;

  // --- Offset calculation ---
  const turnoverNum = num(turnover);
  const isRefundable = turnoverNum > 0 && turnoverNum < 20000000;
  const offsetRate = isRefundable ? 0.435 : 0.385;
  const taxOffset = Math.max(0, eligibleExpenditure * offsetRate);
  const corpTaxRate = isRefundable ? 0.25 : 0.30;
  const corpTaxForgone = eligibleExpenditure * corpTaxRate;
  const netBenefit = taxOffset - corpTaxForgone;

  // --- Risk flags ---
  const risks = [];

  // Unpaid associates
  for (const member of (team || [])) {
    if (!member.is_associate) continue;
    const derived = teamDerived.get(member.id);
    if (!derived) continue;
    const paidInCash = num(member.paid_in_cash);
    const outstanding = Math.max(0, derived.rdCost - paidInCash);
    if (outstanding > 0) {
      risks.push({
        type: 'unpaid_associate',
        severity: 'red',
        message: `${member.person_name}: $${Math.round(outstanding).toLocaleString()} outstanding associate payment`,
      });
    }
  }

  // Hours over 1720
  for (const member of (team || [])) {
    const derived = teamDerived.get(member.id);
    if (derived && derived.totalHours > FY_HOURS) {
      risks.push({
        type: 'hours_exceeded',
        severity: 'amber',
        message: `${member.person_name}: ${derived.totalHours} hours exceeds ${FY_HOURS} FY standard`,
      });
    }
  }

  // Below $20k threshold
  if (eligibleExpenditure > 0 && eligibleExpenditure < 20000) {
    risks.push({
      type: 'below_threshold',
      severity: 'red',
      message: `Eligible expenditure $${Math.round(eligibleExpenditure).toLocaleString()} is below $20,000 minimum`,
    });
  }

  // Overhead R&D % > 80%
  for (const o of (overheads || [])) {
    if (num(o.rd_percent) > 80) {
      risks.push({
        type: 'overhead_high_pct',
        severity: 'amber',
        message: `"${o.description || 'Overhead'}": R&D % of ${o.rd_percent}% may trigger ATO review`,
      });
    }
  }

  // No turnover set
  if (!turnoverNum) {
    risks.push({
      type: 'no_turnover',
      severity: 'amber',
      message: 'Aggregated turnover not set \u2014 offset type cannot be determined',
    });
  }

  return {
    teamDerived,
    totalNonAssocSalaries,
    totalAssocSalaries,
    totalSalaries,
    contractorsTotal,
    materialsTotal,
    overheadsTotal,
    depreciationTotal,
    depreciationDerived,
    adjustmentsTotal,
    eligibleExpenditure,
    isRefundable,
    offsetRate,
    taxOffset,
    corpTaxRate,
    corpTaxForgone,
    netBenefit,
    risks,
    fyHours: FY_HOURS,
  };
}

function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}
