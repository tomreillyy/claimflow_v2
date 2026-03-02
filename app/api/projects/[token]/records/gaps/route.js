// app/api/projects/[token]/records/gaps/route.js
// Unified gap analysis across all integration sources

import { NextResponse } from 'next/server';
import { verifyUserAndProjectAccess } from '@/lib/serverAuth';
import { analyzeAllGaps } from '@/lib/githubMatching';

export async function GET(req, { params }) {
  const { token } = await params;

  const { user, project, error } = await verifyUserAndProjectAccess(req, token);
  if (error) {
    return NextResponse.json({ error }, { status: user ? 403 : 401 });
  }

  try {
    const gaps = await analyzeAllGaps(project.id);
    return NextResponse.json(gaps);
  } catch (err) {
    console.error('[Records Gaps] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
