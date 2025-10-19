import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function PATCH(req, { params }) {
  const token = params.token;
  const { evidence_id, activity_type } = await req.json();

  // Validate activity_type
  const validTypes = ['core', 'supporting'];
  if (!validTypes.includes(activity_type)) {
    return NextResponse.json({ error: 'Invalid activity type. Must be "core" or "supporting"' }, { status: 400 });
  }

  // Verify project exists via token
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('id')
    .eq('project_token', token)
    .is('deleted_at', null)
    .single();

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Verify evidence belongs to this project
  const { data: evidence } = await supabaseAdmin
    .from('evidence')
    .select('id')
    .eq('id', evidence_id)
    .eq('project_id', project.id)
    .single();

  if (!evidence) {
    return NextResponse.json({ error: 'Evidence not found' }, { status: 404 });
  }

  // Update the activity type with manual source
  const { error } = await supabaseAdmin
    .from('evidence')
    .update({
      activity_type,
      activity_type_source: 'manual',
      activity_type_classified_at: new Date().toISOString()
    })
    .eq('id', evidence_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  console.log('[SetActivityType] Manual override:', { evidence_id, activity_type, project_id: project.id });

  return NextResponse.json({ ok: true });
}
