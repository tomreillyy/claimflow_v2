// app/api/projects/[token]/github/sync/route.js
// Manually triggers GitHub commit sync

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { syncCommits } from '@/lib/githubSync';

export async function POST(req, { params }) {
  const token = params.token;

  try {
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

    // Fetch GitHub token
    const { data: tokenRecord } = await supabaseAdmin
      .from('project_github_tokens')
      .select('access_token')
      .eq('project_id', project.id)
      .single();

    if (!tokenRecord) {
      return NextResponse.json(
        { error: 'GitHub not connected. Please connect GitHub first.' },
        { status: 401 }
      );
    }

    // Fetch repository connection
    const { data: repo } = await supabaseAdmin
      .from('github_repos')
      .select('repo_owner, repo_name')
      .eq('project_id', project.id)
      .single();

    if (!repo) {
      return NextResponse.json(
        { error: 'No repository connected. Please connect a repository first.' },
        { status: 404 }
      );
    }

    // Perform sync
    const result = await syncCommits(
      project.id,
      repo.repo_owner,
      repo.repo_name,
      tokenRecord.access_token,
      project.participants || []
    );

    return NextResponse.json({
      ok: true,
      synced: result.synced,
      skipped: result.skipped,
      message: `Synced ${result.synced} commits (${result.skipped} skipped)`
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
