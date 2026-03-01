import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedUser } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — get full profile detail for a listed consultant
export async function GET(req, { params }) {
  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  const { profileId } = await params;

  const { data: profile, error } = await supabaseAdmin
    .from('consultant_profiles')
    .select('*')
    .eq('id', profileId)
    .eq('is_listed', true)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  // Get avatar URL
  let avatar_url = null;
  if (profile.avatar_path) {
    const { data } = supabaseAdmin.storage
      .from('branding')
      .getPublicUrl(profile.avatar_path);
    avatar_url = data?.publicUrl || null;
  }

  // Get client count
  const { count: clientCount } = await supabaseAdmin
    .from('consultant_clients')
    .select('id', { count: 'exact', head: true })
    .eq('consultant_user_id', profile.user_id);

  // Check if current user has already sent an inquiry
  const { data: existingInquiry } = await supabaseAdmin
    .from('marketplace_inquiries')
    .select('id, status, created_at')
    .eq('consultant_user_id', profile.user_id)
    .eq('client_user_id', user.id)
    .maybeSingle();

  return NextResponse.json({
    profile: {
      ...profile,
      avatar_url,
      client_count: clientCount || 0,
    },
    existing_inquiry: existingInquiry || null,
  });
}
