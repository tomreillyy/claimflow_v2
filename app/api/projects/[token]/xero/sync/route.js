import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyUserAndProjectAccess, getXeroToken } from '@/lib/serverAuth';
import { buildImportPreview } from '@/lib/xeroSync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST - Fetch import preview from Xero (employees + bills)
 * Body: { claimStartDate, claimEndDate, state }
 */
export async function POST(req, { params }) {
  try {
    const { token } = await params;
    const { user, project, error: authError } = await verifyUserAndProjectAccess(req, token);
    if (authError) {
      return NextResponse.json({ error: authError }, { status: !user ? 401 : 403 });
    }

    const { claimStartDate, claimEndDate, state } = await req.json();

    if (!claimStartDate || !claimEndDate) {
      return NextResponse.json({ error: 'claimStartDate and claimEndDate required' }, { status: 400 });
    }

    // Get Xero token
    const { accessToken, tenantId, tenantName, error: tokenError } = await getXeroToken(user.id);
    if (tokenError) {
      return NextResponse.json({ error: tokenError }, { status: 401 });
    }

    // Upsert xero_connections with claim dates
    await supabaseAdmin
      .from('xero_connections')
      .upsert({
        project_id: project.id,
        claim_start_date: claimStartDate,
        claim_end_date: claimEndDate,
        sync_status: 'syncing'
      }, { onConflict: 'project_id' });

    // Fetch preview data from Xero
    const preview = await buildImportPreview(accessToken, tenantId, claimStartDate, claimEndDate, state);

    // Check for existing fin_team rows to detect conflicts
    const { data: existingTeam } = await supabaseAdmin
      .from('fin_team')
      .select('id, person_name, person_email, base_salary, super_amount, xero_employee_id')
      .eq('project_id', project.id);

    // Mark each employee with conflict status
    const existingByEmail = new Map();
    const existingByXeroId = new Map();
    for (const row of (existingTeam || [])) {
      if (row.person_email) existingByEmail.set(row.person_email.toLowerCase(), row);
      if (row.xero_employee_id) existingByXeroId.set(row.xero_employee_id, row);
    }

    const employeesWithStatus = preview.employees.map(emp => {
      const existingByXero = existingByXeroId.get(emp.employeeId);
      const existingByMail = emp.personEmail ? existingByEmail.get(emp.personEmail.toLowerCase()) : null;
      const existing = existingByXero || existingByMail;

      return {
        ...emp,
        status: existing ? 'conflict' : 'new',
        existingRow: existing ? {
          id: existing.id,
          personName: existing.person_name,
          baseSalary: Number(existing.base_salary),
          superAmount: Number(existing.super_amount)
        } : null
      };
    });

    // Check for existing contractor bills
    const { data: existingBills } = await supabaseAdmin
      .from('fin_contractors')
      .select('id, xero_invoice_id')
      .eq('project_id', project.id)
      .not('xero_invoice_id', 'is', null);

    const existingInvoiceIds = new Set((existingBills || []).map(b => b.xero_invoice_id));

    const billsWithStatus = preview.bills.map(bill => ({
      ...bill,
      status: existingInvoiceIds.has(bill.invoiceId) ? 'already_imported' : 'new'
    }));

    // Update sync status
    await supabaseAdmin
      .from('xero_connections')
      .update({ sync_status: 'idle' })
      .eq('project_id', project.id);

    return NextResponse.json({
      tenantName,
      employees: employeesWithStatus,
      bills: billsWithStatus
    });

  } catch (err) {
    console.error('[Xero Sync] Preview error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch Xero data' }, { status: 500 });
  }
}

/**
 * PUT - Confirm import of selected employees and bills
 * Body: { employees: [...], bills: [...], overwriteConflicts: { [employeeId]: boolean } }
 */
export async function PUT(req, { params }) {
  try {
    const { token } = await params;
    const { user, project, error: authError } = await verifyUserAndProjectAccess(req, token);
    if (authError) {
      return NextResponse.json({ error: authError }, { status: !user ? 401 : 403 });
    }

    const { employees = [], bills = [], overwriteConflicts = {}, companyData } = await req.json();

    let teamInserted = 0;
    let teamUpdated = 0;
    let billsInserted = 0;

    // Save company details if provided
    if (companyData) {
      // Find or create company for this project's owner
      const { data: projectData } = await supabaseAdmin
        .from('projects')
        .select('owner_id, company_id')
        .eq('id', project.id)
        .single();

      if (projectData) {
        const updates = {};
        if (companyData.companyName) updates.company_name = companyData.companyName;
        if (companyData.abn) updates.abn = companyData.abn.replace(/\s/g, '');
        if (companyData.turnover != null) {
          updates.aggregated_turnover = companyData.turnover;
          updates.aggregated_turnover_band = companyData.turnover < 20000000 ? 'under_20m' : 'over_20m';
        }

        if (Object.keys(updates).length > 0) {
          if (projectData.company_id) {
            await supabaseAdmin
              .from('companies')
              .update(updates)
              .eq('id', projectData.company_id);
          } else {
            // Create company and link to project
            const { data: newCo } = await supabaseAdmin
              .from('companies')
              .insert({ ...updates, owner_id: projectData.owner_id })
              .select('id')
              .single();
            if (newCo) {
              await supabaseAdmin
                .from('projects')
                .update({ company_id: newCo.id })
                .eq('id', project.id);
            }
          }
        }
      }
    }

    // Get max display_order for new inserts
    const { data: maxOrder } = await supabaseAdmin
      .from('fin_team')
      .select('display_order')
      .eq('project_id', project.id)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    let nextOrder = (maxOrder?.display_order || 0) + 1;

    // Process employees
    for (const emp of employees) {
      // Check if this employee already exists (by xero_employee_id)
      const { data: existing } = await supabaseAdmin
        .from('fin_team')
        .select('id')
        .eq('project_id', project.id)
        .eq('xero_employee_id', emp.employeeId)
        .maybeSingle();

      if (existing) {
        // Update existing row
        await supabaseAdmin
          .from('fin_team')
          .update({
            person_name: emp.personName,
            person_email: emp.personEmail || null,
            base_salary: emp.baseSalary,
            super_amount: emp.superAmount,
            payroll_tax_amount: emp.payrollTaxAmount,
            workers_comp_amount: emp.workersCompAmount,
            leave_accrual_amount: emp.leaveAccrualAmount,
            xero_imported_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        teamUpdated++;
      } else if (emp.existingRow && overwriteConflicts[emp.employeeId]) {
        // User chose to overwrite the conflicting manual entry
        await supabaseAdmin
          .from('fin_team')
          .update({
            person_name: emp.personName,
            person_email: emp.personEmail || null,
            base_salary: emp.baseSalary,
            super_amount: emp.superAmount,
            payroll_tax_amount: emp.payrollTaxAmount,
            workers_comp_amount: emp.workersCompAmount,
            leave_accrual_amount: emp.leaveAccrualAmount,
            xero_employee_id: emp.employeeId,
            xero_imported_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', emp.existingRow.id);
        teamUpdated++;
      } else if (!emp.existingRow) {
        // Insert new row
        await supabaseAdmin
          .from('fin_team')
          .insert({
            project_id: project.id,
            person_name: emp.personName,
            person_email: emp.personEmail || null,
            base_salary: emp.baseSalary,
            super_amount: emp.superAmount,
            payroll_tax_amount: emp.payrollTaxAmount,
            workers_comp_amount: emp.workersCompAmount,
            leave_accrual_amount: emp.leaveAccrualAmount,
            xero_employee_id: emp.employeeId,
            xero_imported_at: new Date().toISOString(),
            display_order: nextOrder++
          });
        teamInserted++;
      }
    }

    // Process bills
    for (const bill of bills) {
      if (bill.status === 'already_imported') continue;

      await supabaseAdmin
        .from('fin_contractors')
        .insert({
          project_id: project.id,
          description: `${bill.contactName}${bill.reference ? ' - ' + bill.reference : ''}`,
          invoice_date: bill.date,
          invoice_amount: bill.total,
          rd_portion: 0, // User sets manually
          xero_invoice_id: bill.invoiceId,
          xero_imported_at: new Date().toISOString()
        });
      billsInserted++;
    }

    // Update sync status
    await supabaseAdmin
      .from('xero_connections')
      .update({
        last_synced_at: new Date().toISOString(),
        sync_status: 'success',
        sync_error: null
      })
      .eq('project_id', project.id);

    return NextResponse.json({
      ok: true,
      teamInserted,
      teamUpdated,
      billsInserted
    });

  } catch (err) {
    console.error('[Xero Sync] Import error:', err);
    return NextResponse.json({ error: err.message || 'Failed to import Xero data' }, { status: 500 });
  }
}
