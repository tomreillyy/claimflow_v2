import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Manual link/unlink evidence to core activity
export async function PATCH(req, { params }) {
  try {
    const token = params.token;
    const { evidence_id, activity_id } = await req.json();

    if (!evidence_id) {
      return NextResponse.json({ error: 'evidence_id required' }, { status: 400 });
    }

    // Get project
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('project_token', token)
      .is('deleted_at', null)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Verify evidence belongs to project
    const { data: evidence } = await supabaseAdmin
      .from('evidence')
      .select('id, project_id')
      .eq('id', evidence_id)
      .eq('project_id', project.id)
      .single();

    if (!evidence) {
      return NextResponse.json({ error: 'Evidence not found' }, { status: 404 });
    }

    // If activity_id provided, verify it exists and belongs to project
    if (activity_id) {
      const { data: activity } = await supabaseAdmin
        .from('core_activities')
        .select('id, name')
        .eq('id', activity_id)
        .eq('project_id', project.id)
        .single();

      if (!activity) {
        return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
      }
    }

    // Update evidence with manual link
    const updates = {
      linked_activity_id: activity_id || null,
      link_source: 'manual',
      link_reason: null, // Clear AI reason when manually set
      link_updated_at: new Date().toISOString()
    };

    const { data: updated, error } = await supabaseAdmin
      .from('evidence')
      .update(updates)
      .eq('id', evidence_id)
      .eq('project_id', project.id)
      .select()
      .single();

    if (error) {
      console.error('[Link] Update failed:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      evidence_id,
      linked_activity_id: activity_id || null,
      link_source: 'manual'
    });

  } catch (error) {
    console.error('[Link] Error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
