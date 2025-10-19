import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedUser } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/claim-pack-sections/[projectId]/[sectionKey]
 *
 * Fetch a specific claim pack section
 *
 * Response:
 * {
 *   "section_key": "project_overview",
 *   "content": "This project addresses...",
 *   "ai_generated": false,
 *   "last_edited_at": "2025-01-18T10:30:00Z",
 *   "last_edited_by": "user@example.com",
 *   "version": 3
 * }
 */
export async function GET(req, { params }) {
  const { projectId, sectionKey } = params;

  // Verify user authentication
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Verify user has access to this project
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('owner_id, participants')
      .eq('id', projectId)
      .is('deleted_at', null)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const hasAccess = project.owner_id === user.id ||
      (project.participants && project.participants.includes(user.email));

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch section
    const { data: section, error: fetchError } = await supabaseAdmin
      .from('claim_pack_sections')
      .select('*')
      .eq('project_id', projectId)
      .eq('section_key', sectionKey)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
      throw fetchError;
    }

    if (!section) {
      // Section doesn't exist yet - return empty state
      return NextResponse.json({
        section_key: sectionKey,
        content: null,
        ai_generated: null,
        last_edited_at: null,
        last_edited_by: null,
        version: 0
      });
    }

    return NextResponse.json({
      section_key: section.section_key,
      content: section.content,
      ai_generated: section.ai_generated,
      last_edited_at: section.last_edited_at,
      last_edited_by: section.last_edited_by,
      version: section.version
    });

  } catch (error) {
    console.error('[ClaimPackSections] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/claim-pack-sections/[projectId]/[sectionKey]
 *
 * Update a claim pack section (auto-save from UI)
 *
 * Request body:
 * {
 *   "content": "Updated text...",
 *   "last_edited_by": "user@example.com"
 * }
 *
 * Response:
 * {
 *   "ok": true,
 *   "section_key": "project_overview",
 *   "version": 4,
 *   "ai_generated": false
 * }
 */
export async function PATCH(req, { params }) {
  const { projectId, sectionKey } = params;

  // Verify user authentication
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Verify user has access to this project
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('owner_id, participants')
      .eq('id', projectId)
      .is('deleted_at', null)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const hasAccess = project.owner_id === user.id ||
      (project.participants && project.participants.includes(user.email));

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await req.json();
    const { content } = body;

    if (content === undefined) {
      return NextResponse.json({ error: 'Missing content field' }, { status: 400 });
    }

    // Get current version
    const { data: existing } = await supabaseAdmin
      .from('claim_pack_sections')
      .select('version')
      .eq('project_id', projectId)
      .eq('section_key', sectionKey)
      .single();

    const newVersion = (existing?.version || 0) + 1;

    // Upsert section with incremented version
    const { error: upsertError } = await supabaseAdmin
      .from('claim_pack_sections')
      .upsert({
        project_id: projectId,
        section_key: sectionKey,
        content,
        ai_generated: false, // Manual edit
        last_edited_at: new Date().toISOString(),
        last_edited_by: user.email,
        version: newVersion
      }, {
        onConflict: 'project_id,section_key'
      });

    if (upsertError) {
      throw upsertError;
    }

    console.log(`[ClaimPackSections] Updated ${sectionKey} for project ${projectId} (v${newVersion})`);

    return NextResponse.json({
      ok: true,
      section_key: sectionKey,
      version: newVersion,
      ai_generated: false
    });

  } catch (error) {
    console.error('[ClaimPackSections] PATCH error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/claim-pack-sections/[projectId]/[sectionKey]
 *
 * Delete a claim pack section (triggers regeneration)
 *
 * Response:
 * {
 *   "ok": true,
 *   "message": "Section deleted. Regenerate to create new AI version."
 * }
 */
export async function DELETE(req, { params }) {
  const { projectId, sectionKey } = params;

  // Verify user authentication
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Verify user has access to this project
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('owner_id, participants')
      .eq('id', projectId)
      .is('deleted_at', null)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const hasAccess = project.owner_id === user.id ||
      (project.participants && project.participants.includes(user.email));

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete section
    const { error: deleteError } = await supabaseAdmin
      .from('claim_pack_sections')
      .delete()
      .eq('project_id', projectId)
      .eq('section_key', sectionKey);

    if (deleteError) {
      throw deleteError;
    }

    console.log(`[ClaimPackSections] Deleted ${sectionKey} for project ${projectId}`);

    return NextResponse.json({
      ok: true,
      message: 'Section deleted. Regenerate to create new AI version.'
    });

  } catch (error) {
    console.error('[ClaimPackSections] DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
