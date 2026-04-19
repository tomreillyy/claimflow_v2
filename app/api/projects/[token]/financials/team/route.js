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
    const { person_name, person_email, base_salary, super_amount, payroll_tax_amount, workers_comp_amount, leave_accrual_amount } = body;

    // Get max display_order
    const { data: maxOrder } = await supabaseAdmin
      .from('fin_team')
      .select('display_order')
      .eq('project_id', project.id)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const { data, error } = await supabaseAdmin
      .from('fin_team')
      .insert({
        project_id: project.id,
        person_name: person_name || 'New Person',
        person_email: person_email || null,
        base_salary: base_salary || 0,
        super_amount: super_amount || 0,
        payroll_tax_amount: payroll_tax_amount || 0,
        workers_comp_amount: workers_comp_amount || 0,
        leave_accrual_amount: leave_accrual_amount || 0,
        display_order: (maxOrder?.display_order || 0) + 1,
      })
      .select()
      .single();

    if (error) {
      console.error('fin_team insert error:', error);
      return NextResponse.json({ error: 'Failed to add team member' }, { status: 500 });
    }

    await logAudit(req, {
      action: 'financials.team.create',
      resourceType: 'fin_team',
      resourceId: data.id,
      projectId: project.id,
      userId: user.id,
      userEmail: user.email,
      metadata: { person_name: data.person_name },
    });

    return NextResponse.json({ member: data });
  } catch (error) {
    console.error('Team POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
