import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyUserAndProjectAccess } from '@/lib/serverAuth';
import { rateLimitMiddleware, getClientIp, RATE_LIMITS } from '@/lib/rateLimit';

export async function POST(req, { params }) {
  const token = params.token;

  // Apply rate limiting (per-IP + per-project)
  const clientIp = getClientIp(req);
  const rateLimitResponse = await rateLimitMiddleware(req, [
    { identifier: clientIp, config: RATE_LIMITS.EVIDENCE_PER_IP, name: 'per-ip' },
    { identifier: token, config: RATE_LIMITS.EVIDENCE_PER_PROJECT, name: 'per-project' }
  ]);

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Verify user is authenticated and has access to this project
  const { user, project, error: accessError } = await verifyUserAndProjectAccess(req, token);

  if (accessError || !project) {
    console.error('[Evidence/Add] Access denied:', accessError);
    return NextResponse.json({
      error: 'Unauthorized - you must be a project participant to add evidence'
    }, { status: 403 });
  }

  const { author_email, content, category } = await req.json();

  const { data: newEvidence, error } = await supabaseAdmin.from('evidence').insert({
    project_id: project.id,
    author_email: author_email || null,
    content: content || null,
    category: category || null,
    source: 'note'
  }).select('id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Trigger auto-linking and classification in background (don't await)
  if (newEvidence?.id) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Trigger auto-link
    fetch(`${baseUrl}/api/evidence/auto-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: project.id,
        evidence_ids: [newEvidence.id]
      })
    }).catch(err => console.error('[Add] Auto-link trigger failed:', err.message));

    // Trigger activity type classification
    fetch(`${baseUrl}/api/evidence/classify-activity-type?id=${newEvidence.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).catch(err => console.error('[Add] Activity type classification failed:', err.message));
  }

  return NextResponse.json({ ok: true, id: newEvidence.id });
}