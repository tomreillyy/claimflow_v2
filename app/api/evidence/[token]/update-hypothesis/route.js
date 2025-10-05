import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function PATCH(req, { params }) {
  try {
    const { token } = await params;
    const { current_hypothesis } = await req.json();

    // Validate hypothesis
    const trimmedHypothesis = current_hypothesis?.trim() || '';
    if (trimmedHypothesis.length > 280) {
      return NextResponse.json({ error: 'Hypothesis must be 280 characters or less' }, { status: 400 });
    }

    // Look up project by token
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('project_token', token)
      .is('deleted_at', null)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Update hypothesis
    const { error: updateError } = await supabaseAdmin
      .from('projects')
      .update({
        current_hypothesis: trimmedHypothesis || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', project.id);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      current_hypothesis: trimmedHypothesis || null
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
