// app/api/projects/[token]/records/route.js
// GET: Unified record feed (queries jira_issue_matches + github_commit_matches)
// PATCH: Unified batch review (approve/reject/skip across sources)

import { NextResponse } from 'next/server';
import { verifyUserAndProjectAccess, getJiraToken } from '@/lib/serverAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createEvidenceFromMatch } from '@/lib/jiraMatching';
import { createEvidenceFromCommitMatch } from '@/lib/githubMatching';

// GET — Unified record feed
export async function GET(req, { params }) {
  const { token } = await params;

  const { user, project, error } = await verifyUserAndProjectAccess(req, token);
  if (error) {
    return NextResponse.json({ error }, { status: user ? 403 : 401 });
  }

  const { searchParams } = new URL(req.url);
  const source = searchParams.get('source'); // 'jira', 'github', or null for all
  const status = searchParams.get('status'); // 'pending', 'approved', 'auto_approved', 'rejected', 'skipped'
  const activityId = searchParams.get('activity_id');
  const confidence = searchParams.get('confidence');
  const step = searchParams.get('step');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10), 100);

  const records = [];
  const counts = { pending: 0, approved: 0, auto_approved: 0, rejected: 0, skipped: 0 };

  // Fetch Jira matches (unless filtering to github only)
  if (!source || source === 'jira') {
    let jiraQuery = supabaseAdmin
      .from('jira_issue_matches')
      .select(`
        id, match_score, match_confidence, ai_summary, suggested_step,
        review_status, reviewed_by, reviewed_at, evidence_id, keyword_score,
        created_at, activity_id, jira_issue_id
      `)
      .eq('project_id', project.id)
      .order('created_at', { ascending: false });

    if (status) jiraQuery = jiraQuery.eq('review_status', status);
    if (activityId) jiraQuery = jiraQuery.eq('activity_id', activityId);
    if (confidence) jiraQuery = jiraQuery.eq('match_confidence', confidence);
    if (step) jiraQuery = jiraQuery.eq('suggested_step', step);

    const { data: jiraMatches } = await jiraQuery;

    if (jiraMatches && jiraMatches.length > 0) {
      // Fetch related jira issues
      const issueIds = [...new Set(jiraMatches.map(m => m.jira_issue_id))];
      const { data: issues } = issueIds.length > 0
        ? await supabaseAdmin.from('jira_issues')
            .select('id, jira_key, summary, issue_type, status, labels, components, story_points, assignee_name, jira_created_at')
            .in('id', issueIds)
        : { data: [] };

      const issueMap = new Map((issues || []).map(i => [i.id, i]));

      for (const m of jiraMatches) {
        const issue = issueMap.get(m.jira_issue_id);
        records.push({
          id: m.id,
          source: 'jira',
          title: issue ? `${issue.jira_key}: ${issue.summary}` : 'Unknown issue',
          summary: m.ai_summary,
          match_confidence: m.match_confidence,
          match_score: m.match_score,
          suggested_step: m.suggested_step,
          review_status: m.review_status,
          reviewed_by: m.reviewed_by,
          reviewed_at: m.reviewed_at,
          evidence_id: m.evidence_id,
          activity_id: m.activity_id,
          created_at: m.created_at,
          meta: issue ? {
            jira_key: issue.jira_key,
            issue_type: issue.issue_type,
            status: issue.status,
            labels: issue.labels,
            components: issue.components,
            story_points: issue.story_points,
            assignee_name: issue.assignee_name
          } : {},
          // Keep original IDs for review actions
          _jira_issue_id: m.jira_issue_id
        });
      }
    }

    // Count Jira statuses
    const { data: jiraAll } = await supabaseAdmin
      .from('jira_issue_matches')
      .select('review_status')
      .eq('project_id', project.id);

    (jiraAll || []).forEach(m => {
      const s = m.review_status || 'pending';
      counts[s] = (counts[s] || 0) + 1;
    });
  }

  // Fetch GitHub matches (unless filtering to jira only)
  if (!source || source === 'github') {
    let ghQuery = supabaseAdmin
      .from('github_commit_matches')
      .select(`
        id, commit_sha, commit_message, commit_url, commit_meta,
        match_score, match_confidence, ai_summary, suggested_step,
        review_status, reviewed_by, reviewed_at, evidence_id,
        created_at, activity_id
      `)
      .eq('project_id', project.id)
      .order('created_at', { ascending: false });

    if (status) ghQuery = ghQuery.eq('review_status', status);
    if (activityId) ghQuery = ghQuery.eq('activity_id', activityId);
    if (confidence) ghQuery = ghQuery.eq('match_confidence', confidence);
    if (step) ghQuery = ghQuery.eq('suggested_step', step);

    const { data: ghMatches } = await ghQuery;

    if (ghMatches && ghMatches.length > 0) {
      for (const m of ghMatches) {
        const meta = m.commit_meta || {};
        records.push({
          id: m.id,
          source: 'github',
          title: m.commit_message?.split('\n')[0] || 'Unknown commit',
          summary: m.ai_summary,
          match_confidence: m.match_confidence,
          match_score: m.match_score,
          suggested_step: m.suggested_step,
          review_status: m.review_status,
          reviewed_by: m.reviewed_by,
          reviewed_at: m.reviewed_at,
          evidence_id: m.evidence_id,
          activity_id: m.activity_id,
          created_at: m.created_at,
          meta: {
            sha: m.commit_sha,
            commit_url: m.commit_url,
            files_changed: meta.files_changed || 0,
            additions: meta.additions || 0,
            deletions: meta.deletions || 0,
            branch: meta.branch || '',
            type: meta.type || 'commit',
            pr_number: meta.pr_number || null,
            repo: meta.repo || ''
          },
          // Keep original fields for review actions
          _commit_sha: m.commit_sha,
          _commit_message: m.commit_message,
          _commit_meta: m.commit_meta
        });
      }
    }

    // Count GitHub statuses
    const { data: ghAll } = await supabaseAdmin
      .from('github_commit_matches')
      .select('review_status')
      .eq('project_id', project.id);

    (ghAll || []).forEach(m => {
      const s = m.review_status || 'pending';
      counts[s] = (counts[s] || 0) + 1;
    });
  }

  // Sort merged records by created_at descending
  records.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Paginate
  const offset = (page - 1) * limit;
  const paginatedRecords = records.slice(offset, offset + limit);

  // Enrich with activity names
  const activityIds = [...new Set(paginatedRecords.map(r => r.activity_id).filter(Boolean))];
  let activityMap = new Map();
  if (activityIds.length > 0) {
    const { data: acts } = await supabaseAdmin
      .from('core_activities')
      .select('id, name')
      .in('id', activityIds);
    activityMap = new Map((acts || []).map(a => [a.id, a]));
  }

  const enriched = paginatedRecords.map(r => ({
    ...r,
    activity: activityMap.get(r.activity_id) || null
  }));

  return NextResponse.json({
    records: enriched,
    counts,
    total: records.length,
    page,
    limit
  });
}

// PATCH — Unified batch review
export async function PATCH(req, { params }) {
  const { token } = await params;

  const { user, project, error } = await verifyUserAndProjectAccess(req, token);
  if (error) {
    return NextResponse.json({ error }, { status: user ? 403 : 401 });
  }

  const body = await req.json();
  const { reviews } = body; // Array of { match_id, source: 'jira'|'github', action: 'approve'|'reject'|'skip' }

  if (!Array.isArray(reviews) || reviews.length === 0) {
    return NextResponse.json({ error: 'reviews array required' }, { status: 400 });
  }

  // Get Jira site URL for evidence links
  let siteUrl = null;
  try {
    const jiraToken = await getJiraToken(user.id);
    siteUrl = jiraToken?.siteUrl;
  } catch {
    // No Jira token — that's fine for GitHub-only reviews
  }

  let approved = 0;
  let rejected = 0;
  let skipped = 0;
  const errors = [];

  for (const review of reviews) {
    const { match_id, source, action } = review;

    if (!['approve', 'reject', 'skip'].includes(action)) {
      errors.push({ match_id, error: 'Invalid action' });
      continue;
    }

    try {
      if (source === 'jira') {
        await processJiraReview(match_id, action, project, user, siteUrl, { approved: () => approved++, rejected: () => rejected++, skipped: () => skipped++ }, errors);
      } else if (source === 'github') {
        await processGitHubReview(match_id, action, project, user, { approved: () => approved++, rejected: () => rejected++, skipped: () => skipped++ }, errors);
      } else {
        errors.push({ match_id, error: 'Unknown source' });
      }
    } catch (err) {
      console.error(`[Records Review] Error processing ${match_id}:`, err);
      errors.push({ match_id, error: err.message });
    }
  }

  return NextResponse.json({ approved, rejected, skipped, errors });
}

async function processJiraReview(matchId, action, project, user, siteUrl, counters, errors) {
  if (action === 'approve') {
    const { data: match, error: matchErr } = await supabaseAdmin
      .from('jira_issue_matches')
      .select('*')
      .eq('id', matchId)
      .eq('project_id', project.id)
      .single();

    if (matchErr || !match) {
      errors.push({ match_id: matchId, error: 'Match not found' });
      return;
    }

    if (match.review_status === 'approved' && match.evidence_id) {
      counters.approved();
      return;
    }

    const { data: issue, error: issueErr } = await supabaseAdmin
      .from('jira_issues')
      .select('*')
      .eq('id', match.jira_issue_id)
      .single();

    if (issueErr || !issue) {
      errors.push({ match_id: matchId, error: 'Issue not found' });
      return;
    }

    const { id: evidenceId } = await createEvidenceFromMatch(match, issue, siteUrl);

    await supabaseAdmin
      .from('jira_issue_matches')
      .update({
        review_status: 'approved',
        reviewed_by: user.email,
        reviewed_at: new Date().toISOString(),
        evidence_id: evidenceId,
        updated_at: new Date().toISOString()
      })
      .eq('id', matchId);

    counters.approved();
  } else {
    await supabaseAdmin
      .from('jira_issue_matches')
      .update({
        review_status: action === 'reject' ? 'rejected' : 'skipped',
        reviewed_by: user.email,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', matchId)
      .eq('project_id', project.id);

    if (action === 'reject') counters.rejected();
    else counters.skipped();
  }
}

async function processGitHubReview(matchId, action, project, user, counters, errors) {
  if (action === 'approve') {
    const { data: match, error: matchErr } = await supabaseAdmin
      .from('github_commit_matches')
      .select('*')
      .eq('id', matchId)
      .eq('project_id', project.id)
      .single();

    if (matchErr || !match) {
      errors.push({ match_id: matchId, error: 'Match not found' });
      return;
    }

    if (['approved', 'auto_approved'].includes(match.review_status) && match.evidence_id) {
      counters.approved();
      return;
    }

    const { id: evidenceId } = await createEvidenceFromCommitMatch(match, project.id);

    await supabaseAdmin
      .from('github_commit_matches')
      .update({
        review_status: 'approved',
        reviewed_by: user.email,
        reviewed_at: new Date().toISOString(),
        evidence_id: evidenceId,
        updated_at: new Date().toISOString()
      })
      .eq('id', matchId);

    counters.approved();
  } else {
    await supabaseAdmin
      .from('github_commit_matches')
      .update({
        review_status: action === 'reject' ? 'rejected' : 'skipped',
        reviewed_by: user.email,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', matchId)
      .eq('project_id', project.id);

    if (action === 'reject') counters.rejected();
    else counters.skipped();
  }
}
