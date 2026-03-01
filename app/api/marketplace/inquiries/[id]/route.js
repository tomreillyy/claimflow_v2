import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedUser } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// PATCH — consultant updates inquiry status
export async function PATCH(req, { params }) {
  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { status } = body;

  if (!['responded', 'declined'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  // Verify this inquiry belongs to the consultant
  const { data: inquiry, error: fetchError } = await supabaseAdmin
    .from('marketplace_inquiries')
    .select('*')
    .eq('id', id)
    .eq('consultant_user_id', user.id)
    .maybeSingle();

  if (fetchError || !inquiry) {
    return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 });
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('marketplace_inquiries')
    .update({
      status,
      responded_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ inquiry: updated });
}
