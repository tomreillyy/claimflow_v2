/**
 * Xero API client for ClaimFlow
 * Fetches employee payroll data and AP bills from Xero,
 * transforms into fin_team / fin_contractors format.
 */

import { calculateOnCosts } from '@/lib/onCostCalculator';

const XERO_PAYROLL_BASE = 'https://api.xero.com/payroll.xro/1.0';
const XERO_ACCOUNTING_BASE = 'https://api.xero.com/api.xro/2.0';

/**
 * Authenticated fetch to Xero API
 */
async function xeroFetch(url, accessToken, tenantId) {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Xero-Tenant-Id': tenantId,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const status = response.status;
    let errText = '';
    try { errText = await response.text(); } catch {}

    if (status === 401) throw new Error('Xero session expired. Please disconnect and reconnect Xero.');
    if (status === 403) throw new Error('Xero access denied. You may need to reconnect with the required permissions.');
    if (status === 404) throw new Error('Xero resource not found. The requested data may not be available for this organisation.');
    if (status === 429) throw new Error('Too many requests to Xero. Please wait a moment and try again.');

    console.error(`[Xero API] ${status} ${url}:`, errText);
    throw new Error(`Xero returned an error (${status}). Please try again or reconnect Xero.`);
  }

  return response.json();
}

/**
 * Fetch all active employees from Xero Payroll AU API
 * Returns array of { employeeId, firstName, lastName, email, annualSalary }
 */
export async function fetchEmployees(accessToken, tenantId) {
  const employees = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const data = await xeroFetch(
      `${XERO_PAYROLL_BASE}/Employees?Status=ACTIVE&page=${page}`,
      accessToken,
      tenantId
    );

    const batch = data.Employees || [];
    for (const emp of batch) {
      // Calculate annual salary from pay template earnings lines
      let annualSalary = 0;
      if (emp.PayTemplate?.EarningsLines) {
        for (const line of emp.PayTemplate.EarningsLines) {
          // AnnualSalary field is set for salary-based employees
          if (line.AnnualSalary) {
            annualSalary += line.AnnualSalary;
          } else if (line.RatePerUnit && line.NumberOfUnitsPerWeek) {
            // Hourly employees: rate * hours * 52 weeks
            annualSalary += line.RatePerUnit * line.NumberOfUnitsPerWeek * 52;
          }
        }
      }

      employees.push({
        employeeId: emp.EmployeeID,
        firstName: emp.FirstName || '',
        lastName: emp.LastName || '',
        email: emp.Email || '',
        annualSalary: Math.round(annualSalary * 100) / 100
      });
    }

    // Xero paginates at 100 per page
    hasMore = batch.length === 100;
    page++;
  }

  return employees;
}

/**
 * Fetch pay run summaries for a date range to get actual wages + super paid
 * Returns Map<employeeId, { totalGross, totalSuper }>
 */
export async function fetchPayrollActuals(accessToken, tenantId, startDate, endDate) {
  const actuals = new Map();

  // Fetch pay runs within the period
  const data = await xeroFetch(
    `${XERO_PAYROLL_BASE}/PayRuns`,
    accessToken,
    tenantId
  );

  const payRuns = (data.PayRuns || []).filter(pr => {
    const endDateStr = pr.PayRunPeriodEndDate || pr.PeriodEndDate;
    if (!endDateStr) return false;
    // Xero dates come as "/Date(timestamp)/" or ISO string
    const prDate = parseXeroDate(endDateStr);
    return prDate >= new Date(startDate) && prDate <= new Date(endDate);
  });

  // For each pay run, fetch payslips to get per-employee breakdown
  for (const payRun of payRuns) {
    if (payRun.PayRunStatus === 'DRAFT') continue;

    try {
      const prData = await xeroFetch(
        `${XERO_PAYROLL_BASE}/PayRuns/${payRun.PayRunID}`,
        accessToken,
        tenantId
      );

      const payslips = prData.PayRuns?.[0]?.Payslips || prData.PayRun?.Payslips || [];

      for (const slip of payslips) {
        const empId = slip.EmployeeID;
        if (!actuals.has(empId)) {
          actuals.set(empId, { totalGross: 0, totalSuper: 0 });
        }

        const emp = actuals.get(empId);

        // Sum earnings (gross wages)
        if (slip.EarningsLines) {
          for (const line of slip.EarningsLines) {
            emp.totalGross += (line.Amount || 0);
          }
        }

        // Sum SGC superannuation
        if (slip.SuperannuationLines) {
          for (const line of slip.SuperannuationLines) {
            if (line.ContributionType === 'SGC') {
              emp.totalSuper += (line.Amount || 0);
            }
          }
        }
      }
    } catch (err) {
      console.error(`[Xero Sync] Error fetching PayRun ${payRun.PayRunID}:`, err.message);
    }
  }

  return actuals;
}

/**
 * Fetch AP bills (accounts payable invoices) for a date range
 * Returns array of { invoiceId, contactName, date, total, reference }
 */
export async function fetchBills(accessToken, tenantId, startDate, endDate) {
  const whereClause = `Type=="ACCPAY" AND Date>=DateTime(${startDate.replace(/-/g, ',')}) AND Date<=DateTime(${endDate.replace(/-/g, ',')})`;

  const bills = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const pageUrl = `${XERO_ACCOUNTING_BASE}/Invoices?where=${encodeURIComponent(whereClause)}&Statuses=AUTHORISED,PAID&page=${page}`;
    const data = await xeroFetch(pageUrl, accessToken, tenantId);

    const batch = data.Invoices || [];
    for (const inv of batch) {
      bills.push({
        invoiceId: inv.InvoiceID,
        contactName: inv.Contact?.Name || 'Unknown',
        date: inv.DateString || inv.Date,
        total: inv.Total || 0,
        reference: inv.Reference || inv.InvoiceNumber || ''
      });
    }

    hasMore = batch.length === 100;
    page++;
  }

  return bills;
}

/**
 * Fetch organisation details (company name, ABN, legal name)
 */
export async function fetchOrganisation(accessToken, tenantId) {
  const data = await xeroFetch(`${XERO_ACCOUNTING_BASE}/Organisation`, accessToken, tenantId);
  const org = data.Organisations?.[0];
  if (!org) return null;

  return {
    name: org.Name || '',
    legalName: org.LegalName || '',
    abn: org.TaxNumber || '',
    countryCode: org.CountryCode || '',
    financialYearEndDay: org.FinancialYearEndDay,
    financialYearEndMonth: org.FinancialYearEndMonth,
  };
}

/**
 * Fetch total revenue from Xero P&L report for a date range
 * Returns the total revenue/income figure (aggregated turnover proxy)
 */
export async function fetchRevenue(accessToken, tenantId, startDate, endDate) {
  try {
    const url = `${XERO_ACCOUNTING_BASE}/Reports/ProfitAndLoss?fromDate=${startDate}&toDate=${endDate}`;
    const data = await xeroFetch(url, accessToken, tenantId);

    const rows = data.Reports?.[0]?.Rows || [];
    let totalRevenue = 0;

    for (const section of rows) {
      if (section.RowType === 'Section' &&
          ['Revenue', 'Income', 'Other Income', 'Other Revenue'].includes(section.Title)) {
        const subRows = section.Rows || [];
        for (const row of subRows) {
          if (row.RowType === 'SummaryRow' && row.Cells?.[1]?.Value) {
            totalRevenue += parseFloat(row.Cells[1].Value) || 0;
          }
        }
      }
    }

    return Math.round(totalRevenue * 100) / 100;
  } catch (err) {
    console.error('[Xero Sync] Error fetching revenue:', err.message);
    return null;
  }
}

/**
 * Build a full import preview combining employee data with on-cost calculations
 * @param {string} accessToken
 * @param {string} tenantId
 * @param {string} startDate - YYYY-MM-DD claim period start
 * @param {string} endDate - YYYY-MM-DD claim period end
 * @param {string} state - Australian state for payroll tax calc (e.g. 'NSW')
 * @returns {{ employees: Array, bills: Array }}
 */
export async function buildImportPreview(accessToken, tenantId, startDate, endDate, state) {
  const warnings = [];

  // Fetch everything in parallel — each wrapped to catch individual failures
  const [employees, actuals, bills, organisation, revenue] = await Promise.all([
    fetchEmployees(accessToken, tenantId).catch(err => {
      console.error('[Xero Sync] Employees fetch failed:', err.message);
      warnings.push('Could not fetch employees from Xero Payroll. You may need Payroll permissions enabled.');
      return [];
    }),
    fetchPayrollActuals(accessToken, tenantId, startDate, endDate).catch(err => {
      console.error('[Xero Sync] Payroll actuals fetch failed:', err.message);
      warnings.push('Could not fetch pay run data. Salaries will use pay template estimates.');
      return new Map();
    }),
    fetchBills(accessToken, tenantId, startDate, endDate).catch(err => {
      console.error('[Xero Sync] Bills fetch failed:', err.message);
      warnings.push('Could not fetch bills from Xero Accounting.');
      return [];
    }),
    fetchOrganisation(accessToken, tenantId).catch(err => {
      console.error('[Xero Sync] Organisation fetch failed:', err.message);
      warnings.push('Could not fetch company details.');
      return null;
    }),
    fetchRevenue(accessToken, tenantId, startDate, endDate),
  ]);

  // Combine employee data with actual payroll figures and on-cost calculations
  const enrichedEmployees = employees.map(emp => {
    const actual = actuals.get(emp.employeeId);

    // Prefer actuals over pay template estimate
    const baseSalary = actual ? Math.round(actual.totalGross * 100) / 100 : emp.annualSalary;
    const superAmount = actual ? Math.round(actual.totalSuper * 100) / 100 : 0;

    // Calculate on-costs (payroll tax, workers comp, leave) using existing calculator
    const onCosts = calculateOnCosts(baseSalary, { state });

    return {
      employeeId: emp.employeeId,
      personName: `${emp.firstName} ${emp.lastName}`.trim(),
      personEmail: emp.email,
      baseSalary,
      superAmount,
      payrollTaxAmount: onCosts.payrollTax,
      workersCompAmount: onCosts.workersComp,
      leaveAccrualAmount: onCosts.leaveProvision,
      source: actual ? 'payslips' : 'pay_template'
    };
  });

  return {
    organisation,
    revenue,
    employees: enrichedEmployees,
    bills,
    warnings,
  };
}

/**
 * Parse Xero date format (handles both "/Date(timestamp)/" and ISO strings)
 */
function parseXeroDate(dateStr) {
  if (!dateStr) return new Date(0);
  // Handle /Date(1234567890000+0000)/ format
  const match = dateStr.match(/\/Date\((\d+)/);
  if (match) {
    return new Date(parseInt(match[1]));
  }
  return new Date(dateStr);
}
