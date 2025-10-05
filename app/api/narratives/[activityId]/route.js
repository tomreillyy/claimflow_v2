import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET: Fetch cached narrative (never generates)
export async function GET(req, { params }) {
  try {
    const { activityId } = await params;

    if (!activityId) {
      return NextResponse.json({ error: 'activity_id required' }, { status: 400 });
    }

    // Fetch cached narrative from storage
    const { data: narrative, error } = await supabaseAdmin
      .from('activity_narratives')
      .select('text, confidence, missing_steps, generated_at, input_hash')
      .eq('activity_id', activityId)
      .single();

    if (error) {
      // No narrative found - not an error, just uncached
      if (error.code === 'PGRST116') {
        return NextResponse.json({ cached: false });
      }
      console.error('[Narrative GET] Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      cached: true,
      text: narrative.text,
      confidence: narrative.confidence,
      missing_steps: narrative.missing_steps || [],
      generated_at: narrative.generated_at,
      input_hash: narrative.input_hash
    });

  } catch (error) {
    console.error('[Narrative GET] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
