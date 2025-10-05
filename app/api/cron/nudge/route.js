import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function GET() {
  const { data: projects, error } = await supabaseAdmin
    .from('projects')
    .select('id,name,project_token,participants,inbound_email_local')
    .is('deleted_at', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const messages = [];
  for (const p of (projects || [])) {
    for (const to of (p.participants || [])) {
      messages.push({
        to,
        from: process.env.FROM_EMAIL,
        replyTo: `${p.inbound_email_local}@${process.env.PUBLIC_INBOUND_DOMAIN}`,
        subject: `[${p.name}] Quick R&D check-in`,
        text: [
          `What experiment or technical hurdle did you touch since last prompt?`,
          `Reply to this email with 1–3 lines and any screenshots/logs.`,
          `Or post a quick note: ${process.env.NEXT_PUBLIC_BASE}/p/${p.project_token}`
        ].join('\n\n'),
      });
    }
  }

  for (const msg of messages) {
    try { await sgMail.send(msg); } catch (e) { console.error(e?.response?.body || e.message); }
  }

  return NextResponse.json({ sent: messages.length });
}