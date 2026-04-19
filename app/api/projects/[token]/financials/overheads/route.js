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
      .from('fin_overheads')
      .insert({
        project_id: project.id,
        description: body.description || '',
        apportionment_basis: body.apportionment_basis || 'labour_ratio',
        annual_cost: body.annual_cost || 0,
        rd_percent: body.rd_percent || 0,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: 'Failed to add overhead' }, { status: 500 });

    await logAudit(req, {
      action: 'financials.overheads.create',
      resourceType: 'fin_overheads',
      resourceId: data.id,
      projectId: project.id,
      userId: user.id,
      userEmail: user.email,
      metadata: { description: data.description },
    });

    return NextResponse.json({ item: data });
  } catch (error) {
    console.error('Overheads POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
