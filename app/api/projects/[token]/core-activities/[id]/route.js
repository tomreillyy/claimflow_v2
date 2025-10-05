import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function PATCH(req, { params }) {
  try {
    const { id } = params;
    const { name, uncertainty } = await req.json();

    if (!name || !uncertainty) {
      return NextResponse.json({ error: 'Name and uncertainty required' }, { status: 400 });
    }

    // Update activity
    const { data: activity, error } = await supabaseAdmin
      .from('core_activities')
      .update({
        name,
        uncertainty,
        updated_at: new Date().toISOString()
      })
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
