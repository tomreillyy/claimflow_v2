import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyUserAndProjectAccess } from '@/lib/serverAuth';
import { rateLimitMiddleware, getClientIp, RATE_LIMITS } from '@/lib/rateLimit';

export async function DELETE(req, { params }) {
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
    console.error('[Evidence/Delete] Access denied:', accessError);
    return NextResponse.json({
      error: 'Unauthorized - you must be a project participant to delete evidence'
    }, { status: 403 });
  }

  const { evidence_id } = await req.json();

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
