import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validateFileUpload, sanitizeFilename, getAuthenticatedUser } from '@/lib/serverAuth';
import { rateLimitMiddleware, getClientIp, RATE_LIMITS } from '@/lib/rateLimit';
import { extractText } from '@/lib/textExtractor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Generate an RDTI-focused summary of a document using OpenAI.
 * Extracts technical uncertainty, hypothesis, and approach instead of dumping raw text.
 */
async function generateRDTISummary(fileName, extractedText) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('No OpenAI API key');
  }

  const truncatedText = extractedText.substring(0, 6000);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an Australian R&D Tax Incentive (RDTI) specialist. You extract RDTI-relevant information from project documents to build evidence for R&D claims under ITAA 1997 s.355-25.`
        },
        {
          role: 'user',
          content: `Analyse this document and extract a structured RDTI evidence summary. Focus on what matters for an Australian R&D Tax Incentive claim.

Document: ${fileName}

---
${truncatedText}
---

Write a concise summary (200-400 words) with these sections (skip any that don't apply):

**Document: ${fileName}**

**Technical Uncertainty:** What technical unknowns or challenges does this document identify? What couldn't be determined by a competent professional using existing knowledge?

**Hypothesis:** What testable propositions or approaches are proposed to resolve the uncertainty?

**Experimental Approach:** What systematic methods, tests, prototypes, or experiments are planned or described?

**Key Technical Details:** Any specific technical decisions, architecture choices, or constraints relevant to the R&D claim.

**RDTI Relevance:** Which part of the systematic progression does this document primarily support (Hypothesis/Experiment/Observation/Evaluation/Conclusion)?

Be factual and specific. Reference actual content from the document. Do not invent details.`
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    }),
    signal: AbortSignal.timeout(20000)
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error('Empty response from OpenAI');
  }

  return content;
}

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

  // Dual-write: create evidence record so document appears on timeline + feeds claim pack
  // Generate RDTI-focused summary instead of dumping raw text
  let evidenceContent = `[Document: ${file.name}]`;

  if (extraction.text) {
    try {
      const rdtiSummary = await generateRDTISummary(file.name, extraction.text);
      evidenceContent = rdtiSummary;
    } catch (err) {
      console.error('[Knowledge/Upload] RDTI summary failed, using fallback:', err.message);
      evidenceContent = `[Document: ${file.name}]\n\n${extraction.text.substring(0, 2000).trim()}`;
    }
  }

  const { data: newEvidence, error: evidenceError } = await supabaseAdmin
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
    })
    .select('id')
    .single();

  if (evidenceError) {
    console.error('[Knowledge/Upload] Evidence dual-write error:', evidenceError);
  }

  // Trigger auto-classification in background (don't await)
  if (newEvidence?.id) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Classify systematic step (Hypothesis/Experiment/etc.)
    fetch(`${baseUrl}/api/classify?id=${newEvidence.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).catch(err => console.error('[Knowledge/Upload] Step classification failed:', err.message));

    // Auto-link to core activities
    fetch(`${baseUrl}/api/evidence/auto-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: project.id,
        evidence_ids: [newEvidence.id]
      })
    }).catch(err => console.error('[Knowledge/Upload] Auto-link failed:', err.message));

    // Classify activity type (core vs supporting)
    fetch(`${baseUrl}/api/evidence/classify-activity-type?id=${newEvidence.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).catch(err => console.error('[Knowledge/Upload] Activity type classification failed:', err.message));
  }

  return NextResponse.json({ ok: true, document: doc });
}
