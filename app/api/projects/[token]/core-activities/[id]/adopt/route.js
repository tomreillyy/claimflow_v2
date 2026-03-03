import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedUser } from '@/lib/serverAuth';

export async function POST(req, { params }) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError) return NextResponse.json({ error: authError }, { status: 401 });

    const { id } = await params;

    // Fetch activity
    const { data: activity, error: fetchErr } = await supabaseAdmin
      .from('core_activities')
      .select('id, project_id, status')
      .eq('id', id)
      .single();

    if (fetchErr || !activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    if (activity.status === 'adopted') {
      return NextResponse.json({ error: 'Activity is already adopted' }, { status: 400 });
    }

    // Check step coverage: at least 3 distinct steps must have linked evidence
    const { data: stepData } = await supabaseAdmin
      .from('activity_evidence')
      .select('systematic_step')
      .eq('activity_id', id);

    const coveredSteps = new Set((stepData || []).map(r => r.systematic_step));
    if (coveredSteps.size < 3) {
      return NextResponse.json({
        error: 'At least 3 systematic steps must have linked evidence before adopting',
        covered: coveredSteps.size,
        steps: [...coveredSteps]
      }, { status: 400 });
    }

    // Adopt the activity
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('core_activities')
      .update({
        status: 'adopted',
        adopted_at: new Date().toISOString(),
        adopted_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Adopt activity error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
