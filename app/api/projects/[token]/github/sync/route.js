// app/api/projects/[token]/github/sync/route.js
// Manually triggers GitHub commit sync

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedUser, getGitHubToken } from '@/lib/serverAuth';
import { syncGitHubData } from '@/lib/githubSync';

export async function POST(req, { params }) {
  const token = params.token;

  try {
    // Authenticate user
    const { user, error: authError } = await getAuthenticatedUser(req);

    // Fetch project
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, participants')
      .eq('project_token', token)
      .is('deleted_at', null)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get GitHub token (user-level first, then project-level fallback)
    const { accessToken, error: tokenError } = await getGitHubToken(
      user?.id || null,
      project.id
    );

    if (!accessToken) {
      return NextResponse.json(
        { error: tokenError || 'GitHub not connected. Please connect GitHub first.' },
        { status: 401 }
      );
    }

    // Fetch repository connection (includes filters)
    const { data: repo } = await supabaseAdmin
      .from('github_repos')
      .select('repo_owner, repo_name, filter_branches, filter_keywords')
      .eq('project_id', project.id)
      .single();

    if (!repo) {
      return NextResponse.json(
        { error: 'No repository connected. Please connect a repository first.' },
        { status: 404 }
      );
    }

    console.log(`[GitHub Sync API] Starting sync for ${repo.repo_owner}/${repo.repo_name}`);
    console.log(`[GitHub Sync API] Project ID: ${project.id}`);
    console.log(`[GitHub Sync API] Filters — branches: ${(repo.filter_branches || []).join(', ') || 'none'}, keywords: ${(repo.filter_keywords || []).join(', ') || 'none'}`);

    // Perform sync with filters
    const result = await syncGitHubData(
      project.id,
      repo.repo_owner,
      repo.repo_name,
      accessToken,
      {
        filterBranches: repo.filter_branches || [],
        filterKeywords: repo.filter_keywords || []
      }
    );

    console.log(`[GitHub Sync API] Sync complete:`, result);

    // Build detailed message
    let message = `Synced ${result.synced} commits`;
    if (result.skipped > 0) {
      message += ` (${result.skipped} skipped`;

      const reasons = [];
      if (result.reasons?.too_short > 0) {
        reasons.push(`${result.reasons.too_short} too short`);
      }
      if (result.reasons?.duplicate > 0) {
        reasons.push(`${result.reasons.duplicate} duplicates`);
      }
      if (result.reasons?.keyword_filtered > 0) {
        reasons.push(`${result.reasons.keyword_filtered} didn't match keywords`);
      }
      const patternCount = Object.values(result.reasons?.pattern_matched || {}).reduce((a, b) => a + b, 0);
      if (patternCount > 0) {
        reasons.push(`${patternCount} noise commits`);
      }

      if (reasons.length > 0) {
        message += `: ${reasons.join(', ')}`;
      }
      message += ')';
    }

    return NextResponse.json({
      ok: true,
      synced: result.synced,
      skipped: result.skipped,
      reasons: result.reasons,
      message
    });

  } catch (err) {
    console.error('[GitHub Sync] Error:', err);

    // Handle specific GitHub API errors
    if (err.message.includes('GitHub API error')) {
      return NextResponse.json(
        { error: 'Failed to access GitHub repository. Please check your connection and try again.' },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: err.message || 'Failed to sync commits' },
      { status: 500 }
    );
  }
}
