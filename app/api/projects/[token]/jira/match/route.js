// app/api/projects/[token]/jira/match/route.js
// Triggers AI matching on cached Jira issues

import { NextResponse } from 'next/server';
import { verifyUserAndProjectAccess } from '@/lib/serverAuth';
import { matchJiraIssues } from '@/lib/jiraMatching';

export async function POST(req, { params }) {
  const { token } = await params;

  const { user, project, error } = await verifyUserAndProjectAccess(req, token);
  if (error) {
    return NextResponse.json({ error }, { status: user ? 403 : 401 });
  }

  try {
    const result = await matchJiraIssues(project.id);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[Jira Match] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
