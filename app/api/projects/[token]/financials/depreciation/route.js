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
      .from('fin_depreciation')
      .insert({
        project_id: project.id,
        description: body.description || '',
        purchase_date: body.purchase_date || null,
        purchase_cost: body.purchase_cost || 0,
        effective_life_years: body.effective_life_years || 1,
        method: body.method || 'prime_cost',
        rd_use_percent: body.rd_use_percent || 0,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: 'Failed to add depreciation item' }, { status: 500 });

    await logAudit(req, {
      action: 'financials.depreciation.create',
      resourceType: 'fin_depreciation',
      resourceId: data.id,
      projectId: project.id,
      userId: user.id,
      userEmail: user.email,
      metadata: { description: data.description },
    });

    return NextResponse.json({ item: data });
  } catch (error) {
    console.error('Depreciation POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
