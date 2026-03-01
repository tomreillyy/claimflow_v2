import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedUser } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PUT /api/consultant/team/[memberId]/assignments
 * Set the full list of client assignments for a team member
 * Body: { client_ids: string[] } — array of consultant_clients IDs
 */
export async function PUT(req, { params }) {
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

  const body = await req.json();
  const { client_ids } = body;

  if (!Array.isArray(client_ids)) {
    return NextResponse.json({ error: 'client_ids must be an array' }, { status: 400 });
  }

  // Verify all client_ids belong to this lead
  if (client_ids.length > 0) {
    const { data: validClients } = await supabaseAdmin
      .from('consultant_clients')
      .select('id')
      .in('id', client_ids)
      .eq('consultant_user_id', user.id);

    const validIds = new Set((validClients || []).map(c => c.id));
    const invalid = client_ids.filter(id => !validIds.has(id));
    if (invalid.length > 0) {
      return NextResponse.json({ error: 'Some client IDs are invalid' }, { status: 400 });
    }
  }

  // Delete existing assignments
  await supabaseAdmin
    .from('consultant_team_assignments')
    .delete()
    .eq('team_member_id', memberId);

  // Insert new assignments
  if (client_ids.length > 0) {
    const rows = client_ids.map(clientId => ({
      team_member_id: memberId,
      consultant_client_id: clientId,
    }));

    const { error } = await supabaseAdmin
      .from('consultant_team_assignments')
      .insert(rows);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Return updated assignments
  const { data: assignments } = await supabaseAdmin
    .from('consultant_team_assignments')
    .select('id, consultant_client_id')
    .eq('team_member_id', memberId);

  return NextResponse.json({ assignments: assignments || [] });
}
