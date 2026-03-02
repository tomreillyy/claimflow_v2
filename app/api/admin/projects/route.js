import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req) {
  try {
    const { name, year, year_end, participants = [], owner_email, current_hypothesis, project_overview, technical_uncertainty, knowledge_gap, testing_method, success_criteria } = await req.json();

    if (!name || !year) {
      return NextResponse.json({ error: 'name and year required' }, { status: 400 });
    }

    // Validate hypothesis length if provided
    if (current_hypothesis && current_hypothesis.length > 280) {
      return NextResponse.json({ error: 'Hypothesis must be 280 characters or less' }, { status: 400 });
    }

    const project_token = crypto.randomBytes(24).toString('base64url'); // ~32 chars
    const inbound_email_local = 'p_' + crypto.randomBytes(5).toString('hex');

    // Get authenticated user
    const authHeader = req.headers.get('authorization');
    let owner_id = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (!authError && user) {
        owner_id = user.id;
      }
    }

    // Look up the user's company to auto-link the project
    let company_id = null;
    if (owner_id) {
      const { data: company } = await supabaseAdmin
        .from('companies')
        .select('id')
        .eq('owner_id', owner_id)
        .maybeSingle();
      if (company) company_id = company.id;
    }

    const { data, error } = await supabaseAdmin
      .from('projects')
      .insert({
        name,
        year,
        project_token,
        inbound_email_local,
        participants,
        owner_id,
        company_id,
        year_end: year_end || null,
        current_hypothesis: current_hypothesis || null,
        project_overview: project_overview || null,
        technical_uncertainty: technical_uncertainty || null,
        knowledge_gap: knowledge_gap || null,
        testing_method: testing_method || null,
        success_criteria: success_criteria || null
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      project: data,
      timelineUrl: `${process.env.NEXT_PUBLIC_BASE || 'http://localhost:3000'}/p/${data.project_token}`,
      uploadUrl: `${process.env.NEXT_PUBLIC_BASE || 'http://localhost:3000'}/p/${data.project_token}/upload`,
      inboundEmail: `${data.inbound_email_local}@${process.env.PUBLIC_INBOUND_DOMAIN || 'example.com'}`
    });
  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}