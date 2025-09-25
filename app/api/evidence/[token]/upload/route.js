import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req, { params }) {
  const token = params.token;
  const form = await req.formData();
  const file = form.get('file');
  const author_email = form.get('author_email') || null;

  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 });

  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('id')
    .eq('project_token', token)
    .single();
  if (!project) return NextResponse.json({ error: 'project not found' }, { status: 404 });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const path = `${project.id}/${Date.now()}_${file.name}`;

  const { data: uploaded, error: uploadErr } = await supabaseAdmin
    .storage.from('evidence')
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 400 });

  const { data: publicUrl } = supabaseAdmin.storage.from('evidence').getPublicUrl(uploaded.path);

  const { error } = await supabaseAdmin.from('evidence').insert({
    project_id: project.id,
    author_email,
    file_url: publicUrl.publicUrl
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, url: publicUrl.publicUrl });
}