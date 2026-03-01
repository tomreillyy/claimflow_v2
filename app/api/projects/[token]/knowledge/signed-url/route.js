import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSignedStorageUrl, verifyUserAndProjectAccess } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req, { params }) {
  const token = params.token;

  const { user, project, error: accessError } = await verifyUserAndProjectAccess(req, token);
  if (accessError || !project) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { document_ids } = body;

  if (!document_ids || !Array.isArray(document_ids) || document_ids.length === 0) {
    return NextResponse.json({ error: 'document_ids array required' }, { status: 400 });
  }

  if (document_ids.length > 50) {
    return NextResponse.json({ error: 'Maximum 50 document IDs per request' }, { status: 400 });
  }

  // Fetch documents belonging to this project
  const { data: docs, error: fetchError } = await supabaseAdmin
    .from('project_documents')
    .select('id, storage_path')
    .eq('project_id', project.id)
    .eq('soft_deleted', false)
    .in('id', document_ids);

  if (fetchError) {
    console.error('[Knowledge/SignedURL] DB error:', fetchError);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }

  const signedUrls = {};
  for (const doc of (docs || [])) {
    const { signedUrl, error } = await getSignedStorageUrl(doc.storage_path, 'knowledge', 3600);
    if (!error && signedUrl) {
      signedUrls[doc.id] = signedUrl;
    }
  }

  return NextResponse.json({ signedUrls });
}
