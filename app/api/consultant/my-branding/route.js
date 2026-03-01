import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedUser } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — authenticated, returns the branding of the consultant this user belongs to
// If user is a client of multiple consultants, returns the first one found
export async function GET(req) {
  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  // Find consultant link for this user (by user ID or email)
  const { data: link, error: linkError } = await supabaseAdmin
    .from('consultant_clients')
    .select('consultant_user_id')
    .or(`client_user_id.eq.${user.id},client_email.eq.${user.email}`)
    .limit(1)
    .maybeSingle();

  if (linkError || !link) {
    return NextResponse.json({ company_name: null, logo_url: null });
  }

  // Fetch the consultant's branding
  const { data: branding, error: brandingError } = await supabaseAdmin
    .from('consultant_branding')
    .select('company_name, logo_path')
    .eq('consultant_user_id', link.consultant_user_id)
    .maybeSingle();

  if (brandingError || !branding) {
    return NextResponse.json({ company_name: null, logo_url: null });
  }

  let logo_url = null;
  if (branding.logo_path) {
    const { data } = supabaseAdmin.storage
      .from('branding')
      .getPublicUrl(branding.logo_path);
    logo_url = data?.publicUrl || null;
  }

  return NextResponse.json({
    company_name: branding.company_name || null,
    logo_url,
  });
}
