import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// AI-powered activity generation
async function generateActivitiesWithAI(project, evidence) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('No OpenAI API key configured');
    return [];
  }

  // Build evidence summary (newest first, with IDs)
  const evidenceSummary = evidence.slice(0, 20).map((e) =>
    `${e.id} • [${e.systematic_step_primary || 'Unknown'}] ${String(e.content || '').slice(0, 200).replace(/\n/g, ' ')}`
  ).join('\n');

  const prompt = `
You are generating AU R&D *core activities* for a software project. Output ONLY a valid JSON array (no prose, no code fences).

## Project
Name: ${project.name}
Year: ${project.year}
Hypothesis: ${project.current_hypothesis || 'Not specified'}

## Recent evidence (newest first, id • step • 200 chars):
${evidenceSummary}

## What counts as a CORE activity
- Hypothesis-driven, technical unknown, **not knowable in advance**.
- Investigated via a **systematic progression** (hypothesis → experiment → observe/evaluate → conclude).
- Aimed at **new knowledge** (e.g., feasibility, thresholds, limits).
- Examples: "Unsupervised anomaly detection operating thresholds", "Semi-supervised classification under label sparsity".

## Exclusions (NOT core; only supporting if directly enabling a core experiment)
- Routine data manipulation/cleaning, refactors, integration, deployment, UI polish, documentation.

## Output requirements
Return 1–3 items. Each item:
- **name**: 3–6 words, concrete and technical (e.g., "Isolation Forest Thresholding").
- **uncertainty**: 1–2 sentences; measurable and testable (e.g., "Can we reach recall ≥60% at FPR ≤2% on expert-labeled anomalies with Isolation Forest vs LOF given noisy line items?").
- **success_criteria**: A single concise line with explicit metrics (e.g., "Recall ≥60% @ FPR ≤2% on holdout; PR-AUC ≥0.45").
- **evidence_links**: array of integer ids from the Evidence section that most support this activity (1–5 ids).
- **category**: one of ["Anomaly Detection","Classification","Model Calibration","Feature Learning","Other"].

## Quality rules
- Use metrics appropriate to the problem (e.g., anomaly detection: recall/FPR/PR-AUC; classification: macro-F1/calibration).
- Names must be unique (ignore case/stems).
- If the evidence is incoherent or <5 useful items, return [].

## JSON shape (no extra keys):
[
  {
    "name": "Short activity name",
    "uncertainty": "1–2 sentence measurable unknown",
    "success_criteria": "single line with concrete thresholds",
    "evidence_links": [123, 456],
    "category": "Classification"
  }
]
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a precise JSON generator. Always return a JSON array matching the requested schema, with no code fences or extra text.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 800
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status);
      return [];
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content?.trim() || '';

    // Strip code fences if model ignores instruction
    content = content.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();

    let activities;
    try {
      // Extract the first JSON array if any stray text sneaks in
      const match = content.match(/\[\s*{[\s\S]*}\s*\]/);
      activities = JSON.parse(match ? match[0] : content);
    } catch {
      console.error('Failed to parse AI response:', content.slice(0, 200));
      return [];
    }

    if (!Array.isArray(activities)) return [];

    // Sanitize and map to DB schema
    const sanitized = activities
      .filter(a => a?.name && a?.uncertainty)
      .map(a => ({
        project_id: project.id,
        name: String(a.name).slice(0, 60),
        uncertainty: String(a.uncertainty).slice(0, 800),
        // Store metadata as JSONB for future features
        meta: {
          success_criteria: a.success_criteria,
          evidence_links: a.evidence_links,
          category: a.category
        },
        source: 'ai'
      }));

    return sanitized;

  } catch (error) {
    console.error('AI activity generation error:', error.message);
    return [];
  }
}

export async function GET(req, { params }) {
  try {
    const token = params.token;

    // Get project with full details
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id, name, year, current_hypothesis')
      .eq('project_token', token)
      .is('deleted_at', null)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch saved activities
    const { data: activities } = await supabaseAdmin
      .from('core_activities')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: true });

    // Check if we should auto-generate activities
    const shouldGenerate = (
      (!activities || activities.length === 0) && // No activities yet
      process.env.OPENAI_API_KEY // API key available
    );

    if (shouldGenerate) {
      // Get evidence for AI analysis
      const { data: evidence } = await supabaseAdmin
        .from('evidence')
        .select('id, content, systematic_step_primary')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false })
        .limit(20);

      // Evidence quality guard: require ≥5 items AND ≥2 distinct steps
      const distinctSteps = new Set((evidence || []).map(e => e.systematic_step_primary || 'Unknown'));
      const hasQualityEvidence = (evidence?.length ?? 0) >= 5 && distinctSteps.size >= 2;

      if (hasQualityEvidence) {
        console.log(`[Core Activities] Generating AI activities for project ${project.id} (${evidence.length} items, ${distinctSteps.size} steps)`);

        const aiActivities = await generateActivitiesWithAI(project, evidence);

        if (aiActivities.length > 0) {
          // Auto-insert AI-generated activities (sanitized data already includes meta)
          const inserts = aiActivities;

          const { data: inserted } = await supabaseAdmin
            .from('core_activities')
            .insert(inserts)
            .select();

          console.log(`[Core Activities] Auto-generated ${inserted?.length || 0} activities`);

          // Return the newly generated activities
          return NextResponse.json({
            activities: inserted || []
          });
        }
      }
    }

    return NextResponse.json({
      activities: activities || []
    });
  } catch (error) {
    console.error('Core activities fetch error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const token = params.token;
    const { name, uncertainty } = await req.json();

    if (!name || !uncertainty) {
      return NextResponse.json({ error: 'Name and uncertainty required' }, { status: 400 });
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

    // Insert activity (human-created)
    const { data: activity, error } = await supabaseAdmin
      .from('core_activities')
      .insert({
        project_id: project.id,
        name,
        uncertainty,
        source: 'human' // Mark as human-created
      })
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(activity);
  } catch (error) {
    console.error('Core activities save error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
