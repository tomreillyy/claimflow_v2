import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyUserAndProjectAccess } from '@/lib/serverAuth';
import { generateClaimPackSection } from '@/lib/claimPackGenerator';
import { SECTION_KEYS, SECTION_NAMES } from '@/lib/airdMasterContext';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for generation

/**
 * POST /api/projects/[token]/claim-pack/generate
 *
 * Generate AI-powered claim pack sections
 *
 * Request body:
 * {
 *   "regenerate_sections": ["rdti_overview", "project_overview"], // optional - specific sections to regenerate
 *   "force": false  // optional - override existing manual edits (requires confirmation)
 * }
 *
 * Response:
 * {
 *   "ok": true,
 *   "generated": ["rdti_overview", "project_overview"],
 *   "skipped": ["financials"],
 *   "errors": [],
 *   "total_tokens": 12450,
 *   "duration_ms": 8200
 * }
 */
export async function POST(req, { params }) {
  const startTime = Date.now();
  const token = params.token;

  // Get project by token (authentication optional for now - anyone with token can generate)
  const { data: project, error: projectError } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('project_token', token)
    .is('deleted_at', null)
    .single();

  if (projectError || !project) {
    console.error('[ClaimPackGenerate] Project not found:', projectError);
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Try to get authenticated user (optional)
  let userEmail = 'system';
  try {
    const { user } = await verifyUserAndProjectAccess(req, token);
    if (user) {
      userEmail = user.email;
    }
  } catch (e) {
    // Auth failed, but we'll continue with system user
    console.log('[ClaimPackGenerate] No auth, using system user');
  }

  try {
    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { regenerate_sections, force } = body;

    // Determine which sections to generate
    const allSectionKeys = Object.values(SECTION_KEYS);
    const sectionsToGenerate = regenerate_sections && Array.isArray(regenerate_sections)
      ? regenerate_sections.filter(key => allSectionKeys.includes(key))
      : allSectionKeys;

    console.log(`[ClaimPackGenerate] Starting generation for project ${project.id}:`, sectionsToGenerate);

    // Fetch all project data needed for generation
    // First get activities to use their IDs for narratives query
    const { data: activities } = await supabaseAdmin
      .from('core_activities')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: true });

    const activityIds = (activities || []).map(a => a.id);

    // Fetch remaining data in parallel
    const [
      { data: evidence },
      { data: narratives },
      { data: costLedger },
      { data: existingSections }
    ] = await Promise.all([
      supabaseAdmin
        .from('evidence')
        .select('*')
        .eq('project_id', project.id)
        .or('soft_deleted.is.null,soft_deleted.eq.false')
        .order('created_at', { ascending: true }),

      activityIds.length > 0
        ? supabaseAdmin
            .from('activity_narratives')
            .select('*')
            .in('activity_id', activityIds)
        : Promise.resolve({ data: [] }),

      supabaseAdmin
        .from('cost_ledger')
        .select('*')
        .eq('project_id', project.id)
        .order('month', { ascending: true }),

      supabaseAdmin
        .from('claim_pack_sections')
        .select('*')
        .eq('project_id', project.id)
    ]);

    // Build project data object
    const projectData = {
      project,
      activities: activities || [],
      evidence: evidence || [],
      narratives: narratives || [],
      costLedger: costLedger || []
    };

    // Check which sections can be generated (skip manually edited unless force=true)
    const existingSectionsArray = Array.isArray(existingSections) ? existingSections : (existingSections || []);
    const existingSectionsMap = new Map(existingSectionsArray.map(s => [s.section_key, s]));
    const sectionsToSkip = [];
    const sectionsToProcess = [];

    for (const sectionKey of sectionsToGenerate) {
      const existing = existingSectionsMap.get(sectionKey);

      if (existing && existing.ai_generated === false && !force) {
        // Skip manually edited sections unless force=true
        sectionsToSkip.push(sectionKey);
      } else {
        sectionsToProcess.push(sectionKey);
      }
    }

    if (sectionsToSkip.length > 0) {
      console.log(`[ClaimPackGenerate] Skipping manually edited sections:`, sectionsToSkip);
    }

    // Generate sections in parallel (with error handling per section)
    const results = {
      generated: [],
      skipped: sectionsToSkip,
      errors: [],
      total_tokens: 0
    };

    const generationPromises = sectionsToProcess.map(async (sectionKey) => {
      try {
        console.log(`[ClaimPackGenerate] Generating section: ${sectionKey}`);

        const content = await generateClaimPackSection(sectionKey, projectData);

        // Store in database
        const { error: upsertError } = await supabaseAdmin
          .from('claim_pack_sections')
          .upsert({
            project_id: project.id,
            section_key: sectionKey,
            content,
            ai_generated: true,
            last_edited_at: new Date().toISOString(),
            last_edited_by: userEmail,
            version: (existingSectionsMap.get(sectionKey)?.version || 0) + 1
          }, {
            onConflict: 'project_id,section_key'
          });

        if (upsertError) {
          throw new Error(`Database upsert failed: ${upsertError.message}`);
        }

        console.log(`[ClaimPackGenerate] Successfully generated: ${sectionKey} (${content.length} chars)`);
        results.generated.push(sectionKey);

        // Estimate tokens (rough: ~4 chars per token)
        results.total_tokens += Math.ceil(content.length / 4);

      } catch (error) {
        console.error(`[ClaimPackGenerate] Failed to generate ${sectionKey}:`, error);
        results.errors.push({
          section_key: sectionKey,
          section_name: SECTION_NAMES[sectionKey],
          error: error.message
        });
      }
    });

    // Wait for all generations to complete
    await Promise.all(generationPromises);

    const duration = Date.now() - startTime;

    console.log(`[ClaimPackGenerate] Batch complete:`, {
      generated: results.generated.length,
      skipped: results.skipped.length,
      errors: results.errors.length,
      duration_ms: duration
    });

    // Log errors if any
    if (results.errors.length > 0) {
      console.error('[ClaimPackGenerate] Generation errors:', JSON.stringify(results.errors, null, 2));
    }

    return NextResponse.json({
      ok: true,
      generated: results.generated,
      skipped: results.skipped,
      errors: results.errors,
      total_tokens: results.total_tokens,
      duration_ms: duration
    });

  } catch (error) {
    console.error('[ClaimPackGenerate] Error:', error);
    return NextResponse.json({
      ok: false,
      error: error.message
    }, { status: 500 });
  }
}
