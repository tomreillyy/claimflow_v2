import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { parsePayrollFile, convertDateToISO } from '@/lib/payrollParser';

export async function POST(req, { params }) {
  try {
    const { token } = await params;
    const body = await req.json();
    const { uploadId, mapping, dateFormat } = body;

    if (!uploadId || !mapping) {
      return NextResponse.json({
        error: 'Missing uploadId or mapping'
      }, { status: 400 });
    }

    // Get project
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('project_token', token)
      .is('deleted_at', null)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get upload record
    const { data: upload } = await supabaseAdmin
      .from('payroll_uploads')
      .select('*')
      .eq('id', uploadId)
      .eq('project_id', project.id)
      .single();

    if (!upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
    }

    // Update mapping in upload record
    await supabaseAdmin
      .from('payroll_uploads')
      .update({
        mapping_json: mapping,
        status: 'processing'
      })
      .eq('id', uploadId);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('payroll')
      .download(upload.storage_path);

    if (downloadError) {
      console.error('Storage download error:', downloadError);
      await markUploadError(uploadId, 'Failed to download file from storage');
      return NextResponse.json({
        error: 'Failed to retrieve uploaded file'
      }, { status: 500 });
    }

    // Parse file again
    const file = new File([fileData], upload.filename, { type: upload.mime_type });
    let parsed;
    try {
      parsed = await parsePayrollFile(file);
    } catch (parseError) {
      await markUploadError(uploadId, `Parse error: ${parseError.message}`);
      return NextResponse.json({
        error: `Failed to parse file: ${parseError.message}`
      }, { status: 400 });
    }

    const { rows } = parsed;

    // Process rows and aggregate by person+month
    const aggregatedData = new Map(); // key: person_identifier|month
    const processedMonths = new Set();
    const processedPeople = new Set();

    for (const row of rows) {
      try {
        // Extract fields using mapping
        const employeeEmail = mapping.employee_email ? String(row[mapping.employee_email] || '').trim() : null;
        const employeeId = mapping.employee_id ? String(row[mapping.employee_id] || '').trim() : null;
        const employeeName = mapping.employee_name ? String(row[mapping.employee_name] || '').trim() : null;

        const personIdentifier = employeeEmail || employeeId;

        if (!personIdentifier) {
          console.warn('Skipping row with no email or ID:', row);
          continue;
        }

        // Parse amounts
        const grossWages = parseFloat(mapping.gross_wages ? row[mapping.gross_wages] : 0) || 0;
        const superannuation = parseFloat(mapping.superannuation ? row[mapping.superannuation] : 0) || 0;
        const onCosts = parseFloat(mapping.on_costs ? row[mapping.on_costs] : 0) || 0;

        if (grossWages < 0 || superannuation < 0 || onCosts < 0) {
          console.warn('Skipping row with negative amounts:', row);
          continue;
        }

        // Parse pay_date
        let payDateRaw = mapping.pay_date ? row[mapping.pay_date] : null;
        if (!payDateRaw) {
          console.warn('Skipping row with no pay_date:', row);
          continue;
        }

        // Convert date to ISO
        const payDateISO = convertDateToISO(payDateRaw, dateFormat || 'YYYY-MM-DD');
        if (!payDateISO) {
          console.warn('Skipping row with invalid pay_date:', payDateRaw);
          continue;
        }

        // Extract month (first day of month)
        const payDate = new Date(payDateISO);
        const month = new Date(payDate.getFullYear(), payDate.getMonth(), 1)
          .toISOString()
          .split('T')[0];

        processedMonths.add(month);
        processedPeople.add(personIdentifier);

        // Aggregate by person+month
        const key = `${personIdentifier}|${month}`;

        if (!aggregatedData.has(key)) {
          aggregatedData.set(key, {
            personIdentifier,
            employeeEmail,
            employeeName,
            month,
            grossWages: 0,
            superannuation: 0,
            onCosts: 0
          });
        }

        const agg = aggregatedData.get(key);
        agg.grossWages += grossWages;
        agg.superannuation += superannuation;
        agg.onCosts += onCosts;

      } catch (rowError) {
        console.error('Error processing row:', rowError, row);
        continue;
      }
    }

    // Build basis text
    let basisText = `Payroll report ${upload.filename} (uploaded ${new Date(upload.uploaded_at).toLocaleDateString()})`;
    const assumptions = [];

    if (!mapping.superannuation) assumptions.push('super defaulted to 0');
    if (!mapping.on_costs) assumptions.push('on-costs defaulted to 0');
    if (!mapping.pay_period_start || !mapping.pay_period_end) {
      assumptions.push('aggregated by month');
    }

    if (assumptions.length > 0) {
      basisText += ` [${assumptions.join(', ')}]`;
    }

    // Convert aggregated data to ledger entries
    const ledgerEntries = Array.from(aggregatedData.values()).map(agg => ({
      project_id: project.id,
      month: agg.month,
      person_email: agg.employeeEmail || null,
      person_identifier: agg.personIdentifier,
      person_name: agg.employeeName,
      activity_id: null, // Unapportioned
      gross_wages: agg.grossWages,
      superannuation: agg.superannuation,
      on_costs: agg.onCosts,
      total_amount: agg.grossWages + agg.superannuation + agg.onCosts,
      apportionment_percent: null,
      apportionment_hours: null,
      basis_text: basisText,
      source_upload_id: uploadId
    }));

    if (ledgerEntries.length === 0) {
      await markUploadError(uploadId, 'No valid rows could be processed');
      return NextResponse.json({
        error: 'No valid data rows found after processing'
      }, { status: 400 });
    }

    // Check for existing ledger entries from this month (to replace)
    const monthsArray = Array.from(processedMonths);
    const { data: existingEntries } = await supabaseAdmin
      .from('cost_ledger')
      .select('id, month, source_upload_id')
      .eq('project_id', project.id)
      .in('month', monthsArray);

    // Delete old entries from replaced uploads
    if (existingEntries && existingEntries.length > 0) {
      const oldUploadIds = new Set(existingEntries.map(e => e.source_upload_id).filter(Boolean));

      // Delete old ledger entries
      await supabaseAdmin
        .from('cost_ledger')
        .delete()
        .eq('project_id', project.id)
        .in('month', monthsArray);

      // Mark old uploads as replaced
      for (const oldUploadId of oldUploadIds) {
        if (oldUploadId !== uploadId) {
          await supabaseAdmin
            .from('payroll_uploads')
            .update({ replaced_upload_id: uploadId })
            .eq('id', oldUploadId);
        }
      }
    }

    // Insert new ledger entries
    const { error: insertError } = await supabaseAdmin
      .from('cost_ledger')
      .insert(ledgerEntries);

    if (insertError) {
      console.error('Ledger insert error:', insertError);
      await markUploadError(uploadId, `Failed to insert ledger entries: ${insertError.message}`);
      return NextResponse.json({
        error: 'Failed to save cost ledger entries'
      }, { status: 500 });
    }

    // Mark upload as completed
    await supabaseAdmin
      .from('payroll_uploads')
      .update({ status: 'completed' })
      .eq('id', uploadId);

    // Return summary
    return NextResponse.json({
      ok: true,
      summary: {
        rowsProcessed: rows.length,
        ledgerEntriesCreated: ledgerEntries.length,
        peopleCount: processedPeople.size,
        monthsCount: processedMonths.size,
        months: Array.from(processedMonths).sort()
      },
      message: `Processed ${ledgerEntries.length} lines → ${processedPeople.size} people across ${processedMonths.size} month(s).`
    });

  } catch (error) {
    console.error('Payroll confirm error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

async function markUploadError(uploadId, errorMessage) {
  await supabaseAdmin
    .from('payroll_uploads')
    .update({
      status: 'error',
      error_message: errorMessage
    })
    .eq('id', uploadId);
}
