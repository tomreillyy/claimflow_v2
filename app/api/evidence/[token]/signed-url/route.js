import { NextResponse } from 'next/server';
import { getSignedStorageUrl } from '@/lib/serverAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Generate signed URLs for private evidence files
 * POST /api/evidence/[token]/signed-url
 * Body: { evidence_ids: string[] } or { storage_path: string }
 */
export async function POST(req, { params }) {
  const token = params.token;

  try {
    const body = await req.json();
    const { evidence_ids, storage_path } = body;

    // Validate project token exists
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('project_token', token)
      .is('deleted_at', null)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Handle single storage_path request
    if (storage_path) {
      const { signedUrl, error } = await getSignedStorageUrl(storage_path, 'evidence', 3600);

      if (error) {
        return NextResponse.json({ error }, { status: 500 });
      }

      return NextResponse.json({ signedUrl });
    }

    // Handle batch evidence_ids request
    if (evidence_ids && Array.isArray(evidence_ids) && evidence_ids.length > 0) {
      // Limit to 50 IDs per request to prevent abuse
      if (evidence_ids.length > 50) {
        return NextResponse.json({
          error: 'Maximum 50 evidence IDs per request'
        }, { status: 400 });
      }

      // Fetch evidence records for this project
      const { data: evidenceList, error: evidenceError } = await supabaseAdmin
        .from('evidence')
        .select('id, file_url')
        .eq('project_id', project.id)
        .in('id', evidence_ids)
        .not('file_url', 'is', null);

      if (evidenceError) {
        console.error('[SignedURL] Error fetching evidence:', evidenceError);
        return NextResponse.json({ error: 'Failed to fetch evidence' }, { status: 500 });
      }

      // Generate signed URLs for each evidence file
      const signedUrls = {};

      for (const evidence of evidenceList) {
        const { signedUrl, error } = await getSignedStorageUrl(evidence.file_url, 'evidence', 3600);

        if (!error && signedUrl) {
          signedUrls[evidence.id] = signedUrl;
        } else {
          console.error(`[SignedURL] Failed to generate URL for evidence ${evidence.id}:`, error);
        }
      }

      return NextResponse.json({ signedUrls });
    }

    return NextResponse.json({
      error: 'Either evidence_ids or storage_path is required'
    }, { status: 400 });

  } catch (error) {
    console.error('[SignedURL] Exception:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
