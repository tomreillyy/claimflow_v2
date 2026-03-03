import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const VALID_STEPS = ['Hypothesis', 'Experiment', 'Observation', 'Evaluation', 'Conclusion'];

// POST /api/projects/[token]/core-activities/link-evidence
// Links all project evidence (by systematic_step_primary) to all draft activities.
// Called after generation or as a standalone repair step.
export async function POST(req, { params }) {
  try {
    const { token } = await params;

    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('project_token', token)
      .is('deleted_at', null)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get all activities for this project
    const { data: activities } = await supabaseAdmin
      .from('core_activities')
      .select('id')
      .eq('project_id', project.id);

    if (!activities || activities.length === 0) {
      return NextResponse.json({ linked: 0, message: 'No activities to link' });
    }

    // Get all evidence with a valid systematic step
    const { data: evidence } = await supabaseAdmin
      .from('evidence')
      .select('id, systematic_step_primary')
      .eq('project_id', project.id)
      .in('systematic_step_primary', VALID_STEPS);

    if (!evidence || evidence.length === 0) {
      return NextResponse.json({ linked: 0, message: 'No step-labeled evidence found' });
    }

    // Build the full cross-product: every activity × every evidence item
    const inserts = [];
    activities.forEach(act => {
      evidence.forEach(ev => {
        inserts.push({
          activity_id: act.id,
          evidence_id: ev.id,
          systematic_step: ev.systematic_step_primary,
          link_source: 'auto'
        });
      });
    });

    const { error } = await supabaseAdmin
      .from('activity_evidence')
      .upsert(inserts, { onConflict: 'activity_id,evidence_id,systematic_step' });

    if (error) {
      console.error('[link-evidence] upsert error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[link-evidence] Linked ${inserts.length} rows (${activities.length} activities × ${evidence.length} evidence)`);
    return NextResponse.json({ linked: inserts.length, activities: activities.length, evidence: evidence.length });
  } catch (error) {
    console.error('[link-evidence] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
