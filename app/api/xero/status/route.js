import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedUser } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET - Account-level Xero connection status (no project context needed)
 */
export async function GET(req) {
  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Not authenticated' }, { status: 401 });
  }

  const { data: tokenRow } = await supabaseAdmin
    .from('user_xero_tokens')
    .select('tenant_name, token_expires_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!tokenRow) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    tenantName: tokenRow.tenant_name
  });
}
