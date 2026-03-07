import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/[token]/costs/suggestions
 *
 * Returns evidence-based R&D % suggestions per person (by email).
 * Groups evidence by author_email and linked_activity_id, counts items,
 * and suggests an R&D percentage.
 *
 * Response: {
 *   suggestions: {
 *     "jane@co.com": {
 *       totalEvidence: 15,
 *       activities: [{ id, name, count }],
 *       suggestedRdPercent: 100
 *     }
 *   }
 * }
 */
export async function GET(req, { params }) {
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

    // Fetch evidence with author emails
    const { data: evidence } = await supabaseAdmin
      .from('evidence')
      .select('id, author_email, linked_activity_id')
      .eq('project_id', project.id)
      .not('author_email', 'is', null)
      .or('soft_deleted.is.null,soft_deleted.eq.false');

    // Fetch activities for names
    const { data: activities } = await supabaseAdmin
      .from('core_activities')
      .select('id, name')
      .eq('project_id', project.id);

    const activityMap = new Map((activities || []).map(a => [a.id, a.name]));

    // Group by author email
    const byAuthor = {};
    for (const e of (evidence || [])) {
      const email = e.author_email.toLowerCase();
      if (!byAuthor[email]) {
        byAuthor[email] = { totalEvidence: 0, activityCounts: {} };
      }
      byAuthor[email].totalEvidence++;
      if (e.linked_activity_id) {
        byAuthor[email].activityCounts[e.linked_activity_id] =
          (byAuthor[email].activityCounts[e.linked_activity_id] || 0) + 1;
      }
    }

    // Build suggestions
    const suggestions = {};
    for (const [email, data] of Object.entries(byAuthor)) {
      const activityList = Object.entries(data.activityCounts)
        .map(([id, count]) => ({
          id,
          name: activityMap.get(id) || 'Unknown Activity',
          count,
        }))
        .sort((a, b) => b.count - a.count);

      // If person has evidence linked to R&D activities, they're doing R&D
      // Suggest 100% if strong evidence, 80% if minimal
      const suggestedRdPercent = data.totalEvidence >= 5 ? 100 :
        data.totalEvidence >= 2 ? 80 : 60;

      suggestions[email] = {
        totalEvidence: data.totalEvidence,
        activities: activityList,
        suggestedRdPercent,
      };
    }

    return NextResponse.json({ suggestions });

  } catch (error) {
    console.error('Suggestions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
