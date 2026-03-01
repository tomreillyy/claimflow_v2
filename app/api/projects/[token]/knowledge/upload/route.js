import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validateFileUpload, sanitizeFilename, getAuthenticatedUser } from '@/lib/serverAuth';
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
  const { token } = await params;

  // Rate limit
  const clientIp = getClientIp(req);
  const rateLimitResponse = await rateLimitMiddleware(req, [
    { identifier: clientIp, config: RATE_LIMITS.KNOWLEDGE_PER_IP, name: 'per-ip' },
    { identifier: token, config: RATE_LIMITS.KNOWLEDGE_PER_PROJECT, name: 'per-project' }
  ]);
  if (rateLimitResponse) return rateLimitResponse;

  // Get project by token
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('id, owner_id')
    .eq('project_token', token)
    .is('deleted_at', null)
    .single();

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Try to get authenticated user (optional — fall back to project owner)
  let userId = project.owner_id;
  let userEmail = 'unknown';
  try {
    const { user } = await getAuthenticatedUser(req);
    if (user) {
      userId = user.id;
      userEmail = user.email;
    }
  } catch (e) {
    // No auth, use project owner
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
      uploaded_by: userId,
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

  // Dual-write: create evidence record so document flows into timeline + claim pack
  if (extraction.status === 'completed' && extraction.text) {
    const evidenceContent = `[Document: ${file.name}]\n\n${extraction.text.substring(0, 2000).trim()}`;

    const { error: evidenceError } = await supabaseAdmin
      .from('evidence')
      .insert({
        project_id: project.id,
        author_email: userEmail,
        content: evidenceContent,
        file_url: uploaded.path,
        source: 'document',
        document_id: doc.id,
        meta: {
          document_id: doc.id,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_bucket: 'knowledge'
        }
      });

    if (evidenceError) {
      console.error('[Knowledge/Upload] Evidence dual-write error:', evidenceError);
    }
  }

  return NextResponse.json({ ok: true, document: doc });
}
