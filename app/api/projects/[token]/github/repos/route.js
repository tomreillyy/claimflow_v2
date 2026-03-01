// app/api/projects/[token]/github/repos/route.js
// Fetches available GitHub repositories for the authenticated user

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedUser, getGitHubToken } from '@/lib/serverAuth';

export async function GET(req, { params }) {
  const token = params.token;

  try {
    // Authenticate the user
    const { user, error: authError } = await getAuthenticatedUser(req);

    // Fetch project
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('project_token', token)
      .is('deleted_at', null)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get GitHub token (user-level first, then project-level fallback)
    const { accessToken, error: tokenError } = await getGitHubToken(
      user?.id || null,
      project.id
    );

    if (tokenError || !accessToken) {
      return NextResponse.json(
        { error: tokenError || 'GitHub not connected' },
        { status: 401 }
      );
    }

    // Fetch repositories from GitHub API
    const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const allRepos = await response.json();

    // Format repos for dropdown
    const repos = allRepos.map(repo => ({
      full_name: repo.full_name,
      name: repo.name,
      owner: repo.owner.login,
      private: repo.private,
      description: repo.description,
      updated_at: repo.updated_at
    }));

    return NextResponse.json({ repos });

  } catch (err) {
    console.error('[GitHub Repos] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch repositories' },
      { status: 500 }
    );
  }
}
