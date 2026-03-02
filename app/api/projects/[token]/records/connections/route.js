// app/api/projects/[token]/records/connections/route.js
// GET: Returns connection status for all integrations

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyUserAndProjectAccess, getGitHubToken, getJiraToken } from '@/lib/serverAuth';

export async function GET(req, { params }) {
  const { token } = await params;

  const { user, project, error } = await verifyUserAndProjectAccess(req, token);
  if (error) {
    return NextResponse.json({ error }, { status: user ? 403 : 401 });
  }

  const connections = [];

  // Check Jira connection
  try {
    const { data: jiraConn } = await supabaseAdmin
      .from('jira_connections')
      .select('jira_project_keys, last_synced_at, sync_status')
      .eq('project_id', project.id)
      .maybeSingle();

    let jiraAuth = false;
    try {
      const jiraToken = await getJiraToken(user.id);
      jiraAuth = !!jiraToken?.accessToken;
    } catch { /* not authorized */ }

    connections.push({
      source: 'jira',
      connected: !!jiraConn && jiraAuth,
      has_connection: !!jiraConn,
      has_auth: jiraAuth,
      last_synced_at: jiraConn?.last_synced_at || null,
      config: jiraConn ? {
        project_keys: jiraConn.jira_project_keys || []
      } : null
    });
  } catch (err) {
    connections.push({
      source: 'jira',
      connected: false,
      has_connection: false,
      has_auth: false,
      last_synced_at: null,
      config: null,
      error: err.message
    });
  }

  // Check GitHub connection
  try {
    const { data: ghRepo } = await supabaseAdmin
      .from('github_repos')
      .select('repo_owner, repo_name, last_synced_at, filter_branches, filter_keywords')
      .eq('project_id', project.id)
      .maybeSingle();

    let ghAuth = false;
    try {
      const { accessToken } = await getGitHubToken(user.id, project.id);
      ghAuth = !!accessToken;
    } catch { /* not authorized */ }

    connections.push({
      source: 'github',
      connected: !!ghRepo && ghAuth,
      has_connection: !!ghRepo,
      has_auth: ghAuth,
      last_synced_at: ghRepo?.last_synced_at || null,
      config: ghRepo ? {
        repo: `${ghRepo.repo_owner}/${ghRepo.repo_name}`,
        filter_branches: ghRepo.filter_branches || [],
        filter_keywords: ghRepo.filter_keywords || []
      } : null
    });
  } catch (err) {
    connections.push({
      source: 'github',
      connected: false,
      has_connection: false,
      has_auth: false,
      last_synced_at: null,
      config: null,
      error: err.message
    });
  }

  return NextResponse.json({ connections });
}
