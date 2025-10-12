import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req, { params }) {
  try {
    const { token } = await params;
    const { personName, personEmail, month, totalAmount } = await req.json();

    // Get project
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('project_token', token)
      .is('deleted_at', null)
      .single();

    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    // Convert month from YYYY-MM to YYYY-MM-01 format
    const monthDate = `${month}-01`;

    // Check if entry already exists
    const { data: existing } = await supabaseAdmin
      .from('cost_ledger')
      .select('id')
      .eq('project_id', project.id)
      .eq('person_identifier', personEmail)
      .eq('month', monthDate)
      .maybeSingle();

    if (existing) {
      return Response.json({ error: 'Entry already exists for this person and month' }, { status: 400 });
    }

    // Insert into cost_ledger
    const { error } = await supabaseAdmin
      .from('cost_ledger')
      .insert({
        project_id: project.id,
        month: monthDate,
        person_email: personEmail,
        person_identifier: personEmail,
        person_name: personName,
        activity_id: null,
        gross_wages: totalAmount,
        superannuation: 0,
        on_costs: 0,
        total_amount: totalAmount,
        apportionment_percent: null,
        apportionment_hours: null,
        basis_text: 'Manual entry',
        source_upload_id: null
      });

    if (error) throw error;

    return Response.json({ success: true });
  } catch (error) {
    console.error('Manual entry error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
