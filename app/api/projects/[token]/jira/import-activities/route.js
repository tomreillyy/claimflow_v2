import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * POST — Import confirmed Jira-derived activities into core_activities + evidence
 * Body: { activities: [{ activity_name, uncertainty, hypothesis, conclusion, issues: [{key, summary, step}] }] }
 */
export async function POST(req, { params }) {
  const { token } = await params;

  // Get project
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('id')
    .eq('project_token', token)
    .is('deleted_at', null)
    .single();

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const { activities } = await req.json();

  if (!activities || !Array.isArray(activities) || activities.length === 0) {
    return NextResponse.json({ error: 'No activities to import' }, { status: 400 });
  }

  const imported = [];
  const errors = [];

  for (const act of activities) {
    try {
      // 1. Create the core activity
      const { data: coreActivity, error: actError } = await supabaseAdmin
        .from('core_activities')
        .insert({
          project_id: project.id,
          name: String(act.activity_name || '').slice(0, 60),
          uncertainty: String(act.uncertainty || '').slice(0, 800),
          hypothesis_text: act.hypothesis ? String(act.hypothesis).slice(0, 1000) : null,
          conclusion_text: act.conclusion ? String(act.conclusion).slice(0, 1000) : null,
          status: 'draft',
          source: 'jira',
          meta: {
            jira_epic_name: act.epic_name || null,
            classification: act.classification || 'core',
            reason: act.reason || null,
          }
        })
        .select()
        .single();

      if (actError) {
        errors.push({ epic: act.epic_name, error: actError.message });
        continue;
      }

      // 2. Create evidence items from Jira issues and link them
      const issues = act.issues || [];
      let linkedCount = 0;

      for (const issue of issues) {
        const validSteps = ['Hypothesis', 'Experiment', 'Observation', 'Evaluation', 'Conclusion'];
        const step = validSteps.includes(issue.step) ? issue.step : null;

        // Create evidence record
        const { data: evidence, error: evError } = await supabaseAdmin
          .from('evidence')
          .insert({
            project_id: project.id,
            content: `[${issue.key}] ${issue.summary}`,
            source: 'note',
            systematic_step_primary: step,
            systematic_step_source: 'auto',
            linked_activity_id: coreActivity.id,
            link_source: 'auto',
            link_reason: 'Imported from Jira CSV',
            meta: {
              type: 'jira',
              jira_key: issue.key,
            }
          })
          .select('id')
          .single();

        if (evError) {
          console.error(`[Jira Import] Evidence error for ${issue.key}:`, evError.message);
          continue;
        }

        // Link via activity_evidence join table
        if (evidence && step) {
          await supabaseAdmin
            .from('activity_evidence')
            .upsert({
              activity_id: coreActivity.id,
              evidence_id: evidence.id,
              systematic_step: step,
              link_source: 'auto',
              link_reason: 'Jira CSV import',
            }, { onConflict: 'activity_id,evidence_id,systematic_step' });
          linkedCount++;
        }
      }

      imported.push({
        id: coreActivity.id,
        name: coreActivity.name,
        issueCount: issues.length,
        linkedCount,
      });
    } catch (err) {
      errors.push({ epic: act.epic_name, error: err.message });
    }
  }

  return NextResponse.json({
    imported,
    errors,
    totalImported: imported.length,
    totalErrors: errors.length,
  });
}
