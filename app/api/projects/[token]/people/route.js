import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * GET - Fetch unique people for a project
 * Priority: 1) team_members, 2) payroll data, 3) evidence authors
 * Used for person picker dropdowns in evidence entry
 */
export async function GET(req, { params }) {
  try {
    const { token } = await params;

    // Get project with owner info
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id, owner_id')
      .eq('project_token', token)
      .is('deleted_at', null)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const peopleMap = new Map();

    // PRIORITY 1: Fetch from team_members (if project has an owner)
    if (project.owner_id) {
      const { data: teamMembers } = await supabaseAdmin
        .from('team_members')
        .select('email, full_name')
        .eq('user_id', project.owner_id)
        .order('full_name', { ascending: true });

      if (teamMembers && teamMembers.length > 0) {
        for (const member of teamMembers) {
          const key = member.email?.toLowerCase();
          if (key) {
            peopleMap.set(key, {
              email: member.email,
              name: member.full_name,
              identifier: member.email,
              source: 'team' // Mark as coming from team roster
            });
          }
        }
      }
    }

    // PRIORITY 2: Fetch from cost ledger (payroll data)
    const { data: ledgerPeople } = await supabaseAdmin
      .from('cost_ledger')
      .select('person_email, person_name, person_identifier')
      .eq('project_id', project.id)
      .not('person_email', 'is', null)
      .order('person_name', { ascending: true });

    if (ledgerPeople) {
      for (const person of ledgerPeople) {
        const key = person.person_email?.toLowerCase();
        if (key && !peopleMap.has(key)) {
          peopleMap.set(key, {
            email: person.person_email,
            name: person.person_name || person.person_email.split('@')[0],
            identifier: person.person_identifier,
            source: 'payroll'
          });
        }
      }
    }

    // PRIORITY 3: Fetch from evidence authors
    const { data: evidencePeople } = await supabaseAdmin
      .from('evidence')
      .select('author_email')
      .eq('project_id', project.id)
      .not('author_email', 'is', null);

    if (evidencePeople) {
      for (const person of evidencePeople) {
        const key = person.author_email?.toLowerCase();
        if (key && !peopleMap.has(key)) {
          peopleMap.set(key, {
            email: person.author_email,
            name: person.author_email.split('@')[0],
            identifier: person.author_email,
            source: 'evidence'
          });
        }
      }
    }

    // Convert to array and sort by name
    // Team members appear first, then alphabetical
    const people = Array.from(peopleMap.values()).sort((a, b) => {
      if (a.source === 'team' && b.source !== 'team') return -1;
      if (a.source !== 'team' && b.source === 'team') return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ people });

  } catch (error) {
    console.error('People GET error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
