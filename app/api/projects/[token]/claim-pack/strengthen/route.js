import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { generateStrengthenPrompt } from '@/lib/claimPackGenerator';
import { CLAIMFLOW_SYSTEM_PROMPT } from '@/lib/claimFlowMasterContext';
import { enrichEvidenceWithActivityLinks } from '@/lib/enrichEvidence';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * POST /api/projects/[token]/claim-pack/strengthen
 *
 * Analyses a claim pack section against project evidence and returns
 * specific, evidence-grounded suggestions for RDTI gaps.
 *
 * Body (initial analysis):
 *   { sectionKey: string, currentContent: string }
 *
 * Body (draft from user answers):
 *   { action: "draft", suggestion: object, answers: { "q0": string, ... } }
 *
 * Response:
 *   { suggestions: [...], message: string|null }
 *   or for draft mode:
 *   { draftContent: string }
 */
export async function POST(req, { params }) {
  const { token } = await params;

  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('id, name, project_token')
    .eq('project_token', token)
    .is('deleted_at', null)
    .single();

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const { action, sectionKey, currentContent, suggestion, answers } = body;

  // Fetch activities first (needed for activity_evidence query)
  const { data: activities } = await supabaseAdmin
    .from('core_activities')
    .select('id, name, uncertainty')
    .eq('project_id', project.id);

  const activityIds = (activities || []).map(a => a.id);

  // Fetch evidence and activity-evidence links in parallel
  const [{ data: evidence }, { data: activityEvidenceLinks }] = await Promise.all([
    supabaseAdmin
      .from('evidence')
      .select('id, content, systematic_step_primary, created_at, source, evidence_type, linked_activity_id')
      .eq('project_id', project.id)
      .or('soft_deleted.is.null,soft_deleted.eq.false'),
    activityIds.length > 0
      ? supabaseAdmin
          .from('activity_evidence')
          .select('activity_id, evidence_id, systematic_step')
          .in('activity_id', activityIds)
      : Promise.resolve({ data: [] }),
  ]);

  const enrichedEvidence = enrichEvidenceWithActivityLinks(evidence || [], activityEvidenceLinks || []);

  // Draft-from-answers mode
  if (action === 'draft') {
    if (!suggestion || !answers) {
      return NextResponse.json({ error: 'Missing suggestion or answers' }, { status: 400 });
    }

    const answerLines = Object.entries(answers)
      .map(([key, val]) => `- ${suggestion.questions?.[parseInt(key.replace('q', ''))] || key}: ${val}`)
      .join('\n');

    const draftPrompt = `You are an RDTI claim pack writer. Based on the following context and user answers, write a single ready-to-insert paragraph for an R&D claim pack.

**Original suggestion:**
${suggestion.title}
${suggestion.rationale}

**Original draft content:**
${suggestion.draftContent}

**User's answers to follow-up questions:**
${answerLines}

Write an improved paragraph that incorporates the user's specific answers. Keep it factual, professional, and grounded in the details provided. Cite specific details from the answers (names, dates, outcomes). Output ONLY the paragraph — no headings, no preamble.`;

    const draftContent = await callOpenAIRaw(draftPrompt);
    return NextResponse.json({ draftContent });
  }

  // Initial analysis mode
  if (!sectionKey) {
    return NextResponse.json({ error: 'Missing sectionKey' }, { status: 400 });
  }

  const prompt = generateStrengthenPrompt(sectionKey, currentContent || '', enrichedEvidence, activities || []);

  if (!prompt) {
    return NextResponse.json({ suggestions: [], message: 'No automated suggestions available for this section type.' });
  }

  const rawResponse = await callOpenAIRaw(prompt);

  // Parse the JSON response from AI
  let parsed;
  try {
    // Strip any accidental markdown code fences
    const cleaned = rawResponse.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error('[strengthen] JSON parse error:', e.message, 'raw:', rawResponse.substring(0, 200));
    return NextResponse.json({ suggestions: [], message: 'Could not parse AI suggestions — try again.' });
  }

  return NextResponse.json({
    suggestions: parsed.suggestions || [],
    message: parsed.message || null,
  });
}

async function callOpenAIRaw(userPrompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OpenAI API key not configured');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: CLAIMFLOW_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
    signal: AbortSignal.timeout(25000),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Empty response from OpenAI');
  return content;
}
