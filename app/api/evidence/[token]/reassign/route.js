import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * PATCH - Reassign evidence to a different person
 * Used when admin enters evidence on behalf of team members
 */
export async function PATCH(req, { params }) {
  try {
    const { token } = await params;
    const { evidence_id, new_author_email } = await req.json();

    if (!evidence_id || !new_author_email) {
      return NextResponse.json({
        error: 'evidence_id and new_author_email are required'
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(new_author_email)) {
      return NextResponse.json({
        error: 'Invalid email format'
      }, { status: 400 });
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

    // Verify evidence belongs to this project
    const { data: evidence } = await supabaseAdmin
      .from('evidence')
      .select('id, author_email, project_id')
      .eq('id', evidence_id)
      .eq('project_id', project.id)
      .single();

    if (!evidence) {
      return NextResponse.json({
        error: 'Evidence not found in this project'
      }, { status: 404 });
    }

    // Update author_email
    const { error: updateError } = await supabaseAdmin
      .from('evidence')
      .update({
        author_email: new_author_email
      })
      .eq('id', evidence_id);

    if (updateError) {
      console.error('Evidence reassignment error:', updateError);
      return NextResponse.json({
        error: 'Failed to reassign evidence',
        details: updateError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: `Evidence reassigned to ${new_author_email}`
    });

  } catch (error) {
    console.error('Reassign PATCH error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
