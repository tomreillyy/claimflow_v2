// app/api/xero/auth/callback/route.js
// Handles Xero OAuth 2.0 callback — exchanges code for access + refresh tokens

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  const error = searchParams.get('error');

  const requestUrl = new URL(req.url);
  const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;

  // Decode state
  let userId = null;
  let projectToken = null;

  if (stateParam) {
    try {
      const decoded = JSON.parse(Buffer.from(stateParam, 'base64url').toString());
      userId = decoded.user_id;
      projectToken = decoded.project_token;
    } catch {
      // Invalid state
    }
  }

  // Handle OAuth errors
  if (error) {
    const errorDescription = searchParams.get('error_description') || 'Xero authorization failed';
    const redirectUrl = projectToken
      ? `${baseUrl}/p/${projectToken}?xero_error=${encodeURIComponent(errorDescription)}`
      : baseUrl;
    return NextResponse.redirect(redirectUrl);
  }

  if (!code || !projectToken || !userId) {
    return NextResponse.json({ error: 'Missing code, state, or user_id' }, { status: 400 });
  }

  try {
    // Verify project exists
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('project_token', projectToken)
      .is('deleted_at', null)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Invalid project token' }, { status: 404 });
    }

    // Exchange code for tokens (Xero uses Basic auth header)
    const clientId = process.env.XERO_CLIENT_ID;
    const clientSecret = process.env.XERO_CLIENT_SECRET;
    const redirectUri = process.env.XERO_REDIRECT_URI || `${baseUrl}/api/xero/auth/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Xero OAuth not configured' }, { status: 500 });
    }

    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenResponse = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      }).toString()
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      throw new Error(`Xero token exchange failed: ${tokenResponse.status} - ${errText}`);
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    if (!access_token || !refresh_token) {
      throw new Error('No access or refresh token received from Xero');
    }

    // Calculate token expiry (Xero tokens expire in 30 minutes)
    const tokenExpiresAt = new Date(Date.now() + (expires_in || 1800) * 1000).toISOString();

    // Fetch connected tenants to get org ID and name
    const connectionsResponse = await fetch('https://api.xero.com/connections', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!connectionsResponse.ok) {
      throw new Error('Failed to fetch Xero connections');
    }

    const connections = await connectionsResponse.json();
    if (!connections || connections.length === 0) {
      throw new Error('No Xero organisations accessible with this account');
    }

    // Use the first connected org (most common case)
    const tenantId = connections[0].tenantId;
    const tenantName = connections[0].tenantName;

    // Upsert user_xero_tokens
    const { error: insertError } = await supabaseAdmin
      .from('user_xero_tokens')
      .upsert({
        user_id: userId,
        access_token,
        refresh_token,
        tenant_id: tenantId,
        tenant_name: tenantName,
        token_expires_at: tokenExpiresAt,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (insertError) {
      console.error('[Xero OAuth] Token storage error:', insertError);
      throw insertError;
    }

    // Redirect to project financials with success
    const redirectUrl = `${baseUrl}/p/${projectToken}?view=financials&xero_connected=true`;
    return NextResponse.redirect(redirectUrl);

  } catch (err) {
    console.error('[Xero OAuth] Callback error:', err);
    const redirectUrl = `${baseUrl}/p/${projectToken}?xero_error=${encodeURIComponent(err.message)}`;
    return NextResponse.redirect(redirectUrl);
  }
}
