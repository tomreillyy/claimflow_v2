import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedUser } from '@/lib/serverAuth';

// POST /api/projects/[token]/core-activities/regenerate
// Deletes all draft activities and re-runs AI generation
export async function POST(req, { params }) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError) return NextResponse.json({ error: authError }, { status: 401 });

    const { token } = await params;

    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id, name, year, current_hypothesis')
      .eq('project_token', token)
      .is('deleted_at', null)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Delete draft activities (keep adopted ones)
    await supabaseAdmin
      .from('core_activities')
      .delete()
      .eq('project_id', project.id)
      .eq('status', 'draft');

    // Delegate to GET handler logic by fetching internally
    // Return signal to client to re-fetch
    return NextResponse.json({ regenerating: true });
  } catch (error) {
    console.error('Regenerate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
