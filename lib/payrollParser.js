// Payroll CSV/XLSX parser with auto-detection and validation
import * as XLSX from 'xlsx';

/**
 * Parse uploaded payroll file (CSV or XLSX) and detect headers
 * @param {File} file - Uploaded file
 * @returns {Promise<{headers: string[], rows: any[], preview: any[], mimeType: string}>}
 */
export async function parsePayrollFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const mimeType = file.type;

  // Parse with XLSX (handles both CSV and XLSX)
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  // Use first sheet
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON (array of objects)
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (!jsonData || jsonData.length === 0) {
    throw new Error('File is empty or could not be parsed');
  }

  // Detect header row (first non-empty row)
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(5, jsonData.length); i++) {
    const row = jsonData[i];
    if (row && row.some(cell => cell && String(cell).trim())) {
      headerRowIndex = i;
      break;
    }
  }

  const headers = jsonData[headerRowIndex].map(h => String(h || '').trim());
  const dataRows = jsonData.slice(headerRowIndex + 1).filter(row =>
    row && row.some(cell => cell != null && String(cell).trim())
  );

  // Convert rows to objects
  const rows = dataRows.map(row => {
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = row[idx] != null ? row[idx] : '';
    });
    return obj;
  });

  // Preview (first 20 rows)
  const preview = rows.slice(0, 20);

  return {
    headers,
    rows,
    preview,
    mimeType,
    totalRows: rows.length
  };
}

/**
 * Vendor presets for common payroll systems
 * Maps system field names to common column headers
 */
export const PAYROLL_PRESETS = {
  xero: {
    name: 'Xero Payroll',
    mapping: {
      employee_email: 'Email',
      employee_name: 'Employee Name',
      pay_date: 'Payment Date',
      pay_period_start: 'Pay Period Start',
      pay_period_end: 'Pay Period End',
      gross_wages: 'Gross',
      superannuation: 'Superannuation',
      on_costs: null // Not typically in Xero exports
    }
  },
  myob: {
    name: 'MYOB',
    mapping: {
      employee_email: 'Employee Email',
      employee_name: 'Employee',
      pay_date: 'Date Paid',
      pay_period_start: 'Period Start',
      pay_period_end: 'Period End',
      gross_wages: 'Gross Pay',
      superannuation: 'Super',
      on_costs: null
    }
  },
  qbo: {
    name: 'QuickBooks Online Payroll',
    mapping: {
      employee_email: 'Email Address',
      employee_name: 'Employee',
      pay_date: 'Pay Date',
      pay_period_start: 'Period Beginning',
      pay_period_end: 'Period Ending',
      gross_wages: 'Gross Pay',
      superannuation: 'Superannuation',
      on_costs: null
    }
  },
  employment_hero: {
    name: 'Employment Hero/KeyPay',
    mapping: {
      employee_email: 'Email',
      employee_name: 'Name',
      pay_date: 'Pay Date',
      pay_period_start: 'From Date',
      pay_period_end: 'To Date',
      gross_wages: 'Gross Earnings',
      superannuation: 'Super',
      on_costs: 'Oncosts'
    }
  }
};

/**
 * Auto-detect which preset best matches the file headers
 * @param {string[]} headers - Column headers from uploaded file
 * @returns {{preset: string, mapping: object, confidence: number} | null}
 */
export function autoDetectPreset(headers) {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());

  let bestMatch = null;
  let bestScore = 0;

  for (const [presetKey, preset] of Object.entries(PAYROLL_PRESETS)) {
    let score = 0;
    let possibleMatches = 0;

    for (const [systemField, columnName] of Object.entries(preset.mapping)) {
      if (!columnName) continue; // Skip null mappings

      possibleMatches++;
      const normalized = columnName.toLowerCase().trim();

      if (normalizedHeaders.includes(normalized)) {
        score++;
      } else {
        // Fuzzy match (contains)
        const fuzzyMatch = normalizedHeaders.some(h =>
          h.includes(normalized) || normalized.includes(h)
        );
        if (fuzzyMatch) score += 0.5;
      }
    }

    const confidence = possibleMatches > 0 ? score / possibleMatches : 0;

    if (confidence > bestScore) {
      bestScore = confidence;
      bestMatch = { preset: presetKey, mapping: preset.mapping, confidence };
    }
  }

  // Only return if confidence > 0.4 (at least 40% match)
  return bestScore > 0.4 ? bestMatch : null;
}

/**
 * Generate smart mapping based on headers (fuzzy matching)
 * @param {string[]} headers - Column headers from file
 * @returns {object} - Mapping of system fields to column names
 */
export function generateSmartMapping(headers) {
  const mapping = {};

  // Required fields
  const fieldPatterns = {
    employee_email: ['email', 'e-mail', 'staff email', 'employee email', 'worker email'],
    employee_id: ['employee id', 'staff id', 'emp id', 'id', 'employee number', 'staff number'],
    employee_name: ['name', 'employee name', 'staff name', 'employee', 'full name', 'worker name'],
    pay_date: ['pay date', 'payment date', 'date paid', 'paid date', 'date'],
    pay_period_start: ['period start', 'pay period start', 'from date', 'start date', 'period beginning'],
    pay_period_end: ['period end', 'pay period end', 'to date', 'end date', 'period ending'],
    gross_wages: ['gross', 'gross pay', 'gross wages', 'gross earnings', 'total gross', 'earnings'],
    superannuation: ['super', 'superannuation', 'super contribution', 'super paid'],
    on_costs: ['oncosts', 'on-costs', 'on costs', 'payroll tax']
  };

  for (const header of headers) {
    const normalized = header.toLowerCase().trim();

    for (const [systemField, patterns] of Object.entries(fieldPatterns)) {
      if (mapping[systemField]) continue; // Already mapped

      // Check exact or fuzzy match
      const match = patterns.some(pattern =>
        normalized === pattern ||
        normalized.includes(pattern) ||
        pattern.includes(normalized)
      );

      if (match) {
        mapping[systemField] = header; // Use original header (preserve case)
      }
    }
  }

  return mapping;
}

/**
 * Validate mapped data and return issues
 * @param {any[]} rows - Parsed data rows
 * @param {object} mapping - Field mapping
 * @returns {object} - {valid: boolean, errors: string[], warnings: string[]}
 */
export function validatePayrollData(rows, mapping) {
  const errors = [];
  const warnings = [];

  if (!rows || rows.length === 0) {
    errors.push('No data rows found');
    return { valid: false, errors, warnings };
  }

  // Required fields
  const hasEmail = mapping.employee_email;
  const hasId = mapping.employee_id;

  if (!hasEmail && !hasId) {
    errors.push('Must map either employee_email or employee_id');
  }

  if (!mapping.employee_name) {
    errors.push('Must map employee_name');
  }

  if (!mapping.pay_date) {
    errors.push('Must map pay_date');
  }

  if (!mapping.gross_wages) {
    errors.push('Must map gross_wages');
  }

  // Optional fields warnings
  if (!mapping.superannuation) {
    warnings.push('Superannuation not mapped → will default to 0');
  }

  if (!mapping.on_costs) {
    warnings.push('On-costs not mapped → will default to 0');
  }

  if (!mapping.pay_period_start || !mapping.pay_period_end) {
    warnings.push('Pay period dates not mapped → will roll by pay_date only');
  }

  // Sample data validation (first 20 rows)
  const sampleRows = rows.slice(0, 20);
  let blankEmails = 0;
  let invalidDates = 0;
  let negativeAmounts = 0;

  for (const row of sampleRows) {
    // Check email/ID
    const email = mapping.employee_email ? row[mapping.employee_email] : null;
    const id = mapping.employee_id ? row[mapping.employee_id] : null;

    if (!email && !id) {
      blankEmails++;
    }

    // Check date
    const payDate = mapping.pay_date ? row[mapping.pay_date] : null;
    if (payDate && !isValidDate(payDate)) {
      invalidDates++;
    }

    // Check amounts
    const gross = mapping.gross_wages ? parseFloat(row[mapping.gross_wages]) : null;
    if (gross != null && (isNaN(gross) || gross < 0)) {
      negativeAmounts++;
    }
  }

  if (blankEmails > 0) {
    warnings.push(`${blankEmails} row(s) missing employee email/ID in preview`);
  }

  if (invalidDates > 0) {
    warnings.push(`${invalidDates} row(s) have invalid dates in preview`);
  }

  if (negativeAmounts > 0) {
    errors.push(`${negativeAmounts} row(s) have negative or invalid amounts`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Detect date format from sample values
 * @param {any[]} rows - Sample data rows
 * @param {string} dateColumn - Column name containing dates
 * @returns {string | null} - Detected format: 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', etc.
 */
export function detectDateFormat(rows, dateColumn) {
  const sampleDates = rows
    .slice(0, 10)
    .map(row => row[dateColumn])
    .filter(d => d != null && String(d).trim());

  if (sampleDates.length === 0) return null;

  // Check common patterns
  const patterns = {
    'DD/MM/YYYY': /^\d{1,2}\/\d{1,2}\/\d{4}$/,
    'MM/DD/YYYY': /^\d{1,2}\/\d{1,2}\/\d{4}$/,
    'YYYY-MM-DD': /^\d{4}-\d{1,2}-\d{1,2}$/,
    'DD-MM-YYYY': /^\d{1,2}-\d{1,2}-\d{4}$/
  };

  for (const [format, regex] of Object.entries(patterns)) {
    const matches = sampleDates.filter(d => regex.test(String(d).trim()));
    if (matches.length >= sampleDates.length * 0.8) {
      return format;
    }
  }

  return null;
}

/**
 * Check if a value is a valid date
 * @param {any} value - Date value to check
 * @returns {boolean}
 */
function isValidDate(value) {
  if (!value) return false;

  // Try parsing as Date
  const date = new Date(value);
  if (!isNaN(date.getTime())) return true;

  // Try common formats
  const str = String(value).trim();
  const formats = [
    /^\d{1,2}\/\d{1,2}\/\d{4}$/, // DD/MM/YYYY or MM/DD/YYYY
    /^\d{4}-\d{1,2}-\d{1,2}$/, // YYYY-MM-DD
    /^\d{1,2}-\d{1,2}-\d{4}$/ // DD-MM-YYYY
  ];

  return formats.some(regex => regex.test(str));
}

/**
 * Convert date from detected format to ISO (YYYY-MM-DD)
 * @param {any} value - Date value
 * @param {string} format - Source format
 * @returns {string | null} - ISO date string
 */
export function convertDateToISO(value, format) {
  if (!value) return null;

  const str = String(value).trim();

  try {
    if (format === 'DD/MM/YYYY') {
      const [day, month, year] = str.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    if (format === 'MM/DD/YYYY') {
      const [month, day, year] = str.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    if (format === 'DD-MM-YYYY') {
      const [day, month, year] = str.split('-');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    if (format === 'YYYY-MM-DD') {
      return str; // Already ISO
    }

    // Fallback: try parsing as Date
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (e) {
    return null;
  }

  return null;
}
