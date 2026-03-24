import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyUserAndProjectAccess } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/[token]/costs/non-labour
 * Fetch all non-labour costs for a project
 */
export async function GET(req, { params }) {
  try {
    const { token } = await params;

    const { user, project, error: authError } = await verifyUserAndProjectAccess(req, token);
    if (authError) {
      const status = !user ? 401 : 403;
      return NextResponse.json({ error: authError }, { status });
    }

    const { data: costs, error } = await supabaseAdmin
      .from('non_labour_costs')
      .select('*, activity:core_activities(id, name)')
      .eq('project_id', project.id)
      .order('cost_category', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Non-labour costs fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch costs' }, { status: 500 });
    }

    return NextResponse.json({ costs: costs || [] });

  } catch (error) {
    console.error('Non-labour GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/projects/[token]/costs/non-labour
 * Create a new non-labour cost entry
 *
 * Body: { costCategory, description, vendorName, month, amount, rdPercent, activityId, basisText }
 */
export async function POST(req, { params }) {
  try {
    const { token } = await params;

    const { user, project, error: authError } = await verifyUserAndProjectAccess(req, token);
    if (authError) {
      const status = !user ? 401 : 403;
      return NextResponse.json({ error: authError }, { status });
    }

    const body = await req.json();
    const { costCategory, description, vendorName, month, amount, rdPercent, activityId, basisText } = body;

    if (!costCategory || !description || !month || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['contractor', 'cloud_software'].includes(costCategory)) {
      return NextResponse.json({ error: 'Invalid cost category' }, { status: 400 });
    }

    const { data: cost, error } = await supabaseAdmin
      .from('non_labour_costs')
      .insert({
        project_id: project.id,
        cost_category: costCategory,
        description,
        vendor_name: vendorName || null,
        month,
        amount: parseFloat(amount),
        rd_percent: rdPercent != null ? parseFloat(rdPercent) : 100,
        activity_id: activityId || null,
        basis_text: basisText || `Manual entry (${new Date().toLocaleDateString('en-AU')})`,
        ai_suggested: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Non-labour insert error:', error);
      return NextResponse.json({ error: 'Failed to create cost entry' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, cost });

  } catch (error) {
    console.error('Non-labour POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/projects/[token]/costs/non-labour
 * Update a non-labour cost entry
 *
 * Body: { id, description, vendorName, month, amount, rdPercent, activityId, basisText }
 */
export async function PUT(req, { params }) {
  try {
    const { token } = await params;

    const { user, project, error: authError } = await verifyUserAndProjectAccess(req, token);
    if (authError) {
      const status = !user ? 401 : 403;
      return NextResponse.json({ error: authError }, { status });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing cost ID' }, { status: 400 });
    }

    const updateData = {};
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.vendorName !== undefined) updateData.vendor_name = updates.vendorName;
    if (updates.month !== undefined) updateData.month = updates.month;
    if (updates.amount !== undefined) updateData.amount = parseFloat(updates.amount);
    if (updates.rdPercent !== undefined) updateData.rd_percent = parseFloat(updates.rdPercent);
    if (updates.activityId !== undefined) updateData.activity_id = updates.activityId || null;
    if (updates.basisText !== undefined) updateData.basis_text = updates.basisText;
    updateData.updated_at = new Date().toISOString();

    const { data: cost, error } = await supabaseAdmin
      .from('non_labour_costs')
      .update(updateData)
      .eq('id', id)
      .eq('project_id', project.id)
      .select()
      .single();

    if (error) {
      console.error('Non-labour update error:', error);
      return NextResponse.json({ error: 'Failed to update cost entry' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, cost });

  } catch (error) {
    console.error('Non-labour PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[token]/costs/non-labour
 * Delete a non-labour cost entry
 *
 * Body: { id }
 */
export async function DELETE(req, { params }) {
  try {
    const { token } = await params;

    const { user, project, error: authError } = await verifyUserAndProjectAccess(req, token);
    if (authError) {
      const status = !user ? 401 : 403;
      return NextResponse.json({ error: authError }, { status });
    }

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing cost ID' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('non_labour_costs')
      .delete()
      .eq('id', id)
      .eq('project_id', project.id);

    if (error) {
      console.error('Non-labour delete error:', error);
      return NextResponse.json({ error: 'Failed to delete cost entry' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('Non-labour DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
