// app/api/projects/[token]/jira/matches/route.js
// GET: List matches with filters
// PATCH: Batch review (approve/reject/skip)

import { NextResponse } from 'next/server';
import { verifyUserAndProjectAccess, getJiraToken } from '@/lib/serverAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createEvidenceFromMatch } from '@/lib/jiraMatching';

// GET — List matches
export async function GET(req, { params }) {
  const { token } = await params;

  const { user, project, error } = await verifyUserAndProjectAccess(req, token);
  if (error) {
    return NextResponse.json({ error }, { status: user ? 403 : 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status'); // 'pending', 'approved', 'rejected', 'skipped'
  const activityId = searchParams.get('activity_id');
  const confidence = searchParams.get('confidence'); // 'high', 'medium', 'low'
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10), 100);
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('jira_issue_matches')
    .select(`
      id,
      match_score,
      match_confidence,
      ai_summary,
      suggested_step,
      review_status,
      reviewed_by,
      reviewed_at,
      evidence_id,
      keyword_score,
      created_at,
      activity_id,
      jira_issue_id
    `)
    .eq('project_id', project.id)
    .order('match_score', { ascending: false });

  if (status) query = query.eq('review_status', status);
  if (activityId) query = query.eq('activity_id', activityId);
  if (confidence) query = query.eq('match_confidence', confidence);

  const { data: matches, error: fetchError } = await query
    .range(offset, offset + limit - 1);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  // Fetch related jira_issues and core_activities
  const issueIds = [...new Set((matches || []).map(m => m.jira_issue_id))];
  const activityIds = [...new Set((matches || []).map(m => m.activity_id).filter(Boolean))];

  const [issuesResult, activitiesResult] = await Promise.all([
    issueIds.length > 0
      ? supabaseAdmin.from('jira_issues').select('id, jira_key, summary, issue_type, status, labels, components, story_points, assignee_name, jira_created_at').in('id', issueIds)
      : { data: [] },
    activityIds.length > 0
      ? supabaseAdmin.from('core_activities').select('id, name').in('id', activityIds)
      : { data: [] }
  ]);

  const issueMap = new Map((issuesResult.data || []).map(i => [i.id, i]));
  const activityMap = new Map((activitiesResult.data || []).map(a => [a.id, a]));

  // Enrich matches
  const enriched = (matches || []).map(m => ({
    ...m,
    issue: issueMap.get(m.jira_issue_id) || null,
    activity: activityMap.get(m.activity_id) || null
  }));

  // Get counts by status
  const { data: statusCounts } = await supabaseAdmin
    .rpc('count_jira_match_statuses', { p_project_id: project.id })
    .maybeSingle();

  // Fallback: manual count if RPC doesn't exist
  let counts = statusCounts;
  if (!counts) {
    const { data: allMatches } = await supabaseAdmin
      .from('jira_issue_matches')
      .select('review_status')
      .eq('project_id', project.id);

    counts = {
      pending: 0,
      approved: 0,
      rejected: 0,
      skipped: 0
    };
    (allMatches || []).forEach(m => {
      counts[m.review_status] = (counts[m.review_status] || 0) + 1;
    });
  }

  return NextResponse.json({
    matches: enriched,
    counts,
    page,
    limit
  });
}

// PATCH — Batch review
export async function PATCH(req, { params }) {
  const { token } = await params;

  const { user, project, error } = await verifyUserAndProjectAccess(req, token);
  if (error) {
    return NextResponse.json({ error }, { status: user ? 403 : 401 });
  }

  const body = await req.json();
  const { reviews } = body; // Array of { match_id, action: 'approve'|'reject'|'skip' }

  if (!Array.isArray(reviews) || reviews.length === 0) {
    return NextResponse.json({ error: 'reviews array required' }, { status: 400 });
  }

  // Get site URL for creating Jira links in evidence
  const { siteUrl } = await getJiraToken(user.id);

  let approved = 0;
  let rejected = 0;
  let skipped = 0;
  const errors = [];

  for (const review of reviews) {
    const { match_id, action } = review;

    if (!['approve', 'reject', 'skip'].includes(action)) {
      errors.push({ match_id, error: 'Invalid action' });
      continue;
    }

    try {
      if (action === 'approve') {
        // Fetch match with issue data
        const { data: match } = await supabaseAdmin
          .from('jira_issue_matches')
          .select('*')
          .eq('id', match_id)
          .eq('project_id', project.id)
          .single();

        if (!match) {
          errors.push({ match_id, error: 'Match not found' });
          continue;
        }

        // Skip if already approved
        if (match.review_status === 'approved' && match.evidence_id) {
          approved++;
          continue;
        }

        // Fetch the issue
        const { data: issue } = await supabaseAdmin
          .from('jira_issues')
          .select('*')
          .eq('id', match.jira_issue_id)
          .single();

        if (!issue) {
          errors.push({ match_id, error: 'Issue not found' });
          continue;
        }

        // Create evidence record
        const { id: evidenceId } = await createEvidenceFromMatch(match, issue, siteUrl);

        // Update match
        await supabaseAdmin
          .from('jira_issue_matches')
          .update({
            review_status: 'approved',
            reviewed_by: user.email,
            reviewed_at: new Date().toISOString(),
            evidence_id: evidenceId,
            updated_at: new Date().toISOString()
          })
          .eq('id', match_id);

        approved++;

      } else {
        // Reject or skip
        await supabaseAdmin
          .from('jira_issue_matches')
          .update({
            review_status: action === 'reject' ? 'rejected' : 'skipped',
            reviewed_by: user.email,
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', match_id)
          .eq('project_id', project.id);

        if (action === 'reject') rejected++;
        else skipped++;
      }
    } catch (err) {
      console.error(`[Jira Review] Error processing ${match_id}:`, err);
      errors.push({ match_id, error: err.message });
    }
  }

  return NextResponse.json({ approved, rejected, skipped, errors });
}
