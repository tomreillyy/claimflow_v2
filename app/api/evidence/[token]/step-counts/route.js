import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyUserAndProjectAccess } from '@/lib/serverAuth';

export async function GET(req, { params }) {
  const { token } = await params;

  const { user, project, error: authError } = await verifyUserAndProjectAccess(req, token);
  if (authError) {
    const status = !user ? 401 : 403;
    return NextResponse.json({ error: authError }, { status });
  }

  // Fetch all evidence for this project (non-soft-deleted)
  const { data: items, error } = await supabaseAdmin
    .from('evidence')
    .select('systematic_step_primary')
    .eq('project_id', project.id)
    .or('soft_deleted.is.null,soft_deleted.eq.false');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Count steps, excluding 'Unknown'
  const counts = {
    hypothesis: 0,
    experiment: 0,
    observation: 0,
    evaluation: 0,
    conclusion: 0
  };

  (items || []).forEach(item => {
    const step = item.systematic_step_primary;
    if (step && step !== 'Unknown') {
      const key = step.toLowerCase();
      if (counts.hasOwnProperty(key)) {
        counts[key]++;
      }
    }
  });

  return NextResponse.json(counts);
}
