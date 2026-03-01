// app/api/projects/[token]/jira/connect/route.js
// GET: Check Jira connection status
// POST: Save Jira project connection config
// PATCH: Update filters

import { NextResponse } from 'next/server';
import { verifyUserAndProjectAccess, getJiraToken } from '@/lib/serverAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET — Check connection status
export async function GET(req, { params }) {
  const { token } = await params;

  const { user, project, error } = await verifyUserAndProjectAccess(req, token);
  if (error) {
    return NextResponse.json({ error }, { status: user ? 403 : 401 });
  }

  // Check if user has Jira auth
  const { accessToken, cloudId, siteUrl, error: tokenError } = await getJiraToken(user.id);
  const hasAuth = !tokenError && !!accessToken;

  // Check if project has a Jira connection
  const { data: connection } = await supabaseAdmin
    .from('jira_connections')
    .select('*')
    .eq('project_id', project.id)
    .maybeSingle();

  return NextResponse.json({
    hasAuth,
    siteUrl: hasAuth ? siteUrl : null,
    connection: connection || null
  });
}

// POST — Save connection config
export async function POST(req, { params }) {
  const { token } = await params;

  const { user, project, error } = await verifyUserAndProjectAccess(req, token);
  if (error) {
    return NextResponse.json({ error }, { status: user ? 403 : 401 });
  }

  const { accessToken, error: tokenError } = await getJiraToken(user.id);
  if (tokenError) {
    return NextResponse.json({ error: tokenError }, { status: 400 });
  }

  const body = await req.json();
  const { jira_project_keys, jql_filter, filter_keywords, filter_issue_types } = body;

  if ((!jira_project_keys || jira_project_keys.length === 0) && !jql_filter) {
    return NextResponse.json({ error: 'At least one Jira project key or JQL filter is required' }, { status: 400 });
  }

  try {
    const { data, error: upsertError } = await supabaseAdmin
      .from('jira_connections')
      .upsert({
        project_id: project.id,
        jira_project_keys: jira_project_keys || [],
        jql_filter: jql_filter || null,
        filter_keywords: filter_keywords || [],
        filter_issue_types: filter_issue_types || [],
        sync_status: 'idle'
      }, {
        onConflict: 'project_id'
      })
      .select()
      .single();

    if (upsertError) throw upsertError;

    return NextResponse.json({ connection: data });
  } catch (err) {
    console.error('[Jira Connect] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH — Update filters
export async function PATCH(req, { params }) {
  const { token } = await params;

  const { user, project, error } = await verifyUserAndProjectAccess(req, token);
  if (error) {
    return NextResponse.json({ error }, { status: user ? 403 : 401 });
  }

  const body = await req.json();
  const updates = {};

  if (body.jira_project_keys !== undefined) updates.jira_project_keys = body.jira_project_keys;
  if (body.jql_filter !== undefined) updates.jql_filter = body.jql_filter;
  if (body.filter_keywords !== undefined) updates.filter_keywords = body.filter_keywords;
  if (body.filter_issue_types !== undefined) updates.filter_issue_types = body.filter_issue_types;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  try {
    const { data, error: updateError } = await supabaseAdmin
      .from('jira_connections')
      .update(updates)
      .eq('project_id', project.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ connection: data });
  } catch (err) {
    console.error('[Jira Connect PATCH] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
