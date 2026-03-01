// app/api/jira/auth/start/route.js
// Initiates Jira OAuth 2.0 (3LO) flow — returns the auth URL for the client to redirect to

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/serverAuth';

export async function POST(req) {
  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Not authenticated' }, { status: 401 });
  }

  const { project_token, consultant_id, consultant_name } = await req.json();

  if (!project_token) {
    return NextResponse.json({ error: 'project_token required' }, { status: 400 });
  }

  const clientId = process.env.JIRA_CLIENT_ID;

  const requestUrl = new URL(req.url);
  const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
  const redirectUri = process.env.JIRA_REDIRECT_URI || `${baseUrl}/api/jira/auth/callback`;

  if (!clientId) {
    return NextResponse.json({ error: 'Jira OAuth not configured' }, { status: 500 });
  }

  // Encode user_id + project_token + consultant context into state
  const stateObj = { user_id: user.id, project_token };
  if (consultant_id) stateObj.cid = consultant_id;
  if (consultant_name) stateObj.cn = consultant_name;
  const state = Buffer.from(JSON.stringify(stateObj)).toString('base64url');

  // Construct Atlassian OAuth 2.0 (3LO) URL
  const jiraAuthUrl = new URL('https://auth.atlassian.com/authorize');
  jiraAuthUrl.searchParams.set('audience', 'api.atlassian.com');
  jiraAuthUrl.searchParams.set('client_id', clientId);
  jiraAuthUrl.searchParams.set('scope', 'read:jira-work read:jira-user offline_access');
  jiraAuthUrl.searchParams.set('redirect_uri', redirectUri);
  jiraAuthUrl.searchParams.set('state', state);
  jiraAuthUrl.searchParams.set('response_type', 'code');
  jiraAuthUrl.searchParams.set('prompt', 'consent');

  return NextResponse.json({ url: jiraAuthUrl.toString() });
}
