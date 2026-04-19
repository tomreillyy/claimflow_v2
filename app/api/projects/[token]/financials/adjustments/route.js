import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyUserAndProjectAccess } from '@/lib/serverAuth';
import { logAudit } from '@/lib/auditLog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PUT /api/projects/[token]/financials/adjustments
 * Upsert all 3 adjustment rows (feedstock, recoupment, balancing)
 * Body: { adjustments: [{ adjustment_type, applies, amount, description }] }
 */
export async function PUT(req, { params }) {
  try {
    const { token } = await params;
    const { user, project, error: authError } = await verifyUserAndProjectAccess(req, token);
    if (authError) {
      return NextResponse.json({ error: authError }, { status: !user ? 401 : 403 });
    }

    const { adjustments } = await req.json();

    // Get old values for audit
    const { data: oldAdj } = await supabaseAdmin
      .from('fin_adjustments')
      .select('*')
      .eq('project_id', project.id);

    for (const adj of adjustments) {
      const { error } = await supabaseAdmin
        .from('fin_adjustments')
        .upsert({
          project_id: project.id,
          adjustment_type: adj.adjustment_type,
          applies: adj.applies ?? false,
          amount: adj.amount ?? 0,
          description: adj.description ?? null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'project_id,adjustment_type',
        });

      if (error) {
        console.error('fin_adjustments upsert error:', error);
        return NextResponse.json({ error: 'Failed to save adjustments' }, { status: 500 });
      }
    }

    const { data: newAdj } = await supabaseAdmin
      .from('fin_adjustments')
      .select('*')
      .eq('project_id', project.id);

    await logAudit(req, {
      action: 'financials.adjustments.update',
      resourceType: 'fin_adjustments',
      resourceId: project.id,
      projectId: project.id,
      userId: user.id,
      userEmail: user.email,
      metadata: {
        old: oldAdj?.map(a => ({ type: a.adjustment_type, applies: a.applies, amount: a.amount })),
        new: adjustments.map(a => ({ type: a.adjustment_type, applies: a.applies, amount: a.amount })),
      },
    });

    return NextResponse.json({ adjustments: newAdj || [] });
  } catch (error) {
    console.error('Adjustments PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
