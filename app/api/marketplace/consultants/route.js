import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedUser } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — browse listed consultants with search/filter/pagination
export async function GET(req) {
  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();
  const specialization = searchParams.get('specialization');
  const state = searchParams.get('state');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = 20;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('consultant_profiles')
    .select('*', { count: 'exact' })
    .eq('is_listed', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (q) {
    query = query.or(`display_name.ilike.%${q}%,headline.ilike.%${q}%,bio.ilike.%${q}%`);
  }
  if (specialization) {
    query = query.contains('specializations', [specialization]);
  }
  if (state) {
    query = query.eq('location_state', state);
  }

  const { data: profiles, count, error } = await query;

  if (error) {
    console.error('[Marketplace] Browse error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get client counts for all returned consultants
  const userIds = profiles.map(p => p.user_id);
  let clientCounts = {};

  if (userIds.length > 0) {
    const { data: counts } = await supabaseAdmin
      .from('consultant_clients')
      .select('consultant_user_id')
      .in('consultant_user_id', userIds);

    if (counts) {
      for (const row of counts) {
        clientCounts[row.consultant_user_id] = (clientCounts[row.consultant_user_id] || 0) + 1;
      }
    }
  }

  // Resolve avatar URLs
  const enrichedProfiles = profiles.map(p => {
    let avatar_url = null;
    if (p.avatar_path) {
      const { data } = supabaseAdmin.storage
        .from('branding')
        .getPublicUrl(p.avatar_path);
      avatar_url = data?.publicUrl || null;
    }
    return {
      ...p,
      avatar_url,
      client_count: clientCounts[p.user_id] || 0,
    };
  });

  return NextResponse.json({
    profiles: enrichedProfiles,
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  });
}
