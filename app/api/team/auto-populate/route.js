import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * POST - Auto-populate team members from existing project data
 * Pulls unique people from cost_ledger and evidence tables
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

    // Get all projects owned by this user
    const { data: projects } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('owner_id', user.id)
      .is('deleted_at', null);

    if (!projects || projects.length === 0) {
      return NextResponse.json({
        message: 'No projects found to populate from',
        added: 0
      });
    }

    const projectIds = projects.map(p => p.id);

    // Collect unique people from cost_ledger
    const peopleMap = new Map();

    const { data: ledgerPeople } = await supabaseAdmin
      .from('cost_ledger')
      .select('person_email, person_name, person_identifier')
      .in('project_id', projectIds)
      .not('person_email', 'is', null);

    if (ledgerPeople) {
      for (const person of ledgerPeople) {
        const email = person.person_email?.toLowerCase().trim();
        if (email && !peopleMap.has(email)) {
          peopleMap.set(email, {
            email,
            full_name: person.person_name || person.person_email.split('@')[0]
          });
        }
      }
    }

    // Also collect from evidence author_email
    const { data: evidencePeople } = await supabaseAdmin
      .from('evidence')
      .select('author_email')
      .in('project_id', projectIds)
      .not('author_email', 'is', null);

    if (evidencePeople) {
      for (const person of evidencePeople) {
        const email = person.author_email?.toLowerCase().trim();
        if (email && !peopleMap.has(email)) {
          // Default name is email username part
          const username = email.split('@')[0];
          const capitalized = username.charAt(0).toUpperCase() + username.slice(1);
          peopleMap.set(email, {
            email,
            full_name: capitalized
          });
        }
      }
    }

    // Get existing team members to avoid duplicates
    const { data: existingMembers } = await supabaseAdmin
      .from('team_members')
      .select('email')
      .eq('user_id', user.id);

    const existingEmails = new Set(
      (existingMembers || []).map(m => m.email.toLowerCase())
    );

    // Filter out already-existing members
    const newPeople = Array.from(peopleMap.values()).filter(
      person => !existingEmails.has(person.email)
    );

    if (newPeople.length === 0) {
      return NextResponse.json({
        message: 'No new team members to add',
        added: 0
      });
    }

    // Batch insert new team members
    const insertData = newPeople.map(person => ({
      user_id: user.id,
      email: person.email,
      full_name: person.full_name
    }));

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('team_members')
      .insert(insertData)
      .select();

    if (insertError) {
      console.error('Auto-populate insert error:', insertError);
      return NextResponse.json({
        error: 'Failed to populate team members',
        details: insertError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      message: `Added ${inserted.length} team member${inserted.length !== 1 ? 's' : ''}`,
      added: inserted.length,
      members: inserted
    });

  } catch (error) {
    console.error('Auto-populate error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
