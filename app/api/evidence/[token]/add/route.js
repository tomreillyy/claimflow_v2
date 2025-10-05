import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req, { params }) {
  const token = params.token;
  const { author_email, content, category } = await req.json();

  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('id')
    .eq('project_token', token)
    .is('deleted_at', null)
    .single();

  if (!project) return NextResponse.json({ error: 'project not found' }, { status: 404 });

  const { data: newEvidence, error } = await supabaseAdmin.from('evidence').insert({
    project_id: project.id,
    author_email: author_email || null,
    content: content || null,
    category: category || null,
    source: 'note'
  }).select('id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, id: newEvidence.id });
}