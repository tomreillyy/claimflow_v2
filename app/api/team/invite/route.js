import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedUser } from '@/lib/serverAuth';
import { sendEmail, getAppUrl } from '@/lib/email';

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
    const loginUrl = `${getAppUrl()}/auth/login`;

    try {
      await sendEmail({
        to: member.email,
        subject: "You've been invited to ClaimFlow",
        ctaUrl: loginUrl,
        ctaLabel: 'Sign in to ClaimFlow',
        text: [
          `Hi ${member.full_name},`,
          ``,
          `${user.email} has invited you to join ClaimFlow to help track R&D activities.`,
          ``,
          `Just enter your email address (${member.email}) and we'll send you a secure magic link — no password needed.`,
          ``,
          `Sign in here: ${loginUrl}`,
        ].join('\n'),
      });
    } catch (emailError) {
      console.error('[Team Invite] Failed to send invitation:', emailError.message);
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
