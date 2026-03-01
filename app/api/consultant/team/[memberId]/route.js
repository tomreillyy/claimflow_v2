import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedUser } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * DELETE /api/consultant/team/[memberId]
 * Remove a team member (cascades to their assignments)
 */
export async function DELETE(req, { params }) {
  const { memberId } = await params;
  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  // Verify the member belongs to this lead
  const { data: member } = await supabaseAdmin
    .from('consultant_team_members')
    .select('id')
    .eq('id', memberId)
    .eq('lead_consultant_id', user.id)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from('consultant_team_members')
    .delete()
    .eq('id', memberId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
