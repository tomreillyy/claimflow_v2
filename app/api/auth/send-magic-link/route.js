import { NextResponse } from 'next/server';
import { generateMagicLink, sendEmail, getAppUrl } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/send-magic-link
 * Generates a Supabase magic link and sends it via Mailjet.
 * Replaces client-side supabase.auth.signInWithOtp() which relies on Supabase SMTP.
 * Body: { email: string }
 */
export async function POST(req) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Generate the magic link via Supabase Admin API
  const magicLink = await generateMagicLink(normalizedEmail, '/auth/callback');

  if (!magicLink) {
    // User may not exist yet, or Supabase errored — show generic success
    // to avoid leaking whether an email is registered
    return NextResponse.json({ ok: true });
  }

  // Send the magic link email via Mailjet
  try {
    await sendEmail({
      to: normalizedEmail,
      subject: 'Your ClaimFlow sign-in link',
      ctaUrl: magicLink,
      ctaLabel: 'Sign in to ClaimFlow',
      text: [
        `Hi,`,
        ``,
        `Click the link below to sign in to ClaimFlow:`,
        ``,
        `${magicLink}`,
        ``,
        `This link expires in 1 hour. If you didn't request this, you can safely ignore this email.`,
      ].join('\n'),
    });
  } catch (emailError) {
    console.error('[Auth] Failed to send magic link email:', emailError?.response?.body || emailError.message);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
