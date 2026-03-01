// app/api/cron/jira-sync/route.js
// Recurring Jira sync cron job — syncs and matches issues for all connected projects
// Protected by CRON_SECRET (same as process-narratives)

import { NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/serverAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { syncJiraIssues } from '@/lib/jiraSync';
import { matchJiraIssues } from '@/lib/jiraMatching';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = [];
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  try {
    // Find all Jira connections that haven't been synced in the last 24 hours
    const { data: connections } = await supabaseAdmin
      .from('jira_connections')
      .select('project_id')
      .or(`last_synced_at.is.null,last_synced_at.lt.${oneDayAgo}`);

    if (!connections || connections.length === 0) {
      return NextResponse.json({ ok: true, message: 'No connections need syncing', results: [] });
    }

    console.log(`[Jira Cron] Found ${connections.length} connections to sync`);

    for (const conn of connections) {
      try {
        // Get the project owner's user_id
        const { data: project } = await supabaseAdmin
          .from('projects')
          .select('owner_id')
          .eq('id', conn.project_id)
          .is('deleted_at', null)
          .single();

        if (!project) {
          results.push({ project_id: conn.project_id, status: 'skipped', reason: 'project_not_found' });
          continue;
        }

        // Check that the owner has a Jira token
        const { data: tokenRow } = await supabaseAdmin
          .from('user_jira_tokens')
          .select('user_id')
          .eq('user_id', project.owner_id)
          .maybeSingle();

        if (!tokenRow) {
          results.push({ project_id: conn.project_id, status: 'skipped', reason: 'no_jira_token' });
          continue;
        }

        // Sync issues
        const syncResult = await syncJiraIssues(conn.project_id, project.owner_id);

        // Match new issues
        let matchResult = { matched: 0 };
        if (syncResult.cached > 0) {
          matchResult = await matchJiraIssues(conn.project_id);
        }

        results.push({
          project_id: conn.project_id,
          status: 'ok',
          synced: syncResult.cached,
          matched: matchResult.matched
        });

      } catch (err) {
        console.error(`[Jira Cron] Error syncing project ${conn.project_id}:`, err.message);
        results.push({ project_id: conn.project_id, status: 'error', error: err.message });
      }
    }

    console.log(`[Jira Cron] Complete:`, JSON.stringify(results));
    return NextResponse.json({ ok: true, results });

  } catch (err) {
    console.error('[Jira Cron] Fatal error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
