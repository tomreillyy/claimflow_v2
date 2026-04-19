import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyUserAndProjectAccess } from '@/lib/serverAuth';
import { logAudit } from '@/lib/auditLog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PUT /api/projects/[token]/financials/team/[id]/splits
 * Bulk upsert activity splits for a team member
 * Body: { splits: [{ activity_id, hours }] }
 */
export async function PUT(req, { params }) {
  try {
    const { token, id } = await params;
    const { user, project, error: authError } = await verifyUserAndProjectAccess(req, token);
    if (authError) {
      return NextResponse.json({ error: authError }, { status: !user ? 401 : 403 });
    }

    // Verify team member belongs to this project
    const { data: member } = await supabaseAdmin
      .from('fin_team')
      .select('id, person_name, project_id')
      .eq('id', id)
      .eq('project_id', project.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    const { splits } = await req.json();

    // Get existing splits for audit
    const { data: oldSplits } = await supabaseAdmin
      .from('fin_activity_splits')
      .select('*')
      .eq('team_member_id', id);

    // Delete existing splits and re-insert
    await supabaseAdmin
      .from('fin_activity_splits')
      .delete()
      .eq('team_member_id', id);

    if (splits && splits.length > 0) {
      const rows = splits
        .filter(s => s.activity_id)
        .map(s => ({
          team_member_id: id,
          activity_id: s.activity_id,
          hours: s.hours || 0,
        }));

      if (rows.length > 0) {
        const { error } = await supabaseAdmin
          .from('fin_activity_splits')
          .insert(rows);

        if (error) {
          console.error('fin_activity_splits insert error:', error);
          return NextResponse.json({ error: 'Failed to save splits' }, { status: 500 });
        }
      }
    }

    // Fetch updated splits
    const { data: newSplits } = await supabaseAdmin
      .from('fin_activity_splits')
      .select('id, activity_id, hours')
      .eq('team_member_id', id);

    await logAudit(req, {
      action: 'financials.splits.update',
      resourceType: 'fin_activity_splits',
      resourceId: id,
      projectId: project.id,
      userId: user.id,
      userEmail: user.email,
      metadata: {
        person_name: member.person_name,
        old_splits: oldSplits?.map(s => ({ activity_id: s.activity_id, hours: s.hours })),
        new_splits: splits,
      },
    });

    return NextResponse.json({ splits: newSplits || [] });
  } catch (error) {
    console.error('Splits PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
