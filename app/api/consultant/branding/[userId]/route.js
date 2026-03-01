import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — public (no auth), returns branding for a given consultant user ID
// Used by the login page when ?ref= param is present
export async function GET(req, { params }) {
  const { userId } = await params;

  if (!userId) {
    return NextResponse.json({ company_name: null, logo_url: null });
  }

  const { data: branding, error } = await supabaseAdmin
    .from('consultant_branding')
    .select('company_name, logo_path')
    .eq('consultant_user_id', userId)
    .maybeSingle();

  if (error || !branding) {
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
