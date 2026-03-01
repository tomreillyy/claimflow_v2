import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedUser } from '@/lib/serverAuth';
import { sendEmail, getAppUrl, generateMagicLink } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/consultant/clients
 * Returns the consultant's linked clients with project counts
 */
export async function GET(req) {
  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  const { data: clients, error } = await supabaseAdmin
    .from('consultant_clients')
    .select('*')
    .eq('consultant_user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Lazy-resolve any null client_user_id values by checking if the client has signed up
  const unresolved = (clients || []).filter(c => !c.client_user_id);
  if (unresolved.length > 0) {
    const { data: { users: allUsers } } = await supabaseAdmin.auth.admin.listUsers();
    const emailToId = {};
    for (const u of (allUsers || [])) {
      if (u.email) emailToId[u.email] = u.id;
    }

    for (const client of unresolved) {
      const resolvedId = emailToId[client.client_email];
      if (resolvedId) {
        await supabaseAdmin
          .from('consultant_clients')
          .update({ client_user_id: resolvedId })
          .eq('id', client.id);
        client.client_user_id = resolvedId;
      }
    }
  }

  // Fetch project counts for resolved clients
  const enriched = await Promise.all((clients || []).map(async (client) => {
    let projectCount = 0;
    if (client.client_user_id) {
      const { count } = await supabaseAdmin
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', client.client_user_id)
        .is('deleted_at', null);
      projectCount = count || 0;
    }

    return {
      id: client.id,
      client_email: client.client_email,
      client_name: client.client_name,
      client_user_id: client.client_user_id,
      project_count: projectCount,
      created_at: client.created_at,
    };
  }));

  return NextResponse.json({ clients: enriched });
}

/**
 * POST /api/consultant/clients
 * Link a new client to the consultant
 * Body: { email: string, name?: string }
 */
export async function POST(req) {
  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  // Only existing consultants can add new clients
  const [{ count: clientCount }, { count: profileCount }] = await Promise.all([
    supabaseAdmin
      .from('consultant_clients')
      .select('id', { count: 'exact', head: true })
      .eq('consultant_user_id', user.id),
    supabaseAdmin
      .from('consultant_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ]);

  if ((clientCount || 0) === 0 && (profileCount || 0) === 0) {
    return NextResponse.json({ error: 'Not authorized as a consultant' }, { status: 403 });
  }

  const body = await req.json();
  const { email, name } = body;

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  // Try to resolve client_user_id
  let clientUserId = null;
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
  const matched = (users || []).find(u => u.email === email);
  if (matched) {
    clientUserId = matched.id;
  }

  const { data: client, error } = await supabaseAdmin
    .from('consultant_clients')
    .insert({
      consultant_user_id: user.id,
      client_user_id: clientUserId,
      client_email: email,
      client_name: name || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This client is already linked' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send notification email to the client with magic link
  try {
    const magicLink = await generateMagicLink(email, '/dashboard');
    const ctaUrl = magicLink || `${getAppUrl()}/auth/login`;
    await sendEmail({
      to: email,
      subject: 'An R&D advisor has linked to your ClaimFlow account',
      ctaUrl,
      ctaLabel: 'Log in to ClaimFlow',
      text: [
        `Hi,`,
        ``,
        `${user.email} has linked to your ClaimFlow account as your R&D advisor.`,
        ``,
        `They can now view your projects and evidence to help with your R&D Tax Incentive claim.`,
        ``,
        `Log in to get started: ${ctaUrl}`,
      ].join('\n'),
    });
  } catch (emailError) {
    console.error('[Consultant] Failed to send notification email:', emailError?.response?.body || emailError.message);
  }

  return NextResponse.json({ client });
}
