import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedUser, verifyProjectAccess } from '@/lib/serverAuth';

/**
 * GET /api/timesheets?project_token=xxx&week_start=2026-03-02
 * Fetch timesheet entries for a project and week
 */
export async function GET(req) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectToken = searchParams.get('project_token');
    const weekStart = searchParams.get('week_start');

    if (!projectToken || !weekStart) {
      return NextResponse.json({ error: 'project_token and week_start are required' }, { status: 400 });
    }

    // Verify project access
    const { project, error: accessError } = await verifyProjectAccess(projectToken, user.email, user.id);
    if (accessError || !project) {
      return NextResponse.json({ error: accessError || 'Project not found' }, { status: 403 });
    }

    // Fetch timesheet entries for this project and week
    const { data: entries, error } = await supabaseAdmin
      .from('timesheets')
      .select('*')
      .eq('project_id', project.id)
      .eq('week_start', weekStart)
      .order('person_email', { ascending: true });

    if (error) {
      console.error('Timesheets fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch timesheets' }, { status: 500 });
    }

    // Fetch team member names for display
    const emails = [...new Set((entries || []).map(e => e.person_email))];
    let memberMap = {};
    if (emails.length > 0) {
      const { data: members } = await supabaseAdmin
        .from('team_members')
        .select('email, full_name, role, department')
        .in('email', emails);

      if (members) {
        for (const m of members) {
          memberMap[m.email] = m;
        }
      }
    }

    // Enrich entries with member info
    const enriched = (entries || []).map(entry => ({
      ...entry,
      person_name: memberMap[entry.person_email]?.full_name || entry.person_email,
      person_role: memberMap[entry.person_email]?.role || null,
      person_department: memberMap[entry.person_email]?.department || null,
    }));

    return NextResponse.json({ entries: enriched, project: { id: project.id, name: project.name } });

  } catch (error) {
    console.error('Timesheets GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/timesheets - Bulk upsert timesheet entries
 * Body: { project_token, entries: [{ person_email, week_start, mon, tue, wed, thu, fri, sat, sun, note }] }
 */
export async function POST(req) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const { project_token, entries } = await req.json();

    if (!project_token || !entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: 'project_token and entries array are required' }, { status: 400 });
    }

    // Verify project access
    const { project, error: accessError } = await verifyProjectAccess(project_token, user.email, user.id);
    if (accessError || !project) {
      return NextResponse.json({ error: accessError || 'Project not found' }, { status: 403 });
    }

    // Validate and prepare entries
    const rows = [];
    for (const entry of entries) {
      if (!entry.person_email || !entry.week_start) {
        return NextResponse.json({ error: 'Each entry requires person_email and week_start' }, { status: 400 });
      }

      // Validate week_start is a Monday
      const d = new Date(entry.week_start + 'T00:00:00Z');
      if (d.getUTCDay() !== 1) {
        return NextResponse.json({ error: `week_start must be a Monday (got ${entry.week_start})` }, { status: 400 });
      }

      rows.push({
        project_id: project.id,
        person_email: entry.person_email.trim().toLowerCase(),
        week_start: entry.week_start,
        mon: entry.mon ?? 0,
        tue: entry.tue ?? 0,
        wed: entry.wed ?? 0,
        thu: entry.thu ?? 0,
        fri: entry.fri ?? 0,
        sat: entry.sat ?? 0,
        sun: entry.sun ?? 0,
        note: entry.note || null,
        created_by: user.id,
        updated_at: new Date().toISOString(),
      });
    }

    // Upsert entries
    const { data, error } = await supabaseAdmin
      .from('timesheets')
      .upsert(rows, {
        onConflict: 'project_id,person_email,week_start',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('Timesheets upsert error:', error);
      return NextResponse.json({ error: 'Failed to save timesheets' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, saved: data?.length || 0 });

  } catch (error) {
    console.error('Timesheets POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/timesheets?id=xxx
 * Delete a single timesheet entry
 */
export async function DELETE(req) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Fetch the entry to verify project access
    const { data: entry, error: fetchError } = await supabaseAdmin
      .from('timesheets')
      .select('id, project_id')
      .eq('id', id)
      .single();

    if (fetchError || !entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    // Verify access via project
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('project_token')
      .eq('id', entry.project_id)
      .single();

    if (project) {
      const { error: accessError } = await verifyProjectAccess(project.project_token, user.email, user.id);
      if (accessError) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
      }
    }

    const { error: deleteError } = await supabaseAdmin
      .from('timesheets')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Timesheet delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('Timesheets DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
