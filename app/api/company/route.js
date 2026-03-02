import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedUser, isConsultantForOwner } from '@/lib/serverAuth';

/**
 * GET /api/company
 * Fetch the logged-in user's company, or another user's company (consultant read-only view).
 * Query param: ?owner_id=xxx (optional, for consultant access)
 */
export async function GET(req) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetOwnerId = searchParams.get('owner_id') || user.id;

    // If requesting another user's company, verify consultant access
    if (targetOwnerId !== user.id) {
      const hasAccess = await isConsultantForOwner(user.id, targetOwnerId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Not authorized to view this company' }, { status: 403 });
      }
    }

    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('*')
      .eq('owner_id', targetOwnerId)
      .maybeSingle();

    return NextResponse.json({
      company: company || null,
      readOnly: targetOwnerId !== user.id,
    });
  } catch (err) {
    console.error('[Company GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/company
 * Upsert the logged-in user's company settings.
 * Auto-links all owned projects to the company.
 */
export async function PUT(req) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Validate ABN format if provided (11 digits)
    if (body.abn && !/^\d{11}$/.test(body.abn.replace(/\s/g, ''))) {
      return NextResponse.json({ error: 'ABN must be exactly 11 digits' }, { status: 400 });
    }

    // Clean ABN — strip spaces
    const cleanAbn = body.abn ? body.abn.replace(/\s/g, '') : null;

    const companyData = {
      owner_id: user.id,
      company_name: (body.company_name || '').trim(),
      entity_type: body.entity_type || null,
      aggregated_turnover_band: body.aggregated_turnover_band || null,
      financial_year_end: body.financial_year_end || '06-30',
      abn: cleanAbn,
      industry: body.industry || null,
      overseas_rd: body.overseas_rd ?? false,
      rd_for_another_entity: body.rd_for_another_entity ?? false,
      part_of_group: body.part_of_group ?? false,
      estimated_rd_spend: body.estimated_rd_spend || null,
      rd_above_150m: body.rd_above_150m ?? false,
      government_grants: body.government_grants ?? false,
      feedstock_involvement: body.feedstock_involvement ?? false,
      updated_at: new Date().toISOString(),
    };

    const { data: company, error: upsertError } = await supabaseAdmin
      .from('companies')
      .upsert(companyData, { onConflict: 'owner_id' })
      .select()
      .single();

    if (upsertError) {
      console.error('[Company PUT] Upsert error:', upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 400 });
    }

    // Auto-link all owned projects to this company
    await supabaseAdmin
      .from('projects')
      .update({ company_id: company.id })
      .eq('owner_id', user.id)
      .is('company_id', null);

    return NextResponse.json({ company });
  } catch (err) {
    console.error('[Company PUT] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
