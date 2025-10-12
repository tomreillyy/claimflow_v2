import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET - Fetch all attestations for a project
export async function GET(req, { params }) {
  try {
    const { token } = await params;

    // Get project
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('project_token', token)
      .is('deleted_at', null)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch attestations with activity details
    const { data: attestations, error } = await supabaseAdmin
      .from('monthly_attestations')
      .select(`
        *,
        activity:core_activities(id, name)
      `)
      .eq('project_id', project.id)
      .order('month', { ascending: false })
      .order('person_identifier', { ascending: true });

    if (error) {
      console.error('Attestations fetch error:', error);
      return NextResponse.json({
        error: 'Failed to fetch attestations'
      }, { status: 500 });
    }

    return NextResponse.json({
      attestations: attestations || []
    });

  } catch (error) {
    console.error('Attestations GET error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

// POST - Create or update attestation
export async function POST(req, { params }) {
  try {
    const { token } = await params;
    const body = await req.json();

    const {
      personIdentifier,
      personEmail,
      month, // YYYY-MM-DD (first of month)
      activityId,
      amountType, // 'percent' or 'hours'
      amountValue,
      note,
      createdBy
    } = body;

    // Validation
    if (!personIdentifier || !month || !amountType || amountValue == null) {
      return NextResponse.json({
        error: 'Missing required fields: personIdentifier, month, amountType, amountValue'
      }, { status: 400 });
    }

    if (!['percent', 'hours'].includes(amountType)) {
      return NextResponse.json({
        error: 'amountType must be "percent" or "hours"'
      }, { status: 400 });
    }

    const numValue = parseFloat(amountValue);
    if (isNaN(numValue) || numValue < 0) {
      return NextResponse.json({
        error: 'amountValue must be a positive number'
      }, { status: 400 });
    }

    if (amountType === 'percent' && numValue > 100) {
      return NextResponse.json({
        error: 'Percent value cannot exceed 100'
      }, { status: 400 });
    }

    // Get project
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('project_token', token)
      .is('deleted_at', null)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // If activityId provided, verify it exists
    if (activityId) {
      const { data: activity } = await supabaseAdmin
        .from('core_activities')
        .select('id')
        .eq('id', activityId)
        .eq('project_id', project.id)
        .single();

      if (!activity) {
        return NextResponse.json({
          error: 'Activity not found'
        }, { status: 404 });
      }
    }

    // Upsert attestation (unique on project_id, person_identifier, month, activity_id)
    const { data: attestation, error: upsertError } = await supabaseAdmin
      .from('monthly_attestations')
      .upsert({
        project_id: project.id,
        person_identifier: personIdentifier,
        person_email: personEmail || null,
        month,
        activity_id: activityId || null,
        amount_type: amountType,
        amount_value: numValue,
        note: note || null,
        created_by: createdBy || null
      }, {
        onConflict: 'project_id,person_identifier,month,activity_id'
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Attestation upsert error:', upsertError);
      return NextResponse.json({
        error: 'Failed to save attestation',
        details: upsertError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      attestation
    });

  } catch (error) {
    console.error('Attestations POST error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

// DELETE - Remove an attestation
export async function DELETE(req, { params }) {
  try {
    const { token } = await params;
    const { searchParams } = new URL(req.url);
    const attestationId = searchParams.get('id');

    if (!attestationId) {
      return NextResponse.json({
        error: 'Missing attestation ID'
      }, { status: 400 });
    }

    // Get project
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('project_token', token)
      .is('deleted_at', null)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Delete attestation
    const { error: deleteError } = await supabaseAdmin
      .from('monthly_attestations')
      .delete()
      .eq('id', attestationId)
      .eq('project_id', project.id);

    if (deleteError) {
      console.error('Attestation delete error:', deleteError);
      return NextResponse.json({
        error: 'Failed to delete attestation'
      }, { status: 500 });
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('Attestations DELETE error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
