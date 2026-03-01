import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyCronSecret } from '@/lib/serverAuth';
import { sendEmail, getAppUrl } from '@/lib/email';

export async function GET(req) {
  // Verify cron secret to prevent unauthorized triggering
  if (!verifyCronSecret(req)) {
    console.error('[Cron/Nudge] Unauthorized access attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: projects, error } = await supabaseAdmin
    .from('projects')
    .select('id,name,project_token,participants,inbound_email_local')
    .is('deleted_at', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const messages = [];
  for (const p of (projects || [])) {
    for (const to of (p.participants || [])) {
      const projectUrl = `${getAppUrl()}/p/${p.project_token}`;
      messages.push({
        to,
        subject: `[${p.name}] Quick R&D check-in`,
        ctaUrl: projectUrl,
        ctaLabel: 'Post a quick note',
        text: [
          `What experiment or technical hurdle did you touch since last prompt?`,
          `Reply to this email with 1–3 lines and any screenshots/logs.`,
          `Or post a quick note: ${projectUrl}`
        ].join('\n\n'),
      });
    }
  }

  for (const msg of messages) {
    try { await sendEmail(msg); } catch (e) { console.error(e.message); }
  }

  // Trigger auto-linking for all projects (periodic maintenance)
  let linkedCount = 0;
  for (const project of (projects || [])) {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/evidence/auto-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: project.id })
      });

      if (response.ok) {
        const data = await response.json();
        linkedCount += data.linked || 0;
      }
    } catch (err) {
      console.error(`[Cron] Auto-link failed for project ${project.id}:`, err.message);
    }
  }

  return NextResponse.json({ sent: messages.length, linked: linkedCount });
}