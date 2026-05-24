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
    const errText = await response.text();
    throw new Error(`Xero API error ${response.status}: ${errText}`);
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
 * Build a full import preview combining employee data with on-cost calculations
 * @param {string} accessToken
 * @param {string} tenantId
 * @param {string} startDate - YYYY-MM-DD claim period start
 * @param {string} endDate - YYYY-MM-DD claim period end
 * @param {string} state - Australian state for payroll tax calc (e.g. 'NSW')
 * @returns {{ employees: Array, bills: Array }}
 */
export async function buildImportPreview(accessToken, tenantId, startDate, endDate, state) {
  // Fetch employees and payroll actuals in parallel
  const [employees, actuals, bills] = await Promise.all([
    fetchEmployees(accessToken, tenantId),
    fetchPayrollActuals(accessToken, tenantId, startDate, endDate),
    fetchBills(accessToken, tenantId, startDate, endDate)
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
    employees: enrichedEmployees,
    bills
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
