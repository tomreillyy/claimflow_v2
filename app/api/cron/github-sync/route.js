// app/api/cron/github-sync/route.js
// Recurring GitHub sync cron job — syncs commits/PRs and matches for all connected repos
// Protected by CRON_SECRET (same as jira-sync, process-narratives)

import { NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/serverAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { syncGitHubData } from '@/lib/githubSync';
import { matchGitHubCommits } from '@/lib/githubMatching';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = [];
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

  try {
    // Find all GitHub repo connections that haven't been synced in the last 6 hours
    const { data: repos } = await supabaseAdmin
      .from('github_repos')
      .select('id, project_id, repo_owner, repo_name, filter_branches, filter_keywords')
      .or(`last_synced_at.is.null,last_synced_at.lt.${sixHoursAgo}`);

    if (!repos || repos.length === 0) {
      return NextResponse.json({ ok: true, message: 'No repos need syncing', results: [] });
    }

    console.log(`[GitHub Cron] Found ${repos.length} repos to sync`);

    for (const repo of repos) {
      try {
        // Get the project owner's user_id
        const { data: project } = await supabaseAdmin
          .from('projects')
          .select('owner_id')
          .eq('id', repo.project_id)
          .is('deleted_at', null)
          .single();

        if (!project) {
          results.push({ project_id: repo.project_id, repo: `${repo.repo_owner}/${repo.repo_name}`, status: 'skipped', reason: 'project_not_found' });
          continue;
        }

        // Try user-level token first, then project-level fallback
        let accessToken = null;

        const { data: userToken } = await supabaseAdmin
          .from('user_github_tokens')
          .select('access_token')
          .eq('user_id', project.owner_id)
          .maybeSingle();

        if (userToken) {
          accessToken = userToken.access_token;
        } else {
          const { data: projectToken } = await supabaseAdmin
            .from('project_github_tokens')
            .select('access_token')
            .eq('project_id', repo.project_id)
            .maybeSingle();

          if (projectToken) {
            accessToken = projectToken.access_token;
          }
        }

        if (!accessToken) {
          results.push({ project_id: repo.project_id, repo: `${repo.repo_owner}/${repo.repo_name}`, status: 'skipped', reason: 'no_github_token' });
          continue;
        }

        // Sync commits and PRs
        const syncResult = await syncGitHubData(
          repo.project_id,
          repo.repo_owner,
          repo.repo_name,
          accessToken,
          {
            filterBranches: repo.filter_branches || [],
            filterKeywords: repo.filter_keywords || []
          }
        );

        // Match new commits to activities if any were synced
        let matchResult = { matched: 0 };
        if (syncResult.synced > 0) {
          matchResult = await matchGitHubCommits(repo.project_id);
        }

        results.push({
          project_id: repo.project_id,
          repo: `${repo.repo_owner}/${repo.repo_name}`,
          status: 'ok',
          synced: syncResult.synced,
          skipped: syncResult.skipped,
          matched: matchResult.matched || 0
        });

      } catch (err) {
        console.error(`[GitHub Cron] Error syncing ${repo.repo_owner}/${repo.repo_name}:`, err.message);
        results.push({ project_id: repo.project_id, repo: `${repo.repo_owner}/${repo.repo_name}`, status: 'error', error: err.message });
      }
    }

    console.log(`[GitHub Cron] Complete:`, JSON.stringify(results));
    return NextResponse.json({ ok: true, results });

  } catch (err) {
    console.error('[GitHub Cron] Fatal error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
