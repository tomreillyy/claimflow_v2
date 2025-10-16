// app/api/github/auth/callback/route.js
// Handles GitHub OAuth callback and exchanges code for access token

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // This is the project_token
  const error = searchParams.get('error');

  // Get the base URL from the request (works in both dev and production)
  const requestUrl = new URL(req.url);
  const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;

  // Handle OAuth errors
  if (error) {
    const errorDescription = searchParams.get('error_description') || 'GitHub authorization failed';
    const redirectUrl = state
      ? `${baseUrl}/p/${state}?github_error=${encodeURIComponent(errorDescription)}`
      : baseUrl;
    return NextResponse.redirect(redirectUrl);
  }

  if (!code || !state) {
    return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
  }

  const projectToken = state;

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

    // Exchange code for access token
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'GitHub OAuth not configured' }, { status: 500 });
    }

    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code
      })
    });

    if (!tokenResponse.ok) {
      throw new Error(`GitHub token exchange failed: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(`GitHub OAuth error: ${tokenData.error_description || tokenData.error}`);
    }

    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error('No access token received from GitHub');
    }

    // Store access token in database (upsert to handle re-auth)
    const { error: insertError } = await supabaseAdmin
      .from('project_github_tokens')
      .upsert({
        project_id: project.id,
        access_token: accessToken,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'project_id'
      });

    if (insertError) {
      console.error('[GitHub OAuth] Token storage error:', insertError);
      throw insertError;
    }

    // Redirect to project timeline with success message and prompt for repo
    const redirectUrl = `${baseUrl}/p/${projectToken}?github_connected=true`;
    return NextResponse.redirect(redirectUrl);

  } catch (err) {
    console.error('[GitHub OAuth] Callback error:', err);
    const redirectUrl = `${baseUrl}/p/${projectToken}?github_error=${encodeURIComponent(err.message)}`;
    return NextResponse.redirect(redirectUrl);
  }
}
