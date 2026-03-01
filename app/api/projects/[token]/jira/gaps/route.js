// app/api/projects/[token]/jira/gaps/route.js
// Returns gap analysis showing which activities are missing evidence

import { NextResponse } from 'next/server';
import { verifyUserAndProjectAccess } from '@/lib/serverAuth';
import { analyzeGaps } from '@/lib/jiraMatching';

export async function GET(req, { params }) {
  const { token } = await params;

  const { user, project, error } = await verifyUserAndProjectAccess(req, token);
  if (error) {
    return NextResponse.json({ error }, { status: user ? 403 : 401 });
  }

  try {
    const gaps = await analyzeGaps(project.id);
    return NextResponse.json(gaps);
  } catch (err) {
    console.error('[Jira Gaps] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
