import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedUser } from '@/lib/serverAuth';

// GET: Fetch evidence grouped by systematic step for an activity
export async function GET(req, { params }) {
  try {
    const { id } = params;

    const { data: rows, error } = await supabaseAdmin
      .from('activity_evidence')
      .select(`
        id,
        systematic_step,
        link_source,
        created_at,
        evidence:evidence_id (
          id, content, source, created_at, file_url, author_email,
          systematic_step_primary, activity_type
        )
      `)
      .eq('activity_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Group by systematic step
    const steps = {
      Hypothesis: [],
      Experiment: [],
      Observation: [],
      Evaluation: [],
      Conclusion: []
    };

    (rows || []).forEach(row => {
      if (steps[row.systematic_step]) {
        steps[row.systematic_step].push({
          link_id: row.id,
          link_source: row.link_source,
          linked_at: row.created_at,
          ...row.evidence
        });
      }
    });

    return NextResponse.json({ steps });
  } catch (error) {
    console.error('Fetch activity evidence error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Link evidence items to an activity at a specific step
export async function POST(req, { params }) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError) return NextResponse.json({ error: authError }, { status: 401 });

    const { id } = params;
    const { evidence_ids, step } = await req.json();

    const validSteps = ['Hypothesis', 'Experiment', 'Observation', 'Evaluation', 'Conclusion'];
    if (!validSteps.includes(step)) {
      return NextResponse.json({ error: 'Invalid systematic step' }, { status: 400 });
    }

    if (!evidence_ids || !Array.isArray(evidence_ids) || evidence_ids.length === 0) {
      return NextResponse.json({ error: 'evidence_ids array required' }, { status: 400 });
    }

    // Insert links (ignore duplicates)
    const inserts = evidence_ids.map(eid => ({
      activity_id: id,
      evidence_id: eid,
      systematic_step: step,
      link_source: 'manual'
    }));

    const { data: inserted, error } = await supabaseAdmin
      .from('activity_evidence')
      .upsert(inserts, { onConflict: 'activity_id,evidence_id,systematic_step' })
      .select();

    if (error) {
      console.error('Link evidence error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Also update the legacy linked_activity_id on evidence for backward compat
    await supabaseAdmin
      .from('evidence')
      .update({ linked_activity_id: id, link_source: 'manual', link_updated_at: new Date().toISOString() })
      .in('id', evidence_ids)
      .is('linked_activity_id', null);

    return NextResponse.json({ linked: inserted?.length || 0 });
  } catch (error) {
    console.error('Link evidence error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Unlink evidence items from an activity step
export async function DELETE(req, { params }) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError) return NextResponse.json({ error: authError }, { status: 401 });

    const { id } = params;
    const { evidence_ids, step } = await req.json();

    if (!evidence_ids || !Array.isArray(evidence_ids)) {
      return NextResponse.json({ error: 'evidence_ids array required' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('activity_evidence')
      .delete()
      .eq('activity_id', id)
      .in('evidence_id', evidence_ids);

    if (step) {
      query = query.eq('systematic_step', step);
    }

    const { error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ unlinked: evidence_ids.length });
  } catch (error) {
    console.error('Unlink evidence error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
