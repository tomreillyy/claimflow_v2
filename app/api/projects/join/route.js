import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req) {
  try {
    const { project_token, user_email } = await req.json();

    if (!project_token || !user_email) {
      return NextResponse.json(
        { error: 'project_token and user_email required' },
        { status: 400 }
      );
    }

    // Call the database function to add participant
    const { data, error } = await supabaseAdmin.rpc('add_participant_to_project', {
      project_token_param: project_token,
      user_email: user_email
    });

    if (error) {
      console.error('Error adding participant:', error);
      return NextResponse.json(
        { error: 'Failed to join project' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'User not found or invalid project token' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in join project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}