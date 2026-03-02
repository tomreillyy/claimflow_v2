// app/api/projects/[token]/github/match/route.js
// Triggers AI matching on GitHub commits/PRs already in the evidence table

import { NextResponse } from 'next/server';
import { verifyUserAndProjectAccess } from '@/lib/serverAuth';
import { matchGitHubCommits } from '@/lib/githubMatching';

export async function POST(req, { params }) {
  const { token } = await params;

  const { user, project, error } = await verifyUserAndProjectAccess(req, token);
  if (error) {
    return NextResponse.json({ error }, { status: user ? 403 : 401 });
  }

  try {
    const result = await matchGitHubCommits(project.id);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[GitHub Match] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
