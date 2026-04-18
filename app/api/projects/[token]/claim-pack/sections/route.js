import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyUserAndProjectAccess } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/[token]/claim-pack/sections
 *
 * Fetch all claim pack sections for a project (by token).
 * Returns sections keyed by section_key.
 */
export async function GET(req, { params }) {
  const { token } = await params;

  const { user, project, error: authError } = await verifyUserAndProjectAccess(req, token);
  if (authError) {
    const status = !user ? 401 : 403;
    return NextResponse.json({ error: authError }, { status });
  }

  const { data: rows, error } = await supabaseAdmin
    .from('claim_pack_sections')
    .select('section_key, content, ai_generated, last_edited_at, last_edited_by, version')
    .eq('project_id', project.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sections = {};
  (rows || []).forEach(row => {
    sections[row.section_key] = {
      content: row.content,
      ai_generated: row.ai_generated,
      last_edited_at: row.last_edited_at,
      last_edited_by: row.last_edited_by,
      version: row.version,
    };
  });

  return NextResponse.json({ projectId: project.id, sections });
}
