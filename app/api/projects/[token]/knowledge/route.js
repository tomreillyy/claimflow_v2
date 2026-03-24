import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyUserAndProjectAccess } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  const { token } = await params;

  const { user, project, error: authError } = await verifyUserAndProjectAccess(req, token);
  if (authError) {
    const status = !user ? 401 : 403;
    return NextResponse.json({ error: authError }, { status });
  }

  const { data: documents, error } = await supabaseAdmin
    .from('project_documents')
    .select('id, file_name, file_type, file_size, extraction_status, created_at, uploaded_by')
    .eq('project_id', project.id)
    .eq('soft_deleted', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Knowledge/List] DB error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ documents: documents || [] });
}
