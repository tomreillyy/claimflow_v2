import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedUser } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  const { count, error } = await supabaseAdmin
    .from('consultant_clients')
    .select('id', { count: 'exact', head: true })
    .eq('consultant_user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let hasProfile = false;
  try {
    const profileResult = await supabaseAdmin
      .from('consultant_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);
    hasProfile = (profileResult.count || 0) > 0;
  } catch (e) {
    // Table may not exist yet — ignore
  }

  let isTeamMember = false;
  try {
    const teamResult = await supabaseAdmin
      .from('consultant_team_members')
      .select('id', { count: 'exact', head: true })
      .eq('member_user_id', user.id);
    isTeamMember = (teamResult.count || 0) > 0;
  } catch (e) {
    // Table may not exist yet — ignore
  }

  return NextResponse.json({ isConsultant: (count || 0) > 0 || hasProfile || isTeamMember });
}
