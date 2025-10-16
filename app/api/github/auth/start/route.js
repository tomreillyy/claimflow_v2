// app/api/github/auth/start/route.js
// Initiates GitHub OAuth flow

import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const projectToken = searchParams.get('project_token');

  if (!projectToken) {
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

  // Construct GitHub OAuth URL
  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.set('client_id', clientId);
  githubAuthUrl.searchParams.set('redirect_uri', redirectUri);
  githubAuthUrl.searchParams.set('scope', 'repo'); // Access to private repos
  githubAuthUrl.searchParams.set('state', projectToken); // Pass project token as state

  // Redirect to GitHub
  return NextResponse.redirect(githubAuthUrl.toString());
}
