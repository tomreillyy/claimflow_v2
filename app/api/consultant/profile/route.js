import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedUser, validateFileUpload, sanitizeFilename } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_AVATAR_SIZE_MB = 2;
const ALLOWED_AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];

const VALID_STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];
const VALID_SPECIALIZATIONS = [
  'Software & IT',
  'Manufacturing',
  'Biotech & Pharma',
  'Agriculture',
  'Mining & Resources',
  'Professional Services',
  'Construction & Engineering',
  'Food & Beverage',
];

// GET — fetch own marketplace profile for editing
export async function GET(req) {
  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  const { data: profile, error } = await supabaseAdmin
    .from('consultant_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let avatar_url = null;
  if (profile?.avatar_path) {
    const { data } = supabaseAdmin.storage
      .from('branding')
      .getPublicUrl(profile.avatar_path);
    avatar_url = data?.publicUrl || null;
  }

  // If no profile yet, fetch branding defaults to pre-fill
  let defaults = null;
  if (!profile) {
    const { data: branding } = await supabaseAdmin
      .from('consultant_branding')
      .select('company_name, logo_path')
      .eq('consultant_user_id', user.id)
      .maybeSingle();

    if (branding) {
      let branding_logo_url = null;
      if (branding.logo_path) {
        const { data } = supabaseAdmin.storage
          .from('branding')
          .getPublicUrl(branding.logo_path);
        branding_logo_url = data?.publicUrl || null;
      }
      defaults = {
        display_name: branding.company_name || '',
        avatar_url: branding_logo_url,
      };
    }
  }

  return NextResponse.json({
    profile: profile || null,
    avatar_url,
    defaults,
  });
}

// PUT — create or update marketplace profile (FormData with optional avatar)
export async function PUT(req) {
  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  const form = await req.formData();
  const displayName = form.get('display_name')?.trim();
  const headline = form.get('headline')?.trim() || null;
  const bio = form.get('bio')?.trim() || null;
  const specializations = JSON.parse(form.get('specializations') || '[]');
  const yearsExperience = form.get('years_experience') ? parseInt(form.get('years_experience')) : null;
  const locationState = form.get('location_state')?.trim() || null;
  const locationCity = form.get('location_city')?.trim() || null;
  const websiteUrl = form.get('website_url')?.trim() || null;
  const isListed = form.get('is_listed') === 'true';
  const avatarFile = form.get('avatar');

  if (!displayName) {
    return NextResponse.json({ error: 'Display name is required' }, { status: 400 });
  }

  if (bio && bio.length > 2000) {
    return NextResponse.json({ error: 'Bio must be under 2000 characters' }, { status: 400 });
  }

  // Validate specializations
  const validSpecs = specializations.filter(s => VALID_SPECIALIZATIONS.includes(s));

  // Validate state
  if (locationState && !VALID_STATES.includes(locationState)) {
    return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
  }

  let avatarPath = undefined;

  // Handle avatar upload if provided
  if (avatarFile && avatarFile.size > 0) {
    const isSvg = avatarFile.type === 'image/svg+xml';
    const validation = await validateFileUpload(avatarFile, {
      maxSizeMB: MAX_AVATAR_SIZE_MB,
      allowedMimeTypes: ALLOWED_AVATAR_TYPES,
      checkMagicBytes: !isSvg,
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const ext = avatarFile.name?.split('.').pop() || 'png';
    const safeName = sanitizeFilename(`avatar.${ext}`);
    avatarPath = `${user.id}/${safeName}`;

    const arrayBuffer = await avatarFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from('branding')
      .upload(avatarPath, buffer, {
        contentType: avatarFile.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('[Profile] Avatar upload failed:', uploadError);
      return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 });
    }
  }

  const upsertData = {
    user_id: user.id,
    display_name: displayName,
    headline,
    bio,
    specializations: validSpecs,
    years_experience: yearsExperience,
    location_state: locationState,
    location_city: locationCity,
    website_url: websiteUrl,
    is_listed: isListed,
    updated_at: new Date().toISOString(),
  };

  if (avatarPath !== undefined) {
    upsertData.avatar_path = avatarPath;
  }

  const { data: profile, error: upsertError } = await supabaseAdmin
    .from('consultant_profiles')
    .upsert(upsertData, { onConflict: 'user_id' })
    .select()
    .single();

  if (upsertError) {
    console.error('[Profile] Upsert failed:', upsertError);
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  let avatar_url = null;
  const finalAvatarPath = avatarPath || profile.avatar_path;
  if (finalAvatarPath) {
    const { data } = supabaseAdmin.storage
      .from('branding')
      .getPublicUrl(finalAvatarPath);
    avatar_url = data?.publicUrl || null;
  }

  return NextResponse.json({ profile, avatar_url });
}
