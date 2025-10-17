import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validateFileUpload, sanitizeFilename, verifyUserAndProjectAccess } from '@/lib/serverAuth';
import { rateLimitMiddleware, getClientIp, RATE_LIMITS } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE_MB = 10;
const ALLOWED_FILE_TYPES = [
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'application/pdf',
  'text/csv', 'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

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
    console.error('[Evidence/Upload] Access denied:', accessError);
    return NextResponse.json({
      error: 'Unauthorized - you must be a project participant to upload evidence'
    }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get('file');
  const author_email = form.get('author_email') || null;

  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 });

  // Validate file before processing
  const validation = await validateFileUpload(file, {
    maxSizeMB: MAX_FILE_SIZE_MB,
    allowedMimeTypes: ALLOWED_FILE_TYPES,
    checkMagicBytes: true
  });

  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Sanitize filename to prevent path traversal attacks
  const sanitizedName = sanitizeFilename(file.name);
  const path = `${project.id}/${Date.now()}_${sanitizedName}`;

  const { data: uploaded, error: uploadErr } = await supabaseAdmin
    .storage.from('evidence')
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 400 });

  // Store the storage path, not a public URL (bucket is now private)
  const { error } = await supabaseAdmin.from('evidence').insert({
    project_id: project.id,
    author_email,
    file_url: uploaded.path, // Store storage path for private bucket
    source: 'upload'
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, path: uploaded.path });
}