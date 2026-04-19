import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyUserAndProjectAccess } from '@/lib/serverAuth';
import { logAudit } from '@/lib/auditLog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req, { params }) {
  try {
    const { token } = await params;
    const { user, project, error: authError } = await verifyUserAndProjectAccess(req, token);
    if (authError) {
      return NextResponse.json({ error: authError }, { status: !user ? 401 : 403 });
    }

    const body = await req.json();
    const { data, error } = await supabaseAdmin
      .from('fin_materials')
      .insert({
        project_id: project.id,
        description: body.description || '',
        activity_id: body.activity_id || null,
        invoice_date: body.invoice_date || null,
        cost: body.cost || 0,
        rd_portion: body.rd_portion ?? body.cost ?? 0,
      })
      .select('*, activity:core_activities(id, name)')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to add material' }, { status: 500 });
    }

    await logAudit(req, {
      action: 'financials.materials.create',
      resourceType: 'fin_materials',
      resourceId: data.id,
      projectId: project.id,
      userId: user.id,
      userEmail: user.email,
      metadata: { description: data.description },
    });

    return NextResponse.json({ item: data });
  } catch (error) {
    console.error('Materials POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
