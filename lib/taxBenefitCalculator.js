/**
 * RDTI Tax Benefit Calculator
 * Calculates estimated R&D Tax Incentive offset for Australian companies.
 */

/**
 * Calculate the estimated RDTI tax benefit
 * @param {number} eligibleExpenditure - total eligible R&D expenditure
 * @param {string} turnoverBand - 'under_20m' or 'over_20m'
 * @param {object} [options]
 * @param {number} [options.totalExpenses] - total company expenses (for intensity calc, >$20m entities)
 * @returns {{ offsetRate: number, offsetAmount: number, refundable: boolean, description: string, taxRate: number }}
 */
export function calculateTaxBenefit(eligibleExpenditure, turnoverBand, options = {}) {
  if (!eligibleExpenditure || eligibleExpenditure <= 0) {
    return {
      offsetRate: 0,
      offsetAmount: 0,
      refundable: false,
      description: 'No eligible expenditure',
      taxRate: 0,
    };
  }

  if (turnoverBand === 'under_20m') {
    // Small company: refundable offset at company tax rate + 18.5%
    const taxRate = 0.25; // Base rate for small business entity
    const offsetRate = taxRate + 0.185;
    const offsetAmount = Math.round(eligibleExpenditure * offsetRate * 100) / 100;

    return {
      offsetRate,
      offsetAmount,
      refundable: true,
      description: `Refundable offset at ${(offsetRate * 100).toFixed(1)}% (25% tax rate + 18.5% premium)`,
      taxRate,
    };
  }

  if (turnoverBand === 'over_20m') {
    // Large company: non-refundable offset with intensity premium
    const taxRate = 0.30;
    const { totalExpenses } = options;

    let intensity = 0;
    let premium = 0.085; // Default low intensity premium

    if (totalExpenses && totalExpenses > 0) {
      intensity = eligibleExpenditure / totalExpenses;
      premium = intensity > 0.02 ? 0.165 : 0.085;
    }

    const offsetRate = taxRate + premium;
    const offsetAmount = Math.round(eligibleExpenditure * offsetRate * 100) / 100;

    return {
      offsetRate,
      offsetAmount,
      refundable: false,
      description: `Non-refundable offset at ${(offsetRate * 100).toFixed(1)}% (30% tax rate + ${(premium * 100).toFixed(1)}% intensity premium)`,
      taxRate,
      intensity: Math.round(intensity * 10000) / 100, // As percentage
    };
  }

  // Turnover band not set
  const taxRate = 0.25;
  const offsetRate = taxRate + 0.185;
  const offsetAmount = Math.round(eligibleExpenditure * offsetRate * 100) / 100;

  return {
    offsetRate,
    offsetAmount,
    refundable: true,
    description: 'Turnover band not set — showing estimate at 43.5% (under $20M rate)',
    taxRate,
    estimated: true,
  };
}

/**
 * Calculate cost summary from ledger and non-labour costs
 * @param {Array} ledgerEntries - cost_ledger entries
 * @param {Array} nonLabourCosts - non_labour_costs entries
 * @returns {{ staffTotal, contractorTotal, cloudTotal, totalEligible, unapportionedTotal }}
 */
export function calculateCostSummary(ledgerEntries = [], nonLabourCosts = []) {
  const staffTotal = ledgerEntries.reduce((sum, e) => sum + (parseFloat(e.total_amount) || 0), 0);

  const contractorTotal = nonLabourCosts
    .filter(c => c.cost_category === 'contractor')
    .reduce((sum, c) => sum + (parseFloat(c.rd_amount || c.amount) || 0), 0);

  const cloudTotal = nonLabourCosts
    .filter(c => c.cost_category === 'cloud_software')
    .reduce((sum, c) => sum + (parseFloat(c.rd_amount || c.amount) || 0), 0);

  const unapportionedTotal = ledgerEntries
    .filter(e => !e.activity_id)
    .reduce((sum, e) => sum + (parseFloat(e.total_amount) || 0), 0);

  return {
    staffTotal: Math.round(staffTotal * 100) / 100,
    contractorTotal: Math.round(contractorTotal * 100) / 100,
    cloudTotal: Math.round(cloudTotal * 100) / 100,
    totalEligible: Math.round((staffTotal + contractorTotal + cloudTotal) * 100) / 100,
    unapportionedTotal: Math.round(unapportionedTotal * 100) / 100,
  };
}
