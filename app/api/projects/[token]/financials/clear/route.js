import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyUserAndProjectAccess } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST - Clear all data from specified financials sections
 * Body: { sections: ['team', 'contractors', 'materials', 'overheads', 'depreciation'] }
 */
export async function POST(req, { params }) {
  try {
    const { token } = await params;
    const { user, project, error: authError } = await verifyUserAndProjectAccess(req, token);
    if (authError) {
      return NextResponse.json({ error: authError }, { status: !user ? 401 : 403 });
    }

    const { sections = [] } = await req.json();

    const tableMap = {
      team: 'fin_team',
      contractors: 'fin_contractors',
      materials: 'fin_materials',
      overheads: 'fin_overheads',
      depreciation: 'fin_depreciation',
    };

    const cleared = {};

    for (const section of sections) {
      const table = tableMap[section];
      if (!table) continue;

      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .eq('project_id', project.id);

      if (error) {
        console.error(`[Financials Clear] Error clearing ${section}:`, error);
        cleared[section] = false;
      } else {
        cleared[section] = true;
      }
    }

    return NextResponse.json({ ok: true, cleared });

  } catch (err) {
    console.error('[Financials Clear] Error:', err);
    return NextResponse.json({ error: 'Failed to clear data' }, { status: 500 });
  }
}
