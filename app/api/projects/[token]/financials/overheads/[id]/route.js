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
    const allowed = ['description', 'apportionment_basis', 'annual_cost', 'rd_percent'];
    const updates = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
    updates.updated_at = new Date().toISOString();

    const { data: old } = await supabaseAdmin
      .from('fin_overheads').select('*').eq('id', id).eq('project_id', project.id).single();
    if (!old) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data, error } = await supabaseAdmin
      .from('fin_overheads').update(updates).eq('id', id).eq('project_id', project.id).select().single();

    if (error) return NextResponse.json({ error: 'Failed to update' }, { status: 500 });

    await logAudit(req, {
      action: 'financials.overheads.update',
      resourceType: 'fin_overheads',
      resourceId: id,
      projectId: project.id,
      userId: user.id,
      userEmail: user.email,
      metadata: { changes: Object.fromEntries(Object.keys(updates).filter(k => k !== 'updated_at').map(k => [k, { old: old[k], new: updates[k] }])) },
    });

    return NextResponse.json({ item: data });
  } catch (error) {
    console.error('Overheads PUT error:', error);
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
      .from('fin_overheads').select('description').eq('id', id).eq('project_id', project.id).single();

    const { error } = await supabaseAdmin
      .from('fin_overheads').delete().eq('id', id).eq('project_id', project.id);
    if (error) return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });

    await logAudit(req, {
      action: 'financials.overheads.delete',
      resourceType: 'fin_overheads',
      resourceId: id,
      projectId: project.id,
      userId: user.id,
      userEmail: user.email,
      metadata: { description: old?.description },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Overheads DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
