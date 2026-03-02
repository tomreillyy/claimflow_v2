import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function PATCH(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { name, uncertainty, hypothesis_text, conclusion_text, status } = body;

    if (!name && !uncertainty && hypothesis_text === undefined && conclusion_text === undefined && !status) {
      return NextResponse.json({ error: 'At least one field required' }, { status: 400 });
    }

    const updates = { updated_at: new Date().toISOString() };
    if (name) updates.name = name;
    if (uncertainty) updates.uncertainty = uncertainty;
    if (hypothesis_text !== undefined) updates.hypothesis_text = hypothesis_text;
    if (conclusion_text !== undefined) updates.conclusion_text = conclusion_text;
    if (status && ['draft', 'archived'].includes(status)) updates.status = status;

    // Update activity
    const { data: activity, error } = await supabaseAdmin
      .from('core_activities')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(activity);
  } catch (error) {
    console.error('Core activity update error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
