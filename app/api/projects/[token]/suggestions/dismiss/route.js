import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req, { params }) {
  try {
    const token = params.token;
    const { fingerprint } = await req.json();

    if (!fingerprint) {
      return NextResponse.json({ error: 'Fingerprint required' }, { status: 400 });
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

    // Insert dismissal
    const { error } = await supabaseAdmin
      .from('dismissed_suggestions')
      .insert({
        project_id: project.id,
        suggestion_fingerprint: fingerprint
      });

    if (error) {
      console.error('Dismiss error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Suggestion dismiss error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
