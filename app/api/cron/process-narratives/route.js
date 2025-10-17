import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyCronSecret } from '@/lib/serverAuth';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Token discipline hard caps
const MAX_SNIPPETS_PER_STEP = 3;
const MAX_SNIPPET_LENGTH = 180;
const MAX_HYPOTHESIS_WORDS = 35;
const MAX_ACTIVITY_NAME_WORDS = 5;
const MAX_UNCERTAINTY_WORDS = 35;
const DAILY_SNIPPET_CAP_PER_PROJECT = 80;
const MIN_EVIDENCE_ITEMS = 3;
const MIN_DISTINCT_STEPS = 2;

// Systematic steps in order
const SYSTEMATIC_STEPS = ['Hypothesis', 'Experiment', 'Observation', 'Evaluation', 'Conclusion'];

// Generate SHA-256 hash for input tracking
function hashInputs(hypothesis, activity, evidenceData) {
  const input = JSON.stringify({
    hypothesis: hypothesis?.substring(0, 200) || '',
    activity: { name: activity.name, uncertainty: activity.uncertainty },
    evidence: evidenceData.map(e => ({ id: e.id, hash: e.content_hash })).sort((a, b) => a.id.localeCompare(b.id))
  });
  return crypto.createHash('sha256').update(input).digest('hex').substring(0, 64);
}

// Clean and truncate snippet
function cleanSnippet(text, maxChars = MAX_SNIPPET_LENGTH) {
  if (!text) return '';

  let clean = text
    .replace(/<[^>]*>/g, '') // Strip HTML
    .replace(/^>.*$/gm, '') // Remove quoted lines
    .replace(/On .* wrote:/gi, '') // Remove email headers
    .replace(/--\s*$/m, '') // Remove signature markers
    .replace(/Sent from .*/gi, '')
    .replace(/Best regards.*/gi, '')
    .replace(/Thanks.*/gi, '')
    .replace(/Cheers.*/gi, '')
    .replace(/Regards.*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (clean.length <= maxChars) return clean;

  const truncated = clean.substring(0, maxChars);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > maxChars * 0.8 ? truncated.substring(0, lastSpace) : truncated;
}

// Truncate to word limit
function truncateWords(text, maxWords) {
  if (!text) return '';
  const words = text.split(/\s+/);
  return words.slice(0, maxWords).join(' ');
}

// Extract snippets for one activity
async function extractSnippets(project, activity) {
  const snippetsByStep = {};
  const allEvidence = [];

  for (const step of SYSTEMATIC_STEPS) {
    const { data: evidence } = await supabaseAdmin
      .from('evidence')
      .select('id, content, created_at, source, content_hash, file_url')
      .eq('linked_activity_id', activity.id)
      .eq('systematic_step_primary', step)
      .or('soft_deleted.is.null,soft_deleted.eq.false')
      .order('created_at', { ascending: false })
      .limit(MAX_SNIPPETS_PER_STEP);

    if (evidence && evidence.length > 0) {
      snippetsByStep[step] = evidence
        .filter(e => !e.file_url) // Never include file attachments
        .map(e => ({
          id: e.id,
          snippet: cleanSnippet(e.content, MAX_SNIPPET_LENGTH),
          date: new Date(e.created_at).toISOString().split('T')[0],
          source: e.source === 'email' ? 'Email' : e.source === 'note' ? 'Note' : 'Upload',
          content_hash: e.content_hash
        }));

      allEvidence.push(...evidence);
    }
  }

  return { snippetsByStep, allEvidence };
}

// Check eligibility: ≥2 distinct steps OR ≥3 total items
function checkEligibility(snippetsByStep, allEvidence) {
  const distinctSteps = Object.keys(snippetsByStep).length;
  const totalItems = allEvidence.length;

  if (distinctSteps >= MIN_DISTINCT_STEPS || totalItems >= MIN_EVIDENCE_ITEMS) {
    return { eligible: true };
  }

  return {
    eligible: false,
    reason: `Not enough evidence: ${distinctSteps} steps, ${totalItems} items (need ≥${MIN_DISTINCT_STEPS} steps OR ≥${MIN_EVIDENCE_ITEMS} items)`
  };
}

// Call OpenAI to generate narrative
async function generateNarrative(project, activity, snippetsByStep) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[Process Narratives] No OpenAI API key configured');
    throw new Error('OpenAI API key not configured');
  }

  // Build evidence summary by step
  const evidenceByStep = SYSTEMATIC_STEPS
    .filter(step => snippetsByStep[step]?.length > 0)
    .map(step => {
      const items = snippetsByStep[step]
        .map(s => `- ${s.id.substring(0, 8)}|${s.date}|${s.source}|${s.snippet}`)
        .join('\n');
      return `[${step}]\n${items}`;
    })
    .join('\n\n');

  const hypothesis = truncateWords(project.current_hypothesis || 'Not specified', MAX_HYPOTHESIS_WORDS);
  const activityName = truncateWords(activity.name, MAX_ACTIVITY_NAME_WORDS);
  const uncertainty = truncateWords(activity.uncertainty, MAX_UNCERTAINTY_WORDS);

  const missingSteps = SYSTEMATIC_STEPS.filter(step => !snippetsByStep[step]?.length);

  const prompt = `Generate R&D narrative for Australian RDTI compliance. Return ONLY JSON.

Project Hypothesis (≤${MAX_HYPOTHESIS_WORDS}w): ${hypothesis}

Activity: ${activityName} (≤${MAX_ACTIVITY_NAME_WORDS}w)
Uncertainty: ${uncertainty} (≤${MAX_UNCERTAINTY_WORDS}w)

Evidence by Step (id|date|source|≤${MAX_SNIPPET_LENGTH} chars):
${evidenceByStep}

Task:
- Write 5-8 sentence paragraph following H→E→O→Ev→C chronological order
- Include up to 3 short quotes with date+source (≤240 chars total across all quotes)
- List missing steps at end if any: ${missingSteps.join(', ') || 'none'}
- Factual, neutral tone; no legal/eligibility claims
- Focus on numbers, metrics, thresholds, and technical details from snippets

JSON format (no code fences):
{
  "narrative": "paragraph text...",
  "confidence": "high" or "low",
  "missing_steps": ["Observation", "Conclusion"]
}`;

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
          { role: 'system', content: 'You are a precise JSON generator for R&D evidence narratives. Always return valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 500
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content?.trim() || '';

    // Strip code fences if present
    content = content.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();

    let result;
    try {
      const match = content.match(/\{\s*"narrative"[\s\S]*\}/);
      result = JSON.parse(match ? match[0] : content);
    } catch {
      console.error('[Process Narratives] Failed to parse AI response:', content.substring(0, 200));
      throw new Error('Failed to parse AI response');
    }

    if (!result.narrative) {
      throw new Error('AI response missing narrative field');
    }

    return {
      text: result.narrative,
      confidence: result.confidence === 'high' ? 'high' : 'low',
      missing_steps: result.missing_steps || []
    };

  } catch (error) {
    console.error('[Process Narratives] AI call error:', error.message);
    throw error;
  }
}

// Main cron handler
export async function POST(req) {
  // Verify cron secret to prevent unauthorized triggering
  if (!verifyCronSecret(req)) {
    console.error('[Cron/ProcessNarratives] Unauthorized access attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const results = { processed: 0, failed: 0, skipped: 0, errors: [] };

  try {
    console.log('[Process Narratives] Starting batch...');

    // Fetch jobs from queue (priority DESC, oldest first)
    const { data: jobs, error: jobsError } = await supabaseAdmin
      .from('narrative_jobs')
      .select('id, activity_id, project_id')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(10);

    if (jobsError) {
      throw new Error(`Failed to fetch jobs: ${jobsError.message}`);
    }

    if (!jobs || jobs.length === 0) {
      console.log('[Process Narratives] No jobs in queue');
      return NextResponse.json({ ok: true, processed: 0, message: 'No jobs in queue' });
    }

    console.log(`[Process Narratives] Found ${jobs.length} jobs`);

    // Group by project for budget tracking
    const jobsByProject = {};
    for (const job of jobs) {
      if (!jobsByProject[job.project_id]) {
        jobsByProject[job.project_id] = [];
      }
      jobsByProject[job.project_id].push(job);
    }

    // Process each project's jobs
    for (const [projectId, projectJobs] of Object.entries(jobsByProject)) {
      // Check daily budget for this project
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: recentNarratives } = await supabaseAdmin
        .from('activity_narratives')
        .select('activity_id')
        .gte('generated_at', oneDayAgo)
        .in('activity_id',
          supabaseAdmin.from('core_activities').select('id').eq('project_id', projectId)
        );

      // Estimate snippets used today (~9 per activity)
      const estimatedSnippetsToday = (recentNarratives?.length || 0) * 9;

      if (estimatedSnippetsToday >= DAILY_SNIPPET_CAP_PER_PROJECT) {
        console.log(`[Process Narratives] Daily budget exceeded for project ${projectId} (${estimatedSnippetsToday} snippets used)`);
        results.skipped += projectJobs.length;
        continue;
      }

      // Process jobs for this project
      for (const job of projectJobs) {
        try {
          // Get project and activity
          const { data: project } = await supabaseAdmin
            .from('projects')
            .select('id, current_hypothesis')
            .eq('id', job.project_id)
            .single();

          const { data: activity } = await supabaseAdmin
            .from('core_activities')
            .select('id, name, uncertainty')
            .eq('id', job.activity_id)
            .single();

          if (!project || !activity) {
            console.error(`[Process Narratives] Project or activity not found for job ${job.id}`);
            results.failed++;
            await supabaseAdmin.from('narrative_jobs').delete().eq('id', job.id);
            continue;
          }

          // Extract snippets
          const { snippetsByStep, allEvidence } = await extractSnippets(project, activity);

          // Check eligibility
          const eligibility = checkEligibility(snippetsByStep, allEvidence);
          if (!eligibility.eligible) {
            console.log(`[Process Narratives] Activity ${activity.id} not eligible: ${eligibility.reason}`);

            // Store placeholder narrative
            const inputHash = hashInputs(project.current_hypothesis, activity, allEvidence);
            await supabaseAdmin
              .from('activity_narratives')
              .upsert({
                activity_id: activity.id,
                text: 'Not enough evidence to summarize yet.',
                confidence: 'low',
                missing_steps: SYSTEMATIC_STEPS,
                generated_at: new Date().toISOString(),
                input_hash: inputHash,
                version: 1
              }, { onConflict: 'activity_id' });

            results.skipped++;
            await supabaseAdmin.from('narrative_jobs').delete().eq('id', job.id);
            continue;
          }

          // Generate narrative
          const narrative = await generateNarrative(project, activity, snippetsByStep);
          const inputHash = hashInputs(project.current_hypothesis, activity, allEvidence);

          // Upsert narrative (optimistic lock: newest generated_at wins)
          const { error: upsertError } = await supabaseAdmin
            .from('activity_narratives')
            .upsert({
              activity_id: activity.id,
              text: narrative.text,
              confidence: narrative.confidence,
              missing_steps: narrative.missing_steps,
              generated_at: new Date().toISOString(),
              input_hash: inputHash,
              version: 1
            }, { onConflict: 'activity_id' });

          if (upsertError) {
            throw new Error(`Upsert failed: ${upsertError.message}`);
          }

          // Audit log
          console.log(`[Process Narratives] Generated narrative for activity ${activity.id}: hash=${inputHash.substring(0, 16)}, confidence=${narrative.confidence}, steps=${Object.keys(snippetsByStep).length}`);

          results.processed++;

          // Delete job from queue
          await supabaseAdmin.from('narrative_jobs').delete().eq('id', job.id);

        } catch (error) {
          console.error(`[Process Narratives] Failed to process job ${job.id}:`, error);
          results.failed++;
          results.errors.push({ job_id: job.id, error: error.message });

          // Keep job in queue for retry (will be picked up in next run)
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Process Narratives] Batch complete: processed=${results.processed}, failed=${results.failed}, skipped=${results.skipped}, duration=${duration}ms`);

    return NextResponse.json({
      ok: true,
      processed: results.processed,
      failed: results.failed,
      skipped: results.skipped,
      duration_ms: duration,
      errors: results.errors
    });

  } catch (error) {
    console.error('[Process Narratives] Batch error:', error);
    return NextResponse.json({
      ok: false,
      error: error.message,
      processed: results.processed,
      failed: results.failed,
      skipped: results.skipped
    }, { status: 500 });
  }
}
