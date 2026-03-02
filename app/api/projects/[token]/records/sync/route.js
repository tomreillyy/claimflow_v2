// app/api/projects/[token]/records/sync/route.js
// Unified sync + match: triggers Jira sync+match AND GitHub sync+match in parallel

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyUserAndProjectAccess, getGitHubToken, getJiraToken } from '@/lib/serverAuth';
import { syncGitHubData } from '@/lib/githubSync';
import { syncJiraIssues } from '@/lib/jiraSync';
import { matchJiraIssues } from '@/lib/jiraMatching';
import { matchGitHubCommits } from '@/lib/githubMatching';

export async function POST(req, { params }) {
  const { token } = await params;

  const { user, project, error } = await verifyUserAndProjectAccess(req, token);
  if (error) {
    return NextResponse.json({ error }, { status: user ? 403 : 401 });
  }

  const results = {
    jira: { synced: false, sync: null, match: null, error: null },
    github: { synced: false, sync: null, match: null, error: null }
  };

  // Run Jira and GitHub sync+match in parallel
  const promises = [];

  // Jira sync + match
  promises.push(
    (async () => {
      try {
        // Check if Jira is connected
        const { data: jiraConn } = await supabaseAdmin
          .from('jira_connections')
          .select('id')
          .eq('project_id', project.id)
          .maybeSingle();

        if (!jiraConn) {
          results.jira.error = 'not_connected';
          return;
        }

        // Check Jira auth
        const jiraToken = await getJiraToken(user.id);
        if (!jiraToken?.accessToken) {
          results.jira.error = 'not_authorized';
          return;
        }

        // Sync issues from Jira
        const syncResult = await syncJiraIssues(project.id, user.id);
        results.jira.sync = syncResult;

        // Run AI matching
        const matchResult = await matchJiraIssues(project.id);
        results.jira.match = matchResult;
        results.jira.synced = true;
      } catch (err) {
        console.error('[Records Sync] Jira error:', err.message);
        results.jira.error = err.message;
      }
    })()
  );

  // GitHub sync + match
  promises.push(
    (async () => {
      try {
        // Check if GitHub repo is connected
        const { data: repo } = await supabaseAdmin
          .from('github_repos')
          .select('repo_owner, repo_name, filter_branches, filter_keywords')
          .eq('project_id', project.id)
          .maybeSingle();

        if (!repo) {
          results.github.error = 'not_connected';
          return;
        }

        // Check GitHub auth
        const { accessToken } = await getGitHubToken(user.id, project.id);
        if (!accessToken) {
          results.github.error = 'not_authorized';
          return;
        }

        // Sync commits from GitHub
        const syncResult = await syncGitHubData(
          project.id,
          repo.repo_owner,
          repo.repo_name,
          accessToken,
          {
            filterBranches: repo.filter_branches || [],
            filterKeywords: repo.filter_keywords || []
          }
        );
        results.github.sync = syncResult;

        // Run AI matching on GitHub commits
        const matchResult = await matchGitHubCommits(project.id);
        results.github.match = matchResult;
        results.github.synced = true;
      } catch (err) {
        console.error('[Records Sync] GitHub error:', err.message);
        results.github.error = err.message;
      }
    })()
  );

  await Promise.all(promises);

  return NextResponse.json({
    ok: true,
    results
  });
}
