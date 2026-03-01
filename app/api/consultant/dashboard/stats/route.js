import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedUser } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  // Fetch all consultant_clients rows
  const { data: clients, error } = await supabaseAdmin
    .from('consultant_clients')
    .select('*')
    .eq('consultant_user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!clients || clients.length === 0) {
    return NextResponse.json({
      clients: [],
      totals: {
        client_count: 0,
        active_clients: 0,
        pending_clients: 0,
        project_count: 0,
        evidence_count: 0,
        evidence_this_week: 0,
        total_cost: 0,
      },
    });
  }

  // Lazy-resolve unresolved client_user_id values
  const unresolved = clients.filter(c => !c.client_user_id);
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

  // Collect resolved client user IDs
  const resolvedClientIds = clients
    .filter(c => c.client_user_id)
    .map(c => c.client_user_id);

  // Batch-fetch all projects for resolved clients
  let allProjects = [];
  if (resolvedClientIds.length > 0) {
    const { data: projects } = await supabaseAdmin
      .from('projects')
      .select('id, owner_id, created_at')
      .in('owner_id', resolvedClientIds)
      .is('deleted_at', null);
    allProjects = projects || [];
  }

  const allProjectIds = allProjects.map(p => p.id);

  // Batch-fetch evidence for all projects
  let allEvidence = [];
  if (allProjectIds.length > 0) {
    const { data: evidence } = await supabaseAdmin
      .from('evidence')
      .select('id, project_id, created_at')
      .in('project_id', allProjectIds)
      .or('soft_deleted.is.null,soft_deleted.eq.false');
    allEvidence = evidence || [];
  }

  // Batch-fetch costs for all projects
  let allCosts = [];
  if (allProjectIds.length > 0) {
    const { data: costs } = await supabaseAdmin
      .from('cost_ledger')
      .select('project_id, total_amount')
      .in('project_id', allProjectIds);
    allCosts = costs || [];
  }

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  // Aggregate per client
  const enrichedClients = clients.map(client => {
    if (!client.client_user_id) {
      return {
        id: client.id,
        client_name: client.client_name,
        client_email: client.client_email,
        client_user_id: null,
        created_at: client.created_at,
        project_count: 0,
        evidence_count: 0,
        evidence_this_week: 0,
        total_cost: 0,
        last_activity: null,
      };
    }

    const clientProjects = allProjects.filter(p => p.owner_id === client.client_user_id);
    const clientProjectIds = new Set(clientProjects.map(p => p.id));
    const clientEvidence = allEvidence.filter(e => clientProjectIds.has(e.project_id));
    const clientCosts = allCosts.filter(c => clientProjectIds.has(c.project_id));

    const evidenceThisWeek = clientEvidence.filter(e => new Date(e.created_at) >= oneWeekAgo).length;
    const totalCost = clientCosts.reduce((sum, c) => sum + (parseFloat(c.total_amount) || 0), 0);

    const lastActivity = clientEvidence.length > 0
      ? clientEvidence.reduce((latest, e) => {
          const d = new Date(e.created_at);
          return d > latest ? d : latest;
        }, new Date(0)).toISOString()
      : null;

    return {
      id: client.id,
      client_name: client.client_name,
      client_email: client.client_email,
      client_user_id: client.client_user_id,
      created_at: client.created_at,
      project_count: clientProjects.length,
      evidence_count: clientEvidence.length,
      evidence_this_week: evidenceThisWeek,
      total_cost: totalCost,
      last_activity: lastActivity,
    };
  });

  const activeClients = clients.filter(c => c.client_user_id).length;

  const totals = {
    client_count: clients.length,
    active_clients: activeClients,
    pending_clients: clients.length - activeClients,
    project_count: allProjects.length,
    evidence_count: allEvidence.length,
    evidence_this_week: allEvidence.filter(e => new Date(e.created_at) >= oneWeekAgo).length,
    total_cost: allCosts.reduce((sum, c) => sum + (parseFloat(c.total_amount) || 0), 0),
  };

  return NextResponse.json({ clients: enrichedClients, totals });
}
