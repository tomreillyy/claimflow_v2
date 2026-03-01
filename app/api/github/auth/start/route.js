// app/api/github/auth/start/route.js
// Initiates GitHub OAuth flow — returns the auth URL for the client to redirect to

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/serverAuth';

export async function POST(req) {
  // Authenticate the user so we can store the token at the user level
  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Not authenticated' }, { status: 401 });
  }

  const { project_token } = await req.json();

  if (!project_token) {
    return NextResponse.json({ error: 'project_token required' }, { status: 400 });
  }

  const clientId = process.env.GITHUB_CLIENT_ID;

  // Use GITHUB_REDIRECT_URI if set, otherwise build from request URL (works in dev and prod)
  const requestUrl = new URL(req.url);
  const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
  const redirectUri = process.env.GITHUB_REDIRECT_URI || `${baseUrl}/api/github/auth/callback`;

  if (!clientId) {
    return NextResponse.json({ error: 'GitHub OAuth not configured' }, { status: 500 });
  }

  // Encode user_id + project_token into state so the callback knows both
  const state = Buffer.from(JSON.stringify({
    user_id: user.id,
    project_token
  })).toString('base64url');

  // Construct GitHub OAuth URL
  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.set('client_id', clientId);
  githubAuthUrl.searchParams.set('redirect_uri', redirectUri);
  githubAuthUrl.searchParams.set('scope', 'repo');
  githubAuthUrl.searchParams.set('state', state);

  return NextResponse.json({ url: githubAuthUrl.toString() });
}
