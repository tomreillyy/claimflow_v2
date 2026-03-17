import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { calculateSuper, calculateOnCosts, getSGCRate, getPayrollTaxRate } from '@/lib/onCostCalculator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/projects/[token]/costs/ai-interview/confirm
 *
 * Takes the final extracted data from the cost setup wizard and creates all cost entries.
 */
export async function POST(req, { params }) {
  try {
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
    const fyYear = String(project.year || '2025');
    const sgcRate = getSGCRate(fyYear);

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

    const basisText = `Cost setup (${new Date().toLocaleDateString('en-AU')})` +
      ` [SGC ${(sgcRate * 100).toFixed(1)}%` +
      (state ? `, payroll tax ${state} ${(getPayrollTaxRate(state) * 100).toFixed(2)}%` : '') +
      `, workers comp 2%, leave provision 8.33%]`;

    // ---- STAFF COSTS ----
    // Delete ALL existing entries for this project with null source_upload_id
    // (i.e. entries created by wizard, not by CSV upload)
    const { error: deleteErr } = await supabaseAdmin
      .from('cost_ledger')
      .delete()
      .eq('project_id', project.id)
      .is('source_upload_id', null);

    if (deleteErr) {
      console.warn('Could not clean up old entries:', deleteErr.message);
    }

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
          person_email: staff.email || null,
          activity_id: null,
          gross_wages: monthlySalary,
          superannuation: monthlySuper,
          on_costs: monthlyOnCosts.total,
          total_amount: Math.round((monthlySalary + monthlySuper + monthlyOnCosts.total) * 100) / 100,
          apportionment_percent: staff.rdPercent || null,
          apportionment_hours: null,
          basis_text: basisText,
          source_upload_id: null,
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
    // Only attempt if we have data AND table exists
    let nonLabourSaved = false;
    if (contractors.length > 0 || cloudCosts.length > 0) {
      // Check if table exists by doing a lightweight query
      const { error: tableCheck } = await supabaseAdmin
        .from('non_labour_costs')
        .select('id')
        .eq('project_id', project.id)
        .limit(1);

      if (!tableCheck) {
        // Table exists — clean up old entries and insert new ones
        await supabaseAdmin
          .from('non_labour_costs')
          .delete()
          .eq('project_id', project.id)
          .or('basis_text.like.Cost setup%,basis_text.like.AI cost interview%,ai_suggested.eq.true');

        const nonLabourEntries = [];

        for (const contractor of contractors) {
          nonLabourEntries.push({
            project_id: project.id,
            cost_category: 'contractor',
            description: contractor.description || 'R&D consulting services',
            vendor_name: contractor.vendor,
            month: `${fyEndYear}-06-01`,
            amount: contractor.amount,
            rd_percent: contractor.rdPercent || 100,
            activity_id: null,
            basis_text: `Cost setup — contractor ${contractor.vendor}`,
            ai_suggested: false,
          });
        }

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
              basis_text: `Cost setup — ${cloud.service} (${cloud.rdPercent || 100}% R&D)`,
              ai_suggested: false,
            });
          }
        }

        if (nonLabourEntries.length > 0) {
          const { error: nlError } = await supabaseAdmin
            .from('non_labour_costs')
            .insert(nonLabourEntries);

          if (nlError) {
            console.warn('Non-labour insert error:', nlError.message);
          } else {
            nonLabourSaved = true;
          }
        }
      } else {
        console.warn('non_labour_costs table not available:', tableCheck.message);
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
        nonLabourSaved,
      },
      message: `Created cost entries for ${staffCosts.length} staff members` +
        (contractors.length ? `, ${contractors.length} contractors` : '') +
        (cloudCosts.length ? `, ${cloudCosts.length} cloud services` : '') +
        (!nonLabourSaved && (contractors.length || cloudCosts.length) ? ' (non-labour costs table not yet available — run migration)' : '') +
        '.'
    });

  } catch (error) {
    console.error('Cost confirm error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
