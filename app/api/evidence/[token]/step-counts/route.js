import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req, { params }) {
  const token = params.token;

  // Fetch project ID from token
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('id')
    .eq('project_token', token)
    .is('deleted_at', null)
    .single();

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
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
