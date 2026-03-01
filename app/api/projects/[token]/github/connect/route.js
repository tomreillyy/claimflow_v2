// app/api/projects/[token]/github/connect/route.js
// Saves GitHub repository connection (with optional filters) for a project

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedUser, getGitHubToken } from '@/lib/serverAuth';

export async function POST(req, { params }) {
  const token = params.token;
  const { repo_owner, repo_name, filter_branches, filter_keywords } = await req.json();

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
    // Authenticate user
    const { user, error: authError } = await getAuthenticatedUser(req);

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

    // Get GitHub token (user-level first, then project-level fallback)
    const { accessToken, error: tokenError } = await getGitHubToken(
      user?.id || null,
      project.id
    );

    if (!accessToken) {
      return NextResponse.json(
        { error: tokenError || 'GitHub not authenticated. Please connect GitHub first.' },
        { status: 401 }
      );
    }

    // Verify repository exists and is accessible with the token
    const verifyResponse = await fetch(
      `https://api.github.com/repos/${repo_owner}/${repo_name}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
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

    // Normalize filter arrays (remove empty strings, trim whitespace)
    const branches = Array.isArray(filter_branches)
      ? filter_branches.map(b => b.trim()).filter(Boolean)
      : [];
    const keywords = Array.isArray(filter_keywords)
      ? filter_keywords.map(k => k.trim()).filter(Boolean)
      : [];

    // Insert or update repository connection
    const { data: repoRecord, error: repoError } = await supabaseAdmin
      .from('github_repos')
      .upsert({
        project_id: project.id,
        repo_owner,
        repo_name,
        filter_branches: branches,
        filter_keywords: keywords,
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
        filter_branches: repoRecord.filter_branches,
        filter_keywords: repoRecord.filter_keywords,
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

// PATCH endpoint to update filters on an existing connection
export async function PATCH(req, { params }) {
  const token = params.token;
  const { filter_branches, filter_keywords } = await req.json();

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

    const updates = {};
    if (filter_branches !== undefined) {
      updates.filter_branches = Array.isArray(filter_branches)
        ? filter_branches.map(b => b.trim()).filter(Boolean)
        : [];
    }
    if (filter_keywords !== undefined) {
      updates.filter_keywords = Array.isArray(filter_keywords)
        ? filter_keywords.map(k => k.trim()).filter(Boolean)
        : [];
    }

    const { data: repoRecord, error } = await supabaseAdmin
      .from('github_repos')
      .update(updates)
      .eq('project_id', project.id)
      .select()
      .single();

    if (error) {
      console.error('[GitHub Connect] Update error:', error);
      throw error;
    }

    return NextResponse.json({
      ok: true,
      repo: {
        id: repoRecord.id,
        repo_owner: repoRecord.repo_owner,
        repo_name: repoRecord.repo_name,
        filter_branches: repoRecord.filter_branches,
        filter_keywords: repoRecord.filter_keywords,
        last_synced_at: repoRecord.last_synced_at
      }
    });

  } catch (err) {
    console.error('[GitHub Connect PATCH] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update filters' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch current GitHub connection
export async function GET(req, { params }) {
  const token = params.token;

  try {
    // Authenticate user
    const { user, error: authError } = await getAuthenticatedUser(req);

    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('project_token', token)
      .is('deleted_at', null)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if GitHub is authenticated (user-level or project-level)
    const { accessToken } = await getGitHubToken(user?.id || null, project.id);
    const hasAuth = !!accessToken;

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
