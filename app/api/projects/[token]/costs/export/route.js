import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET - Export cost ledger as CSV
export async function GET(req, { params }) {
  try {
    const { token } = await params;

    // Get project
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id, name, year')
      .eq('project_token', token)
      .is('deleted_at', null)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch cost ledger with details
    const { data: ledger, error: ledgerError } = await supabaseAdmin
      .from('cost_ledger')
      .select(`
        *,
        activity:core_activities(name),
        upload:payroll_uploads(filename, uploaded_at)
      `)
      .eq('project_id', project.id)
      .order('month', { ascending: true })
      .order('person_identifier', { ascending: true });

    if (ledgerError) {
      console.error('Cost ledger fetch error:', ledgerError);
      return NextResponse.json({
        error: 'Failed to fetch cost ledger'
      }, { status: 500 });
    }

    if (!ledger || ledger.length === 0) {
      return NextResponse.json({
        error: 'No cost data available'
      }, { status: 404 });
    }

    // Generate CSV
    const headers = [
      'Month',
      'Person Email',
      'Person Name',
      'Activity',
      'Apportionment %',
      'Apportionment Hours',
      'Gross Wages',
      'Superannuation',
      'On-Costs',
      'Total Amount',
      'Basis',
      'Source File',
      'Upload Date'
    ];

    const rows = ledger.map(entry => [
      entry.month,
      entry.person_email || entry.person_identifier,
      entry.person_name || '',
      entry.activity?.name || 'Unapportioned',
      entry.apportionment_percent || '',
      entry.apportionment_hours || '',
      entry.gross_wages || 0,
      entry.superannuation || 0,
      entry.on_costs || 0,
      entry.total_amount || 0,
      entry.basis_text || '',
      entry.upload?.filename || '',
      entry.upload?.uploaded_at ? new Date(entry.upload.uploaded_at).toLocaleDateString() : ''
    ]);

    // Build CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        // Escape commas and quotes
        const str = String(cell);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(','))
    ].join('\n');

    // Return CSV response
    const filename = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_costs_${project.year}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

  } catch (error) {
    console.error('Costs export error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
