// app/api/projects/[token]/jira/projects/route.js
// Lists available Jira projects for the connected user

import { NextResponse } from 'next/server';
import { verifyUserAndProjectAccess, getJiraToken } from '@/lib/serverAuth';
import { listJiraProjects } from '@/lib/jiraSync';

export async function GET(req, { params }) {
  const { token } = await params;

  const { user, project, error } = await verifyUserAndProjectAccess(req, token);
  if (error) {
    return NextResponse.json({ error }, { status: user ? 403 : 401 });
  }

  const { accessToken, cloudId, error: tokenError } = await getJiraToken(user.id);
  if (tokenError || !accessToken) {
    return NextResponse.json({ error: tokenError || 'Jira not connected' }, { status: 400 });
  }

  try {
    const projects = await listJiraProjects(cloudId, accessToken);
    return NextResponse.json({ projects });
  } catch (err) {
    console.error('[Jira Projects] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
