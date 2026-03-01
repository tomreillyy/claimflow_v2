import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedUser, validateFileUpload, sanitizeFilename } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_LOGO_SIZE_MB = 2;
const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];

// GET — fetch current branding for the authenticated consultant
export async function GET(req) {
  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  const { data: branding, error } = await supabaseAdmin
    .from('consultant_branding')
    .select('company_name, logo_path')
    .eq('consultant_user_id', user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let logo_url = null;
  if (branding?.logo_path) {
    const { data } = supabaseAdmin.storage
      .from('branding')
      .getPublicUrl(branding.logo_path);
    logo_url = data?.publicUrl || null;
  }

  return NextResponse.json({
    company_name: branding?.company_name || null,
    logo_url,
  });
}

// PUT — update branding (accepts FormData with optional logo file + company_name)
export async function PUT(req) {
  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  // Verify user is actually a consultant
  const { count } = await supabaseAdmin
    .from('consultant_clients')
    .select('id', { count: 'exact', head: true })
    .eq('consultant_user_id', user.id);

  if (!count || count === 0) {
    return NextResponse.json({ error: 'Not a consultant' }, { status: 403 });
  }

  const form = await req.formData();
  const companyName = form.get('company_name') || null;
  const logoFile = form.get('logo');

  let logoPath = undefined; // undefined means don't update logo_path

  // Handle logo upload if provided
  if (logoFile && logoFile.size > 0) {
    // SVG files are text-based, skip magic byte check for them
    const isSvg = logoFile.type === 'image/svg+xml';
    const validation = await validateFileUpload(logoFile, {
      maxSizeMB: MAX_LOGO_SIZE_MB,
      allowedMimeTypes: ALLOWED_LOGO_TYPES,
      checkMagicBytes: !isSvg,
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const ext = logoFile.name?.split('.').pop() || 'png';
    const safeName = sanitizeFilename(`logo.${ext}`);
    logoPath = `${user.id}/${safeName}`;

    const arrayBuffer = await logoFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from('branding')
      .upload(logoPath, buffer, {
        contentType: logoFile.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('[Branding] Logo upload failed:', uploadError);
      return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 });
    }
  }

  // Upsert branding record
  const upsertData = {
    consultant_user_id: user.id,
    company_name: companyName,
    updated_at: new Date().toISOString(),
  };

  if (logoPath !== undefined) {
    upsertData.logo_path = logoPath;
  }

  const { error: upsertError } = await supabaseAdmin
    .from('consultant_branding')
    .upsert(upsertData, { onConflict: 'consultant_user_id' });

  if (upsertError) {
    console.error('[Branding] Upsert failed:', upsertError);
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  // Return updated branding
  let logo_url = null;
  if (logoPath) {
    const { data } = supabaseAdmin.storage
      .from('branding')
      .getPublicUrl(logoPath);
    logo_url = data?.publicUrl || null;
  } else {
    // Fetch existing logo_path if we didn't upload a new one
    const { data: existing } = await supabaseAdmin
      .from('consultant_branding')
      .select('logo_path')
      .eq('consultant_user_id', user.id)
      .maybeSingle();
    if (existing?.logo_path) {
      const { data } = supabaseAdmin.storage
        .from('branding')
        .getPublicUrl(existing.logo_path);
      logo_url = data?.publicUrl || null;
    }
  }

  return NextResponse.json({
    company_name: companyName,
    logo_url,
  });
}
