import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedUser } from '@/lib/serverAuth';

export async function PATCH(req, { params }) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError) return NextResponse.json({ error: authError }, { status: 401 });

    const { id } = params;
    const { field, value } = await req.json();

    const allowedFields = ['hypothesis_text', 'conclusion_text'];
    if (!allowedFields.includes(field)) {
      return NextResponse.json({ error: 'Invalid field' }, { status: 400 });
    }

    const { data: activity, error } = await supabaseAdmin
      .from('core_activities')
      .update({
        [field]: value,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(activity);
  } catch (error) {
    console.error('Step text update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
