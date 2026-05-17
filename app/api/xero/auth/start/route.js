// app/api/xero/auth/start/route.js
// Initiates Xero OAuth 2.0 flow — returns the auth URL for the client to redirect to

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/serverAuth';

export async function POST(req) {
  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Not authenticated' }, { status: 401 });
  }

  const { project_token } = await req.json();

  if (!project_token) {
    return NextResponse.json({ error: 'project_token required' }, { status: 400 });
  }

  const clientId = process.env.XERO_CLIENT_ID;

  const requestUrl = new URL(req.url);
  const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
  const redirectUri = process.env.XERO_REDIRECT_URI || `${baseUrl}/api/xero/auth/callback`;

  if (!clientId) {
    return NextResponse.json({ error: 'Xero OAuth not configured' }, { status: 500 });
  }

  // Encode user_id + project_token into state
  const stateObj = { user_id: user.id, project_token };
  const state = Buffer.from(JSON.stringify(stateObj)).toString('base64url');

  // Construct Xero OAuth 2.0 URL
  const xeroAuthUrl = new URL('https://login.xero.com/identity/connect/authorize');
  xeroAuthUrl.searchParams.set('response_type', 'code');
  xeroAuthUrl.searchParams.set('client_id', clientId);
  xeroAuthUrl.searchParams.set('redirect_uri', redirectUri);
  xeroAuthUrl.searchParams.set('scope', 'openid profile email offline_access payroll.employees.read payroll.payruns.read payroll.settings.read accounting.transactions.read accounting.contacts.read');
  xeroAuthUrl.searchParams.set('state', state);

  return NextResponse.json({ url: xeroAuthUrl.toString() });
}
