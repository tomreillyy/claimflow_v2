// app/api/projects/[token]/github/disconnect/route.js
// Removes GitHub repository connection for a project
// Does NOT remove the user-level GitHub token (other projects may use it)

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req, { params }) {
  const token = params.token;

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

    // Delete repository connection only (user token stays for other projects)
    const { error: repoError } = await supabaseAdmin
      .from('github_repos')
      .delete()
      .eq('project_id', project.id);

    if (repoError) {
      console.error('[GitHub Disconnect] Repo delete error:', repoError);
    }

    // Also clean up any legacy per-project token
    await supabaseAdmin
      .from('project_github_tokens')
      .delete()
      .eq('project_id', project.id);

    return NextResponse.json({
      ok: true,
      message: 'GitHub disconnected successfully'
    });

  } catch (err) {
    console.error('[GitHub Disconnect] Error:', err);
    return NextResponse.json(
      { error: 'Failed to disconnect GitHub' },
      { status: 500 }
    );
  }
}
