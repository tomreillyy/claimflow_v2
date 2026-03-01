// app/api/jira/auth/callback/route.js
// Handles Jira OAuth 2.0 callback — exchanges code for access + refresh tokens

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
  let consultantId = null;
  let consultantName = null;

  if (stateParam) {
    try {
      const decoded = JSON.parse(Buffer.from(stateParam, 'base64url').toString());
      userId = decoded.user_id;
      projectToken = decoded.project_token;
      consultantId = decoded.cid;
      consultantName = decoded.cn;
    } catch {
      // Invalid state
    }
  }

  // Handle OAuth errors
  if (error) {
    const errorDescription = searchParams.get('error_description') || 'Jira authorization failed';
    const redirectUrl = projectToken
      ? `${baseUrl}/p/${projectToken}?jira_error=${encodeURIComponent(errorDescription)}`
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

    // Exchange code for tokens
    const clientId = process.env.JIRA_CLIENT_ID;
    const clientSecret = process.env.JIRA_CLIENT_SECRET;
    const redirectUri = process.env.JIRA_REDIRECT_URI || `${baseUrl}/api/jira/auth/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Jira OAuth not configured' }, { status: 500 });
    }

    const tokenResponse = await fetch('https://auth.atlassian.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri
      })
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      throw new Error(`Jira token exchange failed: ${tokenResponse.status} - ${errText}`);
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    if (!access_token || !refresh_token) {
      throw new Error('No access or refresh token received from Jira');
    }

    // Calculate token expiry
    const tokenExpiresAt = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString();

    // Fetch accessible resources to get cloud_id
    const resourcesResponse = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Accept': 'application/json'
      }
    });

    if (!resourcesResponse.ok) {
      throw new Error('Failed to fetch Jira accessible resources');
    }

    const resources = await resourcesResponse.json();
    if (!resources || resources.length === 0) {
      throw new Error('No Jira sites accessible with this account');
    }

    const cloudId = resources[0].id;
    const siteUrl = resources[0].url;

    // Fetch user info
    let jiraAccountId = null;
    let jiraDisplayName = null;
    try {
      const meResponse = await fetch('https://api.atlassian.com/me', {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Accept': 'application/json'
        }
      });
      if (meResponse.ok) {
        const meData = await meResponse.json();
        jiraAccountId = meData.account_id;
        jiraDisplayName = meData.name || meData.nickname;
      }
    } catch {
      // Non-critical, continue without user info
    }

    // Upsert user_jira_tokens
    const { error: insertError } = await supabaseAdmin
      .from('user_jira_tokens')
      .upsert({
        user_id: userId,
        access_token,
        refresh_token,
        cloud_id: cloudId,
        site_url: siteUrl,
        jira_account_id: jiraAccountId,
        jira_display_name: jiraDisplayName,
        token_expires_at: tokenExpiresAt,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (insertError) {
      console.error('[Jira OAuth] Token storage error:', insertError);
      throw insertError;
    }

    // Redirect to project Jira tab with success (preserve consultant context)
    let redirectUrl = `${baseUrl}/p/${projectToken}?view=jira&jira_connected=true`;
    if (consultantId) redirectUrl += `&cid=${encodeURIComponent(consultantId)}`;
    if (consultantName) redirectUrl += `&cn=${encodeURIComponent(consultantName)}`;
    return NextResponse.redirect(redirectUrl);

  } catch (err) {
    console.error('[Jira OAuth] Callback error:', err);
    const redirectUrl = `${baseUrl}/p/${projectToken}?jira_error=${encodeURIComponent(err.message)}`;
    return NextResponse.redirect(redirectUrl);
  }
}
