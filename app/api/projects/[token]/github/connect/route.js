// app/api/projects/[token]/github/connect/route.js
// Saves GitHub repository connection for a project

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req, { params }) {
  const token = params.token;
  const { repo_owner, repo_name } = await req.json();

  // Validate inputs
  if (!repo_owner || !repo_name) {
    return NextResponse.json(
      { error: 'repo_owner and repo_name are required' },
      { status: 400 }
    );
  }

  // Validate repo format (basic validation)
  const repoRegex = /^[a-zA-Z0-9_.-]+$/;
  if (!repoRegex.test(repo_owner) || !repoRegex.test(repo_name)) {
    return NextResponse.json(
      { error: 'Invalid repository owner or name format' },
      { status: 400 }
    );
  }

  try {
    // Fetch project
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('project_token', token)
      .is('deleted_at', null)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if GitHub token exists
    const { data: tokenRecord } = await supabaseAdmin
      .from('project_github_tokens')
      .select('access_token')
      .eq('project_id', project.id)
      .single();

    if (!tokenRecord) {
      return NextResponse.json(
        { error: 'GitHub not authenticated. Please connect GitHub first.' },
        { status: 401 }
      );
    }

    // Verify repository exists and is accessible with the token
    const verifyResponse = await fetch(
      `https://api.github.com/repos/${repo_owner}/${repo_name}`,
      {
        headers: {
          'Authorization': `Bearer ${tokenRecord.access_token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    );

    if (!verifyResponse.ok) {
      if (verifyResponse.status === 404) {
        return NextResponse.json(
          { error: 'Repository not found or not accessible with provided credentials' },
          { status: 404 }
        );
      }
      throw new Error(`GitHub API error: ${verifyResponse.status}`);
    }

    // Insert or update repository connection
    const { data: repoRecord, error: repoError } = await supabaseAdmin
      .from('github_repos')
      .upsert({
        project_id: project.id,
        repo_owner,
        repo_name,
        last_synced_at: null,
        last_synced_sha: null
      }, {
        onConflict: 'project_id,repo_owner,repo_name'
      })
      .select()
      .single();

    if (repoError) {
      console.error('[GitHub Connect] Insert error:', repoError);
      throw repoError;
    }

    return NextResponse.json({
      ok: true,
      repo: {
        id: repoRecord.id,
        repo_owner,
        repo_name,
        last_synced_at: null
      }
    });

  } catch (err) {
    console.error('[GitHub Connect] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to connect repository' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch current GitHub connection
export async function GET(req, { params }) {
  const token = params.token;

  try {
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('project_token', token)
      .is('deleted_at', null)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if GitHub is authenticated
    const { data: tokenRecord } = await supabaseAdmin
      .from('project_github_tokens')
      .select('id')
      .eq('project_id', project.id)
      .single();

    const hasAuth = !!tokenRecord;

    // Fetch repository connection
    const { data: repo } = await supabaseAdmin
      .from('github_repos')
      .select('*')
      .eq('project_id', project.id)
      .single();

    return NextResponse.json({
      has_auth: hasAuth,
      repo: repo || null
    });

  } catch (err) {
    console.error('[GitHub Connect GET] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch GitHub connection' }, { status: 500 });
  }
}
