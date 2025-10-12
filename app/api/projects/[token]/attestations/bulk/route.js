import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req, { params }) {
  try {
    const { token } = await params;
    const {
      personIdentifier,
      personEmail,
      activityId,
      amountType,
      amountValue,
      oldActivityId
    } = await req.json();

    // Get project ID from token
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('project_token', token)
      .is('deleted_at', null)
      .single();

    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    // If oldActivityId is provided, we're changing the activity - delete old and create new
    if (oldActivityId && oldActivityId !== activityId) {
      // Delete all attestations for this person + old activity
      await supabaseAdmin
        .from('monthly_attestations')
        .delete()
        .eq('project_id', project.id)
        .eq('person_identifier', personIdentifier)
        .eq('activity_id', oldActivityId);
    }

    // Get all unique months for this person from cost_ledger
    const { data: ledgerMonths } = await supabaseAdmin
      .from('cost_ledger')
      .select('month')
      .eq('project_id', project.id)
      .eq('person_identifier', personIdentifier);

    if (!ledgerMonths || ledgerMonths.length === 0) {
      return Response.json({ error: 'No payroll data found for this person' }, { status: 400 });
    }

    const uniqueMonths = [...new Set(ledgerMonths.map(m => m.month))];

    // Upsert attestation for each month
    const attestations = uniqueMonths.map(month => ({
      project_id: project.id,
      person_identifier: personIdentifier,
      person_email: personEmail,
      month,
      activity_id: activityId,
      amount_type: amountType,
      amount_value: amountValue
    }));

    const { error } = await supabaseAdmin
      .from('monthly_attestations')
      .upsert(attestations, {
        onConflict: 'project_token,person_identifier,month,activity_id'
      });

    if (error) throw error;

    return Response.json({ success: true });
  } catch (error) {
    console.error('Bulk attestation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { token } = await params;
    const { personIdentifier, activityId } = await req.json();

    // Get project ID from token
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('project_token', token)
      .is('deleted_at', null)
      .single();

    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from('monthly_attestations')
      .delete()
      .eq('project_id', project.id)
      .eq('person_identifier', personIdentifier)
      .eq('activity_id', activityId);

    if (error) throw error;

    return Response.json({ success: true });
  } catch (error) {
    console.error('Bulk delete error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
