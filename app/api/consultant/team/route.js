import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedUser } from '@/lib/serverAuth';
import { sendEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Check if user is a lead consultant (has own clients or a marketplace profile)
 */
async function isLeadConsultant(userId) {
  const [{ count: clientCount }, { count: profileCount }] = await Promise.all([
    supabaseAdmin
      .from('consultant_clients')
      .select('id', { count: 'exact', head: true })
      .eq('consultant_user_id', userId),
    supabaseAdmin
      .from('consultant_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);
  return (clientCount || 0) > 0 || (profileCount || 0) > 0;
}

/**
 * GET /api/consultant/team
 * List the lead consultant's team members with their assignments
 */
export async function GET(req) {
  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  if (!(await isLeadConsultant(user.id))) {
    return NextResponse.json({ error: 'Not authorized as a lead consultant' }, { status: 403 });
  }

  // Fetch team members
  const { data: members, error } = await supabaseAdmin
    .from('consultant_team_members')
    .select('*')
    .eq('lead_consultant_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!members || members.length === 0) {
    return NextResponse.json({ members: [] });
  }

  // Lazy-resolve unresolved member_user_id values
  const unresolved = members.filter(m => !m.member_user_id);
  if (unresolved.length > 0) {
    const { data: { users: allUsers } } = await supabaseAdmin.auth.admin.listUsers();
    const emailToId = {};
    for (const u of (allUsers || [])) {
      if (u.email) emailToId[u.email] = u.id;
    }
    for (const member of unresolved) {
      const resolvedId = emailToId[member.member_email];
      if (resolvedId) {
        await supabaseAdmin
          .from('consultant_team_members')
          .update({ member_user_id: resolvedId })
          .eq('id', member.id);
        member.member_user_id = resolvedId;
      }
    }
  }

  // Fetch all assignments for these members
  const memberIds = members.map(m => m.id);
  const { data: assignments } = await supabaseAdmin
    .from('consultant_team_assignments')
    .select('id, team_member_id, consultant_client_id')
    .in('team_member_id', memberIds);

  // Fetch client details for assignments
  const clientIds = [...new Set((assignments || []).map(a => a.consultant_client_id))];
  let clientMap = {};
  if (clientIds.length > 0) {
    const { data: clients } = await supabaseAdmin
      .from('consultant_clients')
      .select('id, client_name, client_email')
      .in('id', clientIds);
    for (const c of (clients || [])) {
      clientMap[c.id] = c;
    }
  }

  // Enrich members with assignments
  const enrichedMembers = members.map(member => ({
    id: member.id,
    member_email: member.member_email,
    member_name: member.member_name,
    member_user_id: member.member_user_id,
    created_at: member.created_at,
    assignments: (assignments || [])
      .filter(a => a.team_member_id === member.id)
      .map(a => ({
        id: a.id,
        client_id: a.consultant_client_id,
        client_name: clientMap[a.consultant_client_id]?.client_name || null,
        client_email: clientMap[a.consultant_client_id]?.client_email || null,
      })),
  }));

  return NextResponse.json({ members: enrichedMembers });
}

/**
 * POST /api/consultant/team
 * Invite a new team member by email
 * Body: { email: string, name?: string }
 */
export async function POST(req) {
  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  if (!(await isLeadConsultant(user.id))) {
    return NextResponse.json({ error: 'Not authorized as a lead consultant' }, { status: 403 });
  }

  const body = await req.json();
  const { email, name } = body;

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Prevent inviting yourself
  if (normalizedEmail === user.email) {
    return NextResponse.json({ error: 'You cannot invite yourself' }, { status: 400 });
  }

  // Try to resolve member_user_id
  let memberUserId = null;
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
  const matched = (users || []).find(u => u.email === normalizedEmail);
  if (matched) {
    memberUserId = matched.id;
  }

  const { data: member, error } = await supabaseAdmin
    .from('consultant_team_members')
    .insert({
      lead_consultant_id: user.id,
      member_user_id: memberUserId,
      member_email: normalizedEmail,
      member_name: name?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This person is already on your team' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send notification email
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE || process.env.NEXT_PUBLIC_APP_URL || 'https://app.claimflow.ai';
    await sendEmail({
      to: normalizedEmail,
      subject: 'You\'ve been invited to an R&D advisory team on ClaimFlow',
      text: [
        `Hi${name ? ` ${name.trim()}` : ''},`,
        ``,
        `${user.email} has invited you to join their R&D advisory team on ClaimFlow.`,
        ``,
        `As a team member, you'll be able to assist with their clients' R&D Tax Incentive claims.`,
        ``,
        `Log in to ClaimFlow: ${baseUrl}/auth/login`,
        ``,
        `If you weren't expecting this, you can ignore this email.`,
      ].join('\n'),
    });
  } catch (emailError) {
    console.error('[Team] Failed to send invite email:', emailError?.response?.body || emailError.message);
  }

  return NextResponse.json({ member });
}
