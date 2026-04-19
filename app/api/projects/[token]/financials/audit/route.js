import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyUserAndProjectAccess } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/[token]/financials/audit
 * Fetch audit trail for financials actions
 */
export async function GET(req, { params }) {
  try {
    const { token } = await params;
    const { user, project, error: authError } = await verifyUserAndProjectAccess(req, token);
    if (authError) {
      return NextResponse.json({ error: authError }, { status: !user ? 401 : 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('audit_log')
      .select('id, created_at, user_email, action, metadata')
      .eq('project_id', project.id)
      .like('action', 'financials.%')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Audit fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch audit trail' }, { status: 500 });
    }

    return NextResponse.json({ events: data || [] });
  } catch (error) {
    console.error('Audit GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
