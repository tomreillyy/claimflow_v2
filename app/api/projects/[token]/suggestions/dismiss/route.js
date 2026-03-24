import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyUserAndProjectAccess } from '@/lib/serverAuth';

export async function POST(req, { params }) {
  try {
    const token = params.token;

    const { user, project, error: authError } = await verifyUserAndProjectAccess(req, token);
    if (authError) {
      const status = !user ? 401 : 403;
      return NextResponse.json({ error: authError }, { status });
    }

    const { fingerprint } = await req.json();

    if (!fingerprint) {
      return NextResponse.json({ error: 'Fingerprint required' }, { status: 400 });
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
