import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validateFileUpload, sanitizeFilename, verifyUserAndProjectAccess } from '@/lib/serverAuth';
import { rateLimitMiddleware, getClientIp, RATE_LIMITS } from '@/lib/rateLimit';
import { extractText } from '@/lib/textExtractor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE_MB = 25;
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain', 'text/csv',
  'image/png', 'image/jpeg', 'image/gif', 'image/webp'
];

export async function POST(req, { params }) {
  const token = params.token;

  // Rate limit
  const clientIp = getClientIp(req);
  const rateLimitResponse = await rateLimitMiddleware(req, [
    { identifier: clientIp, config: RATE_LIMITS.KNOWLEDGE_PER_IP, name: 'per-ip' },
    { identifier: token, config: RATE_LIMITS.KNOWLEDGE_PER_PROJECT, name: 'per-project' }
  ]);
  if (rateLimitResponse) return rateLimitResponse;

  // Auth
  const { user, project, error: accessError } = await verifyUserAndProjectAccess(req, token);
  if (accessError || !project) {
    return NextResponse.json({
      error: 'Unauthorized - you must be a project participant to upload documents'
    }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 });

  // Validate
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

  // Upload to storage
  const sanitizedName = sanitizeFilename(file.name);
  const storagePath = `${project.id}/${Date.now()}_${sanitizedName}`;

  const { data: uploaded, error: uploadErr } = await supabaseAdmin
    .storage.from('knowledge')
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });

  if (uploadErr) {
    console.error('[Knowledge/Upload] Storage error:', uploadErr);
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  // Extract text for search indexing
  const extraction = await extractText(buffer, file.type);

  // Insert metadata + extracted text into DB
  const { data: doc, error: dbError } = await supabaseAdmin
    .from('project_documents')
    .insert({
      project_id: project.id,
      uploaded_by: user.id,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      storage_path: uploaded.path,
      extracted_text: extraction.text,
      extraction_status: extraction.status,
      extraction_error: extraction.error
    })
    .select('id, file_name, file_type, file_size, extraction_status, created_at')
    .single();

  if (dbError) {
    console.error('[Knowledge/Upload] DB error:', dbError);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, document: doc });
}
