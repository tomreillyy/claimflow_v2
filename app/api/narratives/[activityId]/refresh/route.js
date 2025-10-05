import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REGEN_COOLDOWN_HOURS = 6;

// POST: Enqueue narrative refresh job
export async function POST(req, { params }) {
  try {
    const { activityId } = await params;
    const { searchParams } = new URL(req.url);
    const force = searchParams.get('force') === 'true';

    if (!activityId) {
      return NextResponse.json({ error: 'activity_id required' }, { status: 400 });
    }

    // Get activity and project info
    const { data: activity, error: activityError } = await supabaseAdmin
      .from('core_activities')
      .select('id, project_id, name')
      .eq('id', activityId)
      .single();

    if (activityError || !activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    // Check 6-hour regen guard (unless force=true)
    if (!force) {
      const { data: narrative } = await supabaseAdmin
        .from('activity_narratives')
        .select('generated_at')
        .eq('activity_id', activityId)
        .single();

      if (narrative?.generated_at) {
        const hoursSince = (Date.now() - new Date(narrative.generated_at)) / (1000 * 60 * 60);
        if (hoursSince < REGEN_COOLDOWN_HOURS) {
          return NextResponse.json({
            queued: false,
            blocked: 'regen_cooldown',
            hours_remaining: Math.ceil(REGEN_COOLDOWN_HOURS - hoursSince)
          });
        }
      }
    }

    // Check daily snippet budget (80 snippets/project/day)
    // Count evidence items processed in last 24 hours for this project
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Get count of narratives generated in last 24h for this project
    const { data: recentNarratives } = await supabaseAdmin
      .from('activity_narratives')
      .select('activity_id')
      .gte('generated_at', oneDayAgo)
      .in('activity_id',
        supabaseAdmin
          .from('core_activities')
          .select('id')
          .eq('project_id', activity.project_id)
      );

    // Estimate: ~9 snippets per activity (3 per step × 3 steps average)
    const estimatedSnippetsToday = (recentNarratives?.length || 0) * 9;

    if (estimatedSnippetsToday >= 80 && !force) {
      return NextResponse.json({
        queued: false,
        blocked: 'daily_budget_exceeded',
        message: 'Daily snippet budget reached. Will process tomorrow.'
      });
    }

    // Enqueue job (UPSERT to prevent duplicates)
    const priority = force ? 1 : 0; // User-triggered gets higher priority

    const { error: jobError } = await supabaseAdmin
      .from('narrative_jobs')
      .upsert({
        activity_id: activityId,
        project_id: activity.project_id,
        priority,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'activity_id'
      });

    if (jobError) {
      console.error('[Narrative Refresh] Job enqueue error:', jobError);
      return NextResponse.json({ error: jobError.message }, { status: 500 });
    }

    console.log(`[Narrative Refresh] Enqueued job for activity ${activityId} (priority: ${priority}, force: ${force})`);

    return NextResponse.json({
      queued: true,
      priority,
      message: force ? 'Refresh queued (high priority)' : 'Refresh queued'
    });

  } catch (error) {
    console.error('[Narrative Refresh] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
