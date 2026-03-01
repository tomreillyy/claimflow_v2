import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedUser } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/consultant/clients/[id]/projects
 * Returns projects owned by the specified client
 */
export async function GET(req, { params }) {
  const { id } = await params;

  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  // Verify the requesting user is the consultant for this client link
  const { data: clientLink, error: linkError } = await supabaseAdmin
    .from('consultant_clients')
    .select('*')
    .eq('id', id)
    .eq('consultant_user_id', user.id)
    .single();

  if (linkError || !clientLink) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  if (!clientLink.client_user_id) {
    return NextResponse.json({
      projects: [],
      client: {
        name: clientLink.client_name,
        email: clientLink.client_email,
      },
      message: 'Client has not signed up for ClaimFlow yet',
    });
  }

  // Fetch projects owned by the client
  const { data: projects, error: projectsError } = await supabaseAdmin
    .from('projects')
    .select('id, name, year, project_token, created_at, participants')
    .eq('owner_id', clientLink.client_user_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (projectsError) {
    return NextResponse.json({ error: projectsError.message }, { status: 500 });
  }

  const projectIds = (projects || []).map(p => p.id);

  // Batch-fetch evidence for all projects
  let allEvidence = [];
  if (projectIds.length > 0) {
    const { data: evidence } = await supabaseAdmin
      .from('evidence')
      .select('id, project_id, created_at')
      .in('project_id', projectIds)
      .or('soft_deleted.is.null,soft_deleted.eq.false');
    allEvidence = evidence || [];
  }

  // Batch-fetch costs for all projects
  let allCosts = [];
  if (projectIds.length > 0) {
    const { data: costs } = await supabaseAdmin
      .from('cost_ledger')
      .select('project_id, total_amount')
      .in('project_id', projectIds);
    allCosts = costs || [];
  }

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const enriched = (projects || []).map(project => {
    const projectEvidence = allEvidence.filter(e => e.project_id === project.id);
    const projectCosts = allCosts.filter(c => c.project_id === project.id);
    const totalCost = projectCosts.reduce((sum, c) => sum + (parseFloat(c.total_amount) || 0), 0);
    const evidenceThisWeek = projectEvidence.filter(e => new Date(e.created_at) >= oneWeekAgo).length;

    const lastActivity = projectEvidence.length > 0
      ? projectEvidence.reduce((latest, e) => {
          const d = new Date(e.created_at);
          return d > latest ? d : latest;
        }, new Date(0)).toISOString()
      : null;

    return {
      ...project,
      evidence_count: projectEvidence.length,
      evidence_this_week: evidenceThisWeek,
      participant_count: (project.participants || []).length,
      total_cost: totalCost,
      last_activity: lastActivity,
    };
  });

  // Aggregate totals for stat cards
  const totals = {
    project_count: enriched.length,
    evidence_count: allEvidence.length,
    evidence_this_week: allEvidence.filter(e => new Date(e.created_at) >= oneWeekAgo).length,
    total_cost: allCosts.reduce((sum, c) => sum + (parseFloat(c.total_amount) || 0), 0),
    team_members: new Set(enriched.flatMap(p => p.participants || [])).size,
  };

  return NextResponse.json({
    projects: enriched,
    totals,
    client: {
      name: clientLink.client_name,
      email: clientLink.client_email,
    },
  });
}
