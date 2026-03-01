import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedUser } from '@/lib/serverAuth';
import { sendEmail, getAppUrl, generateMagicLink } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST — client sends inquiry to a consultant
export async function POST(req) {
  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { consultant_profile_id, message, client_name, company_name } = body;

  if (!consultant_profile_id || !message?.trim()) {
    return NextResponse.json({ error: 'Profile ID and message are required' }, { status: 400 });
  }

  // Look up the consultant profile
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('consultant_profiles')
    .select('user_id, display_name')
    .eq('id', consultant_profile_id)
    .eq('is_listed', true)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Consultant profile not found' }, { status: 404 });
  }

  // Can't inquire about yourself
  if (profile.user_id === user.id) {
    return NextResponse.json({ error: 'Cannot send inquiry to yourself' }, { status: 400 });
  }

  // Create the inquiry
  const { data: inquiry, error: insertError } = await supabaseAdmin
    .from('marketplace_inquiries')
    .insert({
      consultant_user_id: profile.user_id,
      client_user_id: user.id,
      client_email: user.email,
      client_name: client_name?.trim() || null,
      company_name: company_name?.trim() || null,
      message: message.trim(),
    })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({ error: 'You have already sent an inquiry to this advisor' }, { status: 409 });
    }
    console.error('[Marketplace] Inquiry insert error:', insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Get consultant's email for notification
  const { data: { user: consultantUser } } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);

  if (consultantUser?.email) {
    try {
      const magicLink = await generateMagicLink(consultantUser.email, '/consultant');
      const ctaUrl = magicLink || `${getAppUrl()}/consultant`;
      await sendEmail({
        to: consultantUser.email,
        subject: 'New marketplace inquiry on ClaimFlow',
        ctaUrl,
        ctaLabel: 'View your inquiries',
        text: [
          `Hi ${profile.display_name},`,
          ``,
          `You have a new inquiry from the ClaimFlow Advisor Marketplace.`,
          ``,
          `From: ${client_name || user.email}${company_name ? ` (${company_name})` : ''}`,
          `Email: ${user.email}`,
          ``,
          `Message:`,
          `${message.trim()}`,
          ``,
          `View your inquiries: ${ctaUrl}`,
        ].join('\n'),
      });
    } catch (emailError) {
      console.error('[Marketplace] Failed to send inquiry notification:', emailError?.response?.body || emailError.message);
    }
  }

  return NextResponse.json({ inquiry });
}

// GET — list inquiries (sent by client OR received by consultant)
export async function GET(req) {
  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role'); // 'consultant' or 'client'

  let query;
  if (role === 'consultant') {
    query = supabaseAdmin
      .from('marketplace_inquiries')
      .select('*')
      .eq('consultant_user_id', user.id)
      .order('created_at', { ascending: false });
  } else {
    query = supabaseAdmin
      .from('marketplace_inquiries')
      .select('*')
      .eq('client_user_id', user.id)
      .order('created_at', { ascending: false });
  }

  const { data: inquiries, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ inquiries: inquiries || [] });
}
