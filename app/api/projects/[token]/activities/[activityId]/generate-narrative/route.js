import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyUserAndProjectAccess } from '@/lib/serverAuth';
import { CLAIMFLOW_SYSTEM_PROMPT } from '@/lib/claimFlowMasterContext';
import { marked } from 'marked';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function cleanSnippet(text, maxLength = 200) {
  if (!text) return '';
  let clean = text.replace(/<[^>]*>/g, '').replace(/^>.*$/gm, '').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) return clean;
  const truncated = clean.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > maxLength * 0.8 ? truncated.substring(0, lastSpace) : truncated) + '...';
}

function formatEvidence(ev) {
  const d = new Date(ev.created_at);
  const date = d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Australia/Sydney' });
  const id = ev.id.substring(0, 8);
  const src = ev.source === 'email' ? 'Email' : ev.source === 'github' ? 'GitHub' : ev.source === 'document' ? 'Doc' : 'Note';
  return `- [${id}|${date}|${src}] ${cleanSnippet(ev.content)}`;
}

/**
 * POST /api/projects/[token]/activities/[activityId]/generate-narrative
 *
 * Generates all 6 narrative sections for a specific activity using its linked evidence.
 * Saves each section to claim_pack_sections with keys like activity_{id}_hypothesis.
 */
export async function POST(req, { params }) {
  const { token, activityId } = await params;

  const { user, project, error: authError } = await verifyUserAndProjectAccess(req, token);
  if (authError) {
    return NextResponse.json({ error: authError }, { status: !user ? 401 : 403 });
  }

  // Fetch activity
  const { data: activity } = await supabaseAdmin
    .from('core_activities')
    .select('*')
    .eq('id', activityId)
    .eq('project_id', project.id)
    .single();

  if (!activity) {
    return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
  }

  // Fetch linked evidence via activity_evidence join table
  const { data: links } = await supabaseAdmin
    .from('activity_evidence')
    .select('evidence_id, systematic_step')
    .eq('activity_id', activityId);

  let evidence = [];
  if (links && links.length > 0) {
    const evidenceIds = [...new Set(links.map(l => l.evidence_id))];
    const { data: evRows } = await supabaseAdmin
      .from('evidence')
      .select('*')
      .in('id', evidenceIds)
      .or('soft_deleted.is.null,soft_deleted.eq.false')
      .order('created_at', { ascending: true });
    evidence = (evRows || []).map(ev => {
      const link = links.find(l => l.evidence_id === ev.id);
      return { ...ev, _step: link?.systematic_step || ev.systematic_step_primary };
    });
  }

  // Group evidence by step
  const byStep = {};
  evidence.forEach(ev => {
    const step = ev._step || 'Unknown';
    if (!byStep[step]) byStep[step] = [];
    byStep[step].push(ev);
  });

  // Build evidence summary
  const evidenceSummary = Object.entries(byStep)
    .map(([step, items]) => `### ${step}\n${items.map(formatEvidence).join('\n')}`)
    .join('\n\n');

  // Build the prompt
  const prompt = `
You are generating the 6-part RDTI narrative for a single R&D activity. Output a JSON object with exactly 6 keys. Each value should be 2-4 paragraphs of technical prose suitable for an AusIndustry submission. Cite evidence using [id|date|source] format inline.

## Activity
Name: ${activity.name}
Uncertainty: ${activity.uncertainty || 'Not specified'}
${activity.hypothesis_text ? `Existing hypothesis: ${activity.hypothesis_text}` : ''}
${activity.conclusion_text ? `Existing conclusion: ${activity.conclusion_text}` : ''}

## Linked Evidence (${evidence.length} items)
${evidenceSummary || 'No evidence linked yet — write based on the activity description.'}

## Output format (JSON only, no code fences):
{
  "prior_knowledge": "What existing sources, standards, literature, vendor documentation, or open-source solutions were investigated before experimentation began. Why they were insufficient to resolve the technical uncertainty. Be specific — name actual sources where possible.",
  "hypothesis": "The testable technical proposition. What outcome was expected and why. Include measurable success criteria where the evidence supports them.",
  "experiment": "The experimental methodology. What was built, configured, or tested. What controls, metrics, and test environments were used. Reference specific commits, test runs, or prototypes from the evidence.",
  "observation": "What data was collected. What results were observed. Include failures, unexpected behaviours, and partial results — these strengthen the claim. Reference specific evidence items.",
  "evaluation": "How results were analysed against the hypothesis. What comparisons were made. Whether success criteria were met, partially met, or not met. What the data showed.",
  "conclusion": "What new knowledge was definitively generated. What was learned that could not have been known in advance. Include implications for future work. Even negative results count as new knowledge."
}

## Rules
- Ground ALL prose in the evidence provided. Every factual claim must cite at least one evidence ID.
- If evidence is sparse for a step, write a shorter section but note the gap.
- Use factual, technical language. No marketing or superlatives.
- Failed or partial results STRENGTHEN the claim — narrate them, don't hide them.
- Do NOT claim this is eligible R&D — describe the activity for AusIndustry assessment.
`;

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OpenAI API key not configured');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: CLAIMFLOW_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);
    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) throw new Error('Empty response from OpenAI');

    // Parse JSON (strip code fences if present)
    const jsonStr = raw.replace(/^```json?\s*/i, '').replace(/\s*```\s*$/i, '');
    const sections = JSON.parse(jsonStr);

    // Save each section to claim_pack_sections
    const stepKeys = ['prior_knowledge', 'hypothesis', 'experiment', 'observation', 'evaluation', 'conclusion'];
    const saved = [];

    for (const stepKey of stepKeys) {
      const content = sections[stepKey];
      if (!content) continue;

      const sectionKey = `activity_${activityId}_${stepKey}`;
      const html = marked.parse(content, { breaks: false });

      await supabaseAdmin
        .from('claim_pack_sections')
        .upsert({
          project_id: project.id,
          section_key: sectionKey,
          content: html,
          ai_generated: true,
          last_edited_at: new Date().toISOString(),
          last_edited_by: user.email,
          version: 1,
        }, { onConflict: 'project_id,section_key' });

      saved.push(sectionKey);
    }

    return NextResponse.json({ ok: true, generated: saved.length, activity: activity.name });
  } catch (error) {
    console.error('[GenerateNarrative] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
