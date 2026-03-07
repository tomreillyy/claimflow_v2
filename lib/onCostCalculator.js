/**
 * On-Cost Calculator
 * Auto-calculates superannuation, payroll tax, workers comp, and leave provisions
 * for Australian R&D Tax Incentive claims.
 */

// Superannuation Guarantee Charge rates by financial year
const SGC_RATES = {
  '2023-24': 0.11,
  '2024-25': 0.115,
  '2025-26': 0.12,
  '2026-27': 0.12,
};

// State/territory payroll tax rates (employer rate, approximate)
const STATE_PAYROLL_TAX_RATES = {
  NSW: 0.0545,
  VIC: 0.0485,
  QLD: 0.0475,
  WA: 0.055,
  SA: 0.0495,
  TAS: 0.04,
  ACT: 0.0685,
  NT: 0.055,
};

// Default rates
const DEFAULT_WORKERS_COMP_RATE = 0.02;
const DEFAULT_LEAVE_PROVISION_RATE = 0.0833; // ~1/12 for annual leave accrual

/**
 * Get the SGC rate for a given financial year
 * @param {string} fyYear - e.g. '2024-25' or '2025' (calendar year of the FY end)
 * @returns {number} SGC rate as decimal
 */
export function getSGCRate(fyYear) {
  // Handle both '2024-25' format and '2025' format
  const normalized = fyYear.includes('-') ? fyYear : `${parseInt(fyYear) - 1}-${fyYear.slice(2)}`;
  return SGC_RATES[normalized] || 0.115; // Default to current rate
}

/**
 * Calculate superannuation from gross wages
 * @param {number} grossWages
 * @param {string} fyYear - financial year
 * @returns {number} super amount
 */
export function calculateSuper(grossWages, fyYear) {
  const rate = getSGCRate(fyYear);
  return Math.round(grossWages * rate * 100) / 100;
}

/**
 * Calculate all on-costs from gross wages
 * @param {number} grossWages
 * @param {object} options
 * @param {string} [options.state] - state/territory code (e.g. 'NSW')
 * @param {number} [options.workersCompRate] - override workers comp rate
 * @param {number} [options.leaveProvisionRate] - override leave provision rate
 * @param {number} [options.payrollTaxRate] - override payroll tax rate
 * @returns {{ payrollTax: number, workersComp: number, leaveProvision: number, total: number }}
 */
export function calculateOnCosts(grossWages, options = {}) {
  const {
    state,
    workersCompRate = DEFAULT_WORKERS_COMP_RATE,
    leaveProvisionRate = DEFAULT_LEAVE_PROVISION_RATE,
    payrollTaxRate,
  } = options;

  // Use explicit rate if provided, otherwise lookup by state, otherwise 0
  const ptRate = payrollTaxRate != null ? payrollTaxRate : (state ? STATE_PAYROLL_TAX_RATES[state] || 0 : 0);

  const payrollTax = Math.round(grossWages * ptRate * 100) / 100;
  const workersComp = Math.round(grossWages * workersCompRate * 100) / 100;
  const leaveProvision = Math.round(grossWages * leaveProvisionRate * 100) / 100;

  return {
    payrollTax,
    workersComp,
    leaveProvision,
    total: Math.round((payrollTax + workersComp + leaveProvision) * 100) / 100,
  };
}

/**
 * Calculate full staff cost from annual salary
 * @param {number} annualSalary - gross annual salary
 * @param {string} fyYear - financial year
 * @param {object} options - state, rates etc.
 * @returns {{ monthlySalary, monthlySuper, monthlyOnCosts, monthlyTotal, annualTotal, breakdown }}
 */
export function calculateFullStaffCost(annualSalary, fyYear, options = {}) {
  const monthlySalary = Math.round(annualSalary / 12 * 100) / 100;
  const monthlySuper = calculateSuper(monthlySalary, fyYear);
  const onCosts = calculateOnCosts(monthlySalary, options);

  const monthlyTotal = Math.round((monthlySalary + monthlySuper + onCosts.total) * 100) / 100;

  return {
    monthlySalary,
    monthlySuper,
    monthlyOnCosts: onCosts.total,
    monthlyTotal,
    annualTotal: Math.round(monthlyTotal * 12 * 100) / 100,
    breakdown: {
      superRate: getSGCRate(fyYear),
      payrollTax: onCosts.payrollTax,
      workersComp: onCosts.workersComp,
      leaveProvision: onCosts.leaveProvision,
    },
  };
}

/**
 * Get payroll tax rate for a state
 * @param {string} state
 * @returns {number} rate as decimal
 */
export function getPayrollTaxRate(state) {
  return STATE_PAYROLL_TAX_RATES[state] || 0;
}

/**
 * Get all available states
 * @returns {Array<{code: string, name: string, rate: number}>}
 */
export function getStates() {
  return [
    { code: 'NSW', name: 'New South Wales', rate: STATE_PAYROLL_TAX_RATES.NSW },
    { code: 'VIC', name: 'Victoria', rate: STATE_PAYROLL_TAX_RATES.VIC },
    { code: 'QLD', name: 'Queensland', rate: STATE_PAYROLL_TAX_RATES.QLD },
    { code: 'WA', name: 'Western Australia', rate: STATE_PAYROLL_TAX_RATES.WA },
    { code: 'SA', name: 'South Australia', rate: STATE_PAYROLL_TAX_RATES.SA },
    { code: 'TAS', name: 'Tasmania', rate: STATE_PAYROLL_TAX_RATES.TAS },
    { code: 'ACT', name: 'Australian Capital Territory', rate: STATE_PAYROLL_TAX_RATES.ACT },
    { code: 'NT', name: 'Northern Territory', rate: STATE_PAYROLL_TAX_RATES.NT },
  ];
}
