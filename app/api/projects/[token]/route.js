import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET - Fetch project by token
export async function GET(req, { params }) {
  try {
    const { token } = await params;

    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('project_token', token)
      .is('deleted_at', null)
      .single();

    if (error || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Project fetch error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
