import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getLocalPartToAddress(toField) {
  // toField can be like: "p_ab12cd34@mail.domain.com, other@x.com"
  if (!toField) return null;
  const first = String(toField).split(',')[0].trim();
  const addr = first.split('<').pop().split('>').shift().trim(); // handle "Name <addr>"
  const local = addr.split('@')[0];
  return local || null;
}

export async function POST(req) {
  const form = await req.formData();

  const to = form.get('to');           // e.g. "p_ab12cd34@mail.domain.com"
  const from = form.get('from');       // string
  const text = form.get('text') || ''; // plain text body (SendGrid provides)
  const attachmentsCount = Number(form.get('attachments') || 0);

  const inboundLocal = getLocalPartToAddress(to);
  if (!inboundLocal) return NextResponse.json({ error: 'no to address' }, { status: 400 });

  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('id')
    .eq('inbound_email_local', inboundLocal)
    .single();

  if (!project) return NextResponse.json({ error: 'project not found' }, { status: 404 });

  // Save text body as an evidence item (if any)
  if (String(text).trim().length > 0) {
    await supabaseAdmin.from('evidence').insert({
      project_id: project.id,
      author_email: from || null,
      content: text
    });
  }

  // Save attachments (attachment1..attachmentN)
  for (let i = 1; i <= attachmentsCount; i++) {
    const file = form.get(`attachment${i}`);
    if (!file) continue;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const path = `${project.id}/${Date.now()}_${file.name}`;
    const { data: uploaded, error: uploadErr } = await supabaseAdmin
      .storage.from('evidence').upload(path, buffer, { contentType: file.type, upsert: false });
    if (uploadErr) continue;
    const { data: publicUrl } = supabaseAdmin.storage.from('evidence').getPublicUrl(uploaded.path);
    await supabaseAdmin.from('evidence').insert({
      project_id: project.id,
      author_email: from || null,
      file_url: publicUrl.publicUrl
    });
  }

  return NextResponse.json({ ok: true });
}