/**
 * RDTI tooltip copy — single source of truth for all RDTI term explanations.
 * Used by RDTITooltip component throughout the Financials workspace.
 */

export const RDTI_TOOLTIPS = {
  net_benefit: 'The extra cash benefit from claiming RDTI versus claiming R&D as a normal business expense. Formula: Tax offset \u2212 (Eligible spend \u00d7 25% corp tax rate). Only meaningful for profitable companies. Tax-loss companies get the full tax offset as cash.',

  refundable_cash_offset: 'The cash amount the ATO refunds to the company after lodgement. Applies when aggregated turnover is under $20M. Paid even if the company is in tax loss.',

  tax_offset: 'The R&D tax offset amount. Refundable (paid as cash) if turnover under $20M, non-refundable (reduces tax payable only) if over $20M. Formula: Eligible R&D spend \u00d7 offset rate.',

  eligible_rd_spend: 'Total notional deduction \u2014 the sum of all R&D expenditure categories minus clawback adjustments. Must be at least $20,000 to claim.',

  offset_rate: '43.5% refundable for aggregated turnover under $20M. For $20M+: 38.5% + 8.5% premium up to 2% R&D intensity, or 38.5% + 16.5% premium above 2% intensity.',

  aggregated_turnover: 'Annual turnover of this company plus all connected and affiliated entities. Determines offset type. Calculated per section 328-125 of ITAA 1997.',

  refundable_vs_non: 'Refundable: paid as cash by the ATO even if company has no tax payable. Non-refundable: reduces tax payable only. Refundable = under $20M turnover.',

  twenty_k_threshold: 'Minimum notional deduction to claim the R&D tax offset. Expenditure to a Research Service Provider (RSP) or CRC contribution bypasses this threshold.',

  notional_deduction: 'Total eligible R&D expenditure that generates the offset. Called \u2018notional\u2019 because it\u2019s deducted via the R&D offset mechanism, not as a normal business expense.',

  core_activity: 'Experimental R&D activities conducted for the purpose of generating new knowledge. Must involve a systematic progression of work with a hypothesis, experiment, observation and evaluation.',

  supporting_activity: 'Activities directly related to core R&D activities that, for certain activities, must also have a dominant purpose of supporting the core activity.',

  associate: 'Directors, founders, majority shareholders, or related entities (s.318 ITAA 1936). Payments to associates only count if paid in cash by 30 June. Accruals don\u2019t qualify.',

  paid_in_cash: 'Actual cash transferred to the associate. Journal entries, accruals, or outstanding liabilities don\u2019t count. Proof of bank transfer required.',

  days_to_eofy: 'Number of days until 30 June. Associate payments must be extinguished in cash by this date to be claimable in the current FY.',

  feedstock: 'Clawback that applies when R&D outputs are sold or used commercially. Example: an optimisation algorithm that runs in production and generates revenue. Governed by s.355-465 ITAA 1997.',

  recoupment: 'Clawback that applies when a government grant funded part of the R&D expenditure. The portion covered by the grant is not eligible for the offset.',

  balancing_adjustment: 'Clawback triggered when an R&D asset is sold or disposed during the claim year. Part of the previously claimed decline in value is added back.',

  on_costs: 'Non-salary employment costs: superannuation, payroll tax, workers compensation, annual/sick/long-service leave accrual, fringe benefits tax.',

  apportionment: 'The methodology for splitting an expense between R&D and non-R&D use. Must be a \u2018reasonable basis\u2019 producing \u2018reasonable accuracy\u2019 per ATO guidance.',

  labour_ratio: 'Apportionment based on R&D salaries as a proportion of total salaries. Acceptable for on-costs (super, payroll tax) but NOT acceptable for most overheads per ATO.',

  floor_area: 'Apportionment of rent/utilities based on the physical area used for R&D versus total area. Acceptable methodology for premises-related costs.',

  decline_in_value: 'Depreciation on tangible R&D assets (equipment, computers, lab kit). Governed by s.355-305. Not the same as the asset\u2019s cost \u2014 cost itself is excluded under s.355-225.',

  rsp: 'Research Service Provider \u2014 an organisation registered under the Industry Research and Development Act 1986. Payments to RSPs bypass the $20K minimum threshold.',

  fy_hours: 'Standard full-year hours for apportionment: 1720 hours (40 hours \u00d7 52 weeks \u2212 4 weeks leave). Can be adjusted per company but 1720 is the ATO default reference.',
};
