import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — return up to 3 random listed consultant profiles (no auth required)
export async function GET() {
  const { data: profiles, error } = await supabaseAdmin
    .from('consultant_profiles')
    .select('id, display_name, headline, specializations, location_state, location_city, years_experience, avatar_path')
    .eq('is_listed', true)
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Shuffle and pick up to 3
  const shuffled = profiles.sort(() => Math.random() - 0.5).slice(0, 3);

  // Resolve avatar URLs
  const enriched = shuffled.map(p => {
    let avatar_url = null;
    if (p.avatar_path) {
      const { data } = supabaseAdmin.storage
        .from('branding')
        .getPublicUrl(p.avatar_path);
      avatar_url = data?.publicUrl || null;
    }
    const { avatar_path, ...rest } = p;
    return { ...rest, avatar_url };
  });

  return NextResponse.json({ profiles: enriched });
}
