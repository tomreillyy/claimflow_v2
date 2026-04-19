import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyUserAndProjectAccess } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/[token]/financials
 * Single fetch — returns all financials data for a project
 */
export async function GET(req, { params }) {
  try {
    const { token } = await params;
    const { user, project, error: authError } = await verifyUserAndProjectAccess(req, token);
    if (authError) {
      return NextResponse.json({ error: authError }, { status: !user ? 401 : 403 });
    }

    // Fetch company for turnover
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('aggregated_turnover, aggregated_turnover_band')
      .eq('id', project.company_id)
      .single();

    // Fetch all financials data in parallel
    const [teamRes, contractorsRes, materialsRes, overheadsRes, depreciationRes, adjustmentsRes] = await Promise.all([
      supabaseAdmin
        .from('fin_team')
        .select('*, splits:fin_activity_splits(id, activity_id, hours)')
        .eq('project_id', project.id)
        .order('display_order', { ascending: true }),
      supabaseAdmin
        .from('fin_contractors')
        .select('*, activity:core_activities(id, name)')
        .eq('project_id', project.id)
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from('fin_materials')
        .select('*, activity:core_activities(id, name)')
        .eq('project_id', project.id)
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from('fin_overheads')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from('fin_depreciation')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from('fin_adjustments')
        .select('*')
        .eq('project_id', project.id),
    ]);

    return NextResponse.json({
      turnover: company?.aggregated_turnover || null,
      turnoverBand: company?.aggregated_turnover_band || null,
      team: teamRes.data || [],
      contractors: contractorsRes.data || [],
      materials: materialsRes.data || [],
      overheads: overheadsRes.data || [],
      depreciation: depreciationRes.data || [],
      adjustments: adjustmentsRes.data || [],
    });
  } catch (error) {
    console.error('Financials GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
