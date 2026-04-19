import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyUserAndProjectAccess } from '@/lib/serverAuth';
import { logAudit } from '@/lib/auditLog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(req, { params }) {
  try {
    const { token, id } = await params;
    const { user, project, error: authError } = await verifyUserAndProjectAccess(req, token);
    if (authError) {
      return NextResponse.json({ error: authError }, { status: !user ? 401 : 403 });
    }

    const body = await req.json();
    const allowed = ['person_name', 'person_email', 'base_salary', 'super_amount', 'payroll_tax_amount', 'workers_comp_amount', 'leave_accrual_amount', 'is_associate', 'paid_in_cash', 'display_order'];
    const updates = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
    updates.updated_at = new Date().toISOString();

    // Get old values for audit
    const { data: old } = await supabaseAdmin
      .from('fin_team')
      .select('*')
      .eq('id', id)
      .eq('project_id', project.id)
      .single();

    if (!old) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from('fin_team')
      .update(updates)
      .eq('id', id)
      .eq('project_id', project.id)
      .select()
      .single();

    if (error) {
      console.error('fin_team update error:', error);
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }

    // Log changed fields
    const changedFields = {};
    for (const key of Object.keys(updates)) {
      if (key === 'updated_at') continue;
      if (String(old[key]) !== String(updates[key])) {
        changedFields[key] = { old: old[key], new: updates[key] };
      }
    }

    if (Object.keys(changedFields).length > 0) {
      await logAudit(req, {
        action: 'financials.team.update',
        resourceType: 'fin_team',
        resourceId: id,
        projectId: project.id,
        userId: user.id,
        userEmail: user.email,
        metadata: { person_name: data.person_name, changes: changedFields },
      });
    }

    return NextResponse.json({ member: data });
  } catch (error) {
    console.error('Team PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { token, id } = await params;
    const { user, project, error: authError } = await verifyUserAndProjectAccess(req, token);
    if (authError) {
      return NextResponse.json({ error: authError }, { status: !user ? 401 : 403 });
    }

    const { data: old } = await supabaseAdmin
      .from('fin_team')
      .select('person_name')
      .eq('id', id)
      .eq('project_id', project.id)
      .single();

    const { error } = await supabaseAdmin
      .from('fin_team')
      .delete()
      .eq('id', id)
      .eq('project_id', project.id);

    if (error) {
      console.error('fin_team delete error:', error);
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }

    await logAudit(req, {
      action: 'financials.team.delete',
      resourceType: 'fin_team',
      resourceId: id,
      projectId: project.id,
      userId: user.id,
      userEmail: user.email,
      metadata: { person_name: old?.person_name },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Team DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
