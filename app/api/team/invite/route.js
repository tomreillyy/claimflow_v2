import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedUser } from '@/lib/serverAuth';
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function POST(req) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const { teamMemberId } = await req.json();
    if (!teamMemberId) {
      return NextResponse.json({ error: 'teamMemberId is required' }, { status: 400 });
    }

    // Verify this team member belongs to the requesting user
    const { data: member, error: memberError } = await supabaseAdmin
      .from('team_members')
      .select('id, email, full_name')
      .eq('id', teamMemberId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    // Send invitation email
    const baseUrl = process.env.NEXT_PUBLIC_BASE || process.env.NEXT_PUBLIC_APP_URL || 'https://app.claimflow.ai';

    try {
      await sgMail.send({
        to: member.email,
        from: process.env.FROM_EMAIL,
        subject: "You've been invited to ClaimFlow",
        text: [
          `Hi ${member.full_name},`,
          ``,
          `${user.email} has invited you to join ClaimFlow to help track R&D activities.`,
          ``,
          `Sign in here: ${baseUrl}/auth/login`,
          ``,
          `Just enter your email address (${member.email}) and we'll send you a secure sign-in link.`,
          ``,
          `No password needed — we use magic links for secure, passwordless authentication.`,
        ].join('\n'),
      });
    } catch (emailError) {
      console.error('[Team Invite] Failed to send invitation:', emailError?.response?.body || emailError.message);
      return NextResponse.json({ error: 'Failed to send invitation email' }, { status: 500 });
    }

    // Update invited_at timestamp
    await supabaseAdmin
      .from('team_members')
      .update({ invited_at: new Date().toISOString() })
      .eq('id', teamMemberId);

    return NextResponse.json({ ok: true, message: 'Invitation sent' });

  } catch (error) {
    console.error('Team invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
