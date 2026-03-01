import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyUserAndProjectAccess } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(req, { params }) {
  const { token, docId } = await params;

  const { user, project, error: accessError } = await verifyUserAndProjectAccess(req, token);
  if (accessError || !project) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Verify document belongs to this project
  const { data: doc, error: fetchError } = await supabaseAdmin
    .from('project_documents')
    .select('id')
    .eq('id', docId)
    .eq('project_id', project.id)
    .eq('soft_deleted', false)
    .single();

  if (fetchError || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const { error: deleteError } = await supabaseAdmin
    .from('project_documents')
    .update({ soft_deleted: true })
    .eq('id', docId);

  if (deleteError) {
    console.error('[Knowledge/Delete] DB error:', deleteError);
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Cascade: soft-delete linked evidence record
  await supabaseAdmin
    .from('evidence')
    .update({ soft_deleted: true })
    .eq('document_id', docId)
    .eq('project_id', project.id);

  return NextResponse.json({ ok: true });
}
