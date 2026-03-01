// app/api/projects/[token]/jira/disconnect/route.js
// Removes Jira connection from a project (does NOT revoke OAuth token)

import { NextResponse } from 'next/server';
import { verifyUserAndProjectAccess } from '@/lib/serverAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req, { params }) {
  const { token } = await params;

  const { user, project, error } = await verifyUserAndProjectAccess(req, token);
  if (error) {
    return NextResponse.json({ error }, { status: user ? 403 : 401 });
  }

  try {
    // Delete cached matches for this project
    await supabaseAdmin
      .from('jira_issue_matches')
      .delete()
      .eq('project_id', project.id);

    // Delete cached issues for this project
    await supabaseAdmin
      .from('jira_issues')
      .delete()
      .eq('project_id', project.id);

    // Delete connection config
    await supabaseAdmin
      .from('jira_connections')
      .delete()
      .eq('project_id', project.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Jira Disconnect] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
