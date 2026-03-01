import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedUser } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  const { token } = await params;

  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('owner_id')
    .eq('project_token', token)
    .is('deleted_at', null)
    .single();

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const { data: clientLink } = await supabaseAdmin
    .from('consultant_clients')
    .select('id, client_name, client_email')
    .eq('consultant_user_id', user.id)
    .eq('client_user_id', project.owner_id)
    .maybeSingle();

  if (!clientLink) {
    return NextResponse.json({ error: 'Not a consultant for this project' }, { status: 404 });
  }

  return NextResponse.json({
    clientId: clientLink.id,
    clientName: clientLink.client_name || clientLink.client_email,
  });
}
