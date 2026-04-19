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

    // Fetch company + all financials data in parallel
    // Look up by company_id first, fall back to owner_id
    const companyQuery = project.company_id
      ? supabaseAdmin
          .from('companies')
          .select('id, aggregated_turnover, aggregated_turnover_band')
          .eq('id', project.company_id)
          .single()
      : supabaseAdmin
          .from('companies')
          .select('id, aggregated_turnover, aggregated_turnover_band')
          .eq('owner_id', project.owner_id)
          .maybeSingle();

    const [companyRes, teamRes, contractorsRes, materialsRes, overheadsRes, depreciationRes, adjustmentsRes] = await Promise.all([
      companyQuery,
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

    const company = companyRes.data;

    // Auto-link project to company if not already linked
    if (company && !project.company_id) {
      await supabaseAdmin
        .from('projects')
        .update({ company_id: company.id })
        .eq('id', project.id);
    }

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
