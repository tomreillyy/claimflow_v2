// app/api/projects/[token]/github/repos/route.js
// Fetches available GitHub repositories for the authenticated user

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req, { params }) {
  const token = params.token;

  try {
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

    // Fetch GitHub access token
    const { data: tokenRecord } = await supabaseAdmin
      .from('project_github_tokens')
      .select('access_token')
      .eq('project_id', project.id)
      .single();

    if (!tokenRecord) {
      return NextResponse.json(
        { error: 'GitHub not connected' },
        { status: 401 }
      );
    }

    // Fetch repositories from GitHub API
    const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
      headers: {
        'Authorization': `Bearer ${tokenRecord.access_token}`,
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
