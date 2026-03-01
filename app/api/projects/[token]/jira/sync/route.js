// app/api/projects/[token]/jira/sync/route.js
// Triggers a Jira issue sync for a project

import { NextResponse } from 'next/server';
import { verifyUserAndProjectAccess } from '@/lib/serverAuth';
import { syncJiraIssues } from '@/lib/jiraSync';

export async function POST(req, { params }) {
  const { token } = await params;

  const { user, project, error } = await verifyUserAndProjectAccess(req, token);
  if (error) {
    return NextResponse.json({ error }, { status: user ? 403 : 401 });
  }

  try {
    const result = await syncJiraIssues(project.id, user.id);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[Jira Sync] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
