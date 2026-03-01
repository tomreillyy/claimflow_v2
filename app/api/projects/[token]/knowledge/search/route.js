import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyUserAndProjectAccess } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  const token = params.token;

  const { user, project, error: accessError } = await verifyUserAndProjectAccess(req, token);
  if (accessError || !project) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const { data, error } = await supabaseAdmin.rpc('search_project_documents', {
    p_project_id: project.id,
    p_query: q,
    p_limit: 20
  });

  if (error) {
    console.error('[Knowledge/Search] RPC error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ results: data || [] });
}
