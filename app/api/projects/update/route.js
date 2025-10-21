import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedUser } from '@/lib/serverAuth';

export async function PATCH(req) {
  try {
    // Authenticate user
    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 403 });
    }

    const { projectId, name, year, project_overview } = await req.json();

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 });
    }

    // Verify user owns or is participant in project
    const { data: project, error: fetchError } = await supabaseAdmin
      .from('projects')
      .select('owner_id, participants')
      .eq('id', projectId)
      .single();

    if (fetchError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if user is owner or participant
    const isOwner = project.owner_id === user.id;
    const isParticipant = project.participants && project.participants.includes(user.email);

    if (!isOwner && !isParticipant) {
      return NextResponse.json({ error: 'Not authorized to edit this project' }, { status: 403 });
    }

    // Build update object with only provided fields
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (year !== undefined) updates.year = year;
    if (project_overview !== undefined) updates.project_overview = project_overview;

    // Update project
    const { data, error } = await supabaseAdmin
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      console.error('[Projects/Update] Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, project: data });
  } catch (error) {
    console.error('[Projects/Update] Error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
