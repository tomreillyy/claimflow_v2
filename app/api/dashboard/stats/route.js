import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];

    // Verify the token with Supabase
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch projects for the user (either as owner or participant)
    const { data: projects, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select('id, name, year, project_token, created_at, participants')
      .or(`owner_id.eq.${user.id},participants.cs.{${user.email}}`)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (projectsError) {
      console.error('Projects error:', projectsError);
      return NextResponse.json({ error: projectsError.message }, { status: 400 });
    }

    if (!projects || projects.length === 0) {
      return NextResponse.json({
        projects: [],
        totals: {
          projectCount: 0,
          evidenceCount: 0,
          evidenceThisWeek: 0,
          totalCost: 0,
          avgCoverage: 0
        }
      });
    }

    const projectIds = projects.map(p => p.id);

    // Fetch evidence counts and step coverage per project
    const { data: evidence, error: evidenceError } = await supabaseAdmin
      .from('evidence')
      .select('id, project_id, systematic_step_primary, created_at')
      .in('project_id', projectIds)
      .or('soft_deleted.is.null,soft_deleted.eq.false');

    if (evidenceError) {
      console.error('Evidence error:', evidenceError);
    }

    // Fetch cost totals per project
    const { data: costs, error: costsError } = await supabaseAdmin
      .from('cost_ledger')
      .select('project_id, total_amount')
      .in('project_id', projectIds);

    if (costsError) {
      console.error('Costs error:', costsError);
    }

    // Calculate one week ago for "this week" count
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Process data per project
    const projectStats = projects.map(project => {
      const projectEvidence = (evidence || []).filter(e => e.project_id === project.id);
      const projectCosts = (costs || []).filter(c => c.project_id === project.id);

      // Count evidence
      const evidenceCount = projectEvidence.length;

      // Count evidence this week
      const evidenceThisWeek = projectEvidence.filter(e =>
        new Date(e.created_at) >= oneWeekAgo
      ).length;

      // Calculate total cost
      const totalCost = projectCosts.reduce((sum, c) => sum + (parseFloat(c.total_amount) || 0), 0);

      // Calculate step coverage (how many of the 5 systematic steps have evidence)
      const steps = ['Hypothesis', 'Experiment', 'Observation', 'Evaluation', 'Conclusion'];
      const stepsPresent = new Set(
        projectEvidence
          .map(e => e.systematic_step_primary)
          .filter(s => steps.includes(s))
      );
      const coveragePercent = (stepsPresent.size / 5) * 100;

      // Find most recent evidence date
      const lastActivity = projectEvidence.length > 0
        ? projectEvidence.reduce((latest, e) => {
            const date = new Date(e.created_at);
            return date > latest ? date : latest;
          }, new Date(0))
        : null;

      return {
        ...project,
        evidenceCount,
        evidenceThisWeek,
        totalCost,
        coveragePercent: Math.round(coveragePercent),
        stepsPresent: stepsPresent.size,
        lastActivity: lastActivity ? lastActivity.toISOString() : null
      };
    });

    // Calculate totals
    const totals = {
      projectCount: projects.length,
      evidenceCount: (evidence || []).length,
      evidenceThisWeek: (evidence || []).filter(e => new Date(e.created_at) >= oneWeekAgo).length,
      totalCost: projectStats.reduce((sum, p) => sum + p.totalCost, 0),
      avgCoverage: Math.round(
        projectStats.reduce((sum, p) => sum + p.coveragePercent, 0) / projects.length
      )
    };

    return NextResponse.json({
      projects: projectStats,
      totals
    });
  } catch (error) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
