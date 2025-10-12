import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * GET - Fetch all team members for the authenticated user
 */
export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch team members for this user
    const { data: members, error } = await supabaseAdmin
      .from('team_members')
      .select('id, email, full_name, created_at')
      .eq('user_id', user.id)
      .order('full_name', { ascending: true });

    if (error) {
      console.error('Team members fetch error:', error);
      return NextResponse.json({
        error: 'Failed to fetch team members'
      }, { status: 500 });
    }

    return NextResponse.json({ members: members || [] });

  } catch (error) {
    console.error('Team GET error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * POST - Add a new team member
 */
export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, full_name } = await req.json();

    // Validation
    if (!email || !full_name) {
      return NextResponse.json({
        error: 'Email and full name are required'
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        error: 'Invalid email format'
      }, { status: 400 });
    }

    // Insert team member
    const { data: member, error: insertError } = await supabaseAdmin
      .from('team_members')
      .insert({
        user_id: user.id,
        email: email.trim().toLowerCase(),
        full_name: full_name.trim()
      })
      .select()
      .single();

    if (insertError) {
      // Check for duplicate
      if (insertError.code === '23505') {
        return NextResponse.json({
          error: 'This email already exists in your team'
        }, { status: 409 });
      }

      console.error('Team member insert error:', insertError);
      return NextResponse.json({
        error: 'Failed to add team member',
        details: insertError.message
      }, { status: 500 });
    }

    return NextResponse.json({ member }, { status: 201 });

  } catch (error) {
    console.error('Team POST error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * PATCH - Update a team member
 */
export async function PATCH(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, email, full_name } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    // Build update object
    const updates = { updated_at: new Date().toISOString() };
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
      }
      updates.email = email.trim().toLowerCase();
    }
    if (full_name) {
      updates.full_name = full_name.trim();
    }

    // Update team member (verify ownership via user_id)
    const { data: member, error: updateError } = await supabaseAdmin
      .from('team_members')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id) // Security: only update own team members
      .select()
      .single();

    if (updateError) {
      console.error('Team member update error:', updateError);
      return NextResponse.json({
        error: 'Failed to update team member',
        details: updateError.message
      }, { status: 500 });
    }

    if (!member) {
      return NextResponse.json({
        error: 'Team member not found'
      }, { status: 404 });
    }

    return NextResponse.json({ member });

  } catch (error) {
    console.error('Team PATCH error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * DELETE - Remove a team member
 */
export async function DELETE(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        error: 'Member ID is required'
      }, { status: 400 });
    }

    // Delete team member (verify ownership via user_id)
    const { error: deleteError } = await supabaseAdmin
      .from('team_members')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id); // Security: only delete own team members

    if (deleteError) {
      console.error('Team member delete error:', deleteError);
      return NextResponse.json({
        error: 'Failed to delete team member'
      }, { status: 500 });
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('Team DELETE error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
