import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedUser } from '@/lib/serverAuth';
import { calculateSuper, calculateOnCosts, getSGCRate, getPayrollTaxRate } from '@/lib/onCostCalculator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/projects/[token]/costs/ai-interview/confirm
 *
 * Takes the final extracted data from the AI interview and creates all cost entries.
 *
 * Body: {
 *   extractedData: {
 *     state: string,
 *     staffCosts: [{ name, role, annualSalary, rdPercent }],
 *     contractors: [{ vendor, description, amount, rdPercent }],
 *     cloudCosts: [{ service, monthlyAmount, rdPercent }]
 *   }
 * }
 */
export async function POST(req, { params }) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const { token } = await params;

    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id, name, year, owner_id')
      .eq('project_token', token)
      .is('deleted_at', null)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await req.json();
    const { extractedData } = body;

    if (!extractedData) {
      return NextResponse.json({ error: 'No extracted data provided' }, { status: 400 });
    }

    const { state, staffCosts = [], contractors = [], cloudCosts = [] } = extractedData;
    const fyYear = project.year || '2025';
    const sgcRate = getSGCRate(fyYear);

    // Update company state if provided
    if (state) {
      await supabaseAdmin
        .from('companies')
        .update({ state_territory: state })
        .eq('user_id', project.owner_id || user.id);
    }

    // Determine FY month range
    const fyEndYear = parseInt(fyYear);
    const months = [];
    for (let m = 7; m <= 12; m++) {
      months.push(`${fyEndYear - 1}-${String(m).padStart(2, '0')}-01`);
    }
    for (let m = 1; m <= 6; m++) {
      months.push(`${fyEndYear}-${String(m).padStart(2, '0')}-01`);
    }

    const onCostOptions = {
      state: state || undefined,
      payrollTaxRate: state ? getPayrollTaxRate(state) : undefined,
    };

    // Build basis text
    const basisText = `AI cost interview (${new Date().toLocaleDateString('en-AU')})` +
      ` [SGC ${(sgcRate * 100).toFixed(1)}%` +
      (state ? `, payroll tax ${state} ${(getPayrollTaxRate(state) * 100).toFixed(2)}%` : '') +
      `, workers comp 2%, leave provision 8.33%]`;

    // ---- STAFF COSTS ----
    // Delete existing AI-interview entries for this project before re-creating
    await supabaseAdmin
      .from('cost_ledger')
      .delete()
      .eq('project_id', project.id)
      .eq('cost_source', 'ai_interview');

    const ledgerEntries = [];

    for (const staff of staffCosts) {
      const monthlySalary = Math.round(staff.annualSalary / 12 * 100) / 100;
      const monthlySuper = calculateSuper(monthlySalary, fyYear);
      const monthlyOnCosts = calculateOnCosts(monthlySalary, onCostOptions);

      for (const month of months) {
        ledgerEntries.push({
          project_id: project.id,
          month,
          person_identifier: staff.name,
          person_name: staff.name,
          person_email: null,
          activity_id: null,
          gross_wages: monthlySalary,
          superannuation: monthlySuper,
          on_costs: monthlyOnCosts.total,
          total_amount: Math.round((monthlySalary + monthlySuper + monthlyOnCosts.total) * 100) / 100,
          apportionment_percent: staff.rdPercent || null,
          apportionment_hours: null,
          basis_text: basisText,
          source_upload_id: null,
          cost_source: 'ai_interview',
          super_auto_calculated: true,
          oncosts_auto_calculated: true,
        });
      }
    }

    if (ledgerEntries.length > 0) {
      const { error: ledgerError } = await supabaseAdmin
        .from('cost_ledger')
        .insert(ledgerEntries);

      if (ledgerError) {
        console.error('Ledger insert error:', ledgerError);
        return NextResponse.json({
          error: 'Failed to save staff costs',
          details: ledgerError.message
        }, { status: 500 });
      }
    }

    // ---- NON-LABOUR COSTS ----
    // Delete existing AI-suggested non-labour costs
    await supabaseAdmin
      .from('non_labour_costs')
      .delete()
      .eq('project_id', project.id)
      .eq('ai_suggested', true);

    const nonLabourEntries = [];

    // Contractors — single entry per contractor (total amount)
    for (const contractor of contractors) {
      nonLabourEntries.push({
        project_id: project.id,
        cost_category: 'contractor',
        description: contractor.description || `R&D consulting services`,
        vendor_name: contractor.vendor,
        month: `${fyEndYear}-06-01`, // End of FY as default
        amount: contractor.amount,
        rd_percent: contractor.rdPercent || 100,
        activity_id: null,
        basis_text: `AI cost interview — contractor ${contractor.vendor}`,
        ai_suggested: true,
      });
    }

    // Cloud costs — create monthly entries
    for (const cloud of cloudCosts) {
      for (const month of months) {
        nonLabourEntries.push({
          project_id: project.id,
          cost_category: 'cloud_software',
          description: `${cloud.service} subscription`,
          vendor_name: cloud.service,
          month,
          amount: cloud.monthlyAmount,
          rd_percent: cloud.rdPercent || 100,
          activity_id: null,
          basis_text: `AI cost interview — ${cloud.service} (${cloud.rdPercent || 100}% R&D allocation)`,
          ai_suggested: true,
        });
      }
    }

    if (nonLabourEntries.length > 0) {
      const { error: nlError } = await supabaseAdmin
        .from('non_labour_costs')
        .insert(nonLabourEntries);

      if (nlError) {
        console.error('Non-labour insert error:', nlError);
        return NextResponse.json({
          error: 'Failed to save non-labour costs',
          details: nlError.message
        }, { status: 500 });
      }
    }

    // Calculate summary
    const staffTotal = ledgerEntries.reduce((sum, e) => sum + e.total_amount, 0);
    const contractorTotal = contractors.reduce((sum, c) => sum + (c.amount * (c.rdPercent || 100) / 100), 0);
    const cloudAnnualTotal = cloudCosts.reduce((sum, c) => sum + (c.monthlyAmount * 12 * (c.rdPercent || 100) / 100), 0);

    return NextResponse.json({
      ok: true,
      summary: {
        staffEntries: ledgerEntries.length,
        staffCount: staffCosts.length,
        staffAnnualTotal: Math.round(staffTotal * 100) / 100,
        contractorCount: contractors.length,
        contractorTotal: Math.round(contractorTotal * 100) / 100,
        cloudServiceCount: cloudCosts.length,
        cloudAnnualTotal: Math.round(cloudAnnualTotal * 100) / 100,
        totalEligible: Math.round((staffTotal + contractorTotal + cloudAnnualTotal) * 100) / 100,
        sgcRate: `${(sgcRate * 100).toFixed(1)}%`,
        state: state || 'not set',
      },
      message: `Created cost entries for ${staffCosts.length} staff members, ${contractors.length} contractors, and ${cloudCosts.length} cloud services.`
    });

  } catch (error) {
    console.error('Cost interview confirm error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
