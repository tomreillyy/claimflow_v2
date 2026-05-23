import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedUser } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST - Disconnect Xero (delete user tokens)
 */
export async function POST(req) {
  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Not authenticated' }, { status: 401 });
  }

  // Delete user's Xero tokens
  await supabaseAdmin
    .from('user_xero_tokens')
    .delete()
    .eq('user_id', user.id);

  return NextResponse.json({ ok: true });
}
