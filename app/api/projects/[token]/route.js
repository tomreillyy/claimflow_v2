import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyUserAndProjectAccess } from '@/lib/serverAuth';
import { logAudit } from '@/lib/auditLog';

// GET - Fetch project by token
export async function GET(req, { params }) {
  try {
    const { token } = await params;

    const { user, project: accessProject, error: authError } = await verifyUserAndProjectAccess(req, token);
    if (authError) {
      const status = !user ? 401 : 403;
      return NextResponse.json({ error: authError }, { status });
    }

    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('project_token', token)
      .is('deleted_at', null)
      .single();

    if (error || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    logAudit(req, {
      action: 'project.view',
      resourceType: 'project',
      resourceId: project.id,
      projectId: project.id,
      userId: user.id,
      userEmail: user.email,
    });

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Project fetch error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
