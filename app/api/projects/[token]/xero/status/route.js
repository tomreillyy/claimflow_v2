import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyUserAndProjectAccess } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET - Check Xero connection status for this project's user
 */
export async function GET(req, { params }) {
  try {
    const { token } = await params;
    const { user, project, error: authError } = await verifyUserAndProjectAccess(req, token);
    if (authError) {
      return NextResponse.json({ error: authError }, { status: !user ? 401 : 403 });
    }

    // Check if user has Xero tokens
    const { data: tokenRow } = await supabaseAdmin
      .from('user_xero_tokens')
      .select('tenant_name, token_expires_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!tokenRow) {
      return NextResponse.json({ connected: false });
    }

    // Get project connection config
    const { data: connection } = await supabaseAdmin
      .from('xero_connections')
      .select('last_synced_at, sync_status, sync_error, claim_start_date, claim_end_date')
      .eq('project_id', project.id)
      .maybeSingle();

    return NextResponse.json({
      connected: true,
      tenantName: tokenRow.tenant_name,
      lastSyncedAt: connection?.last_synced_at || null,
      syncStatus: connection?.sync_status || 'idle',
      syncError: connection?.sync_error || null,
      claimStartDate: connection?.claim_start_date || null,
      claimEndDate: connection?.claim_end_date || null
    });

  } catch (err) {
    console.error('[Xero Status] Error:', err);
    return NextResponse.json({ error: 'Failed to check Xero status' }, { status: 500 });
  }
}
