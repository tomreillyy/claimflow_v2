import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function DELETE(req, { params }) {
  const token = params.token;
  const { evidence_id } = await req.json();

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

  // Soft delete the evidence
  const { error } = await supabaseAdmin
    .from('evidence')
    .update({ soft_deleted: true })
    .eq('id', evidence_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
