import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { rateLimitMiddleware, getClientIp, RATE_LIMITS } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Sanitize content (reuse from classify route)
function sanitizeText(text) {
  if (!text) return '';

  // Strip HTML tags
  let clean = text.replace(/<[^>]*>/g, '');

  // Remove quoted replies (lines starting with >)
  clean = clean.replace(/^>.*$/gm, '');

  // Remove "On ... wrote:" blocks
  clean = clean.replace(/On .* wrote:/gi, '');

  // Remove common signature markers
  clean = clean.replace(/--\s*$/m, '');
  clean = clean.replace(/Sent from .*/gi, '');
  clean = clean.replace(/Best regards.*/gi, '');
  clean = clean.replace(/Thanks.*/gi, '');

  // Collapse whitespace
  clean = clean.replace(/\s+/g, ' ').trim();

  return clean;
}

// Pre-classification heuristics (fast, deterministic)
function preClassifyActivityType(evidence, activities) {
  // If evidence is linked to a core activity, it's very likely core R&D
  if (evidence.linked_activity_id) {
    return {
      activity_type: 'core',
      confidence: 0.95,
      reason: 'Evidence linked to registered core R&D activity'
    };
  }

  // Systematic steps that suggest core R&D (experimental work)
  const coreSteps = ['Hypothesis', 'Experiment', 'Evaluation'];
  if (coreSteps.includes(evidence.systematic_step_primary)) {
    return {
      activity_type: 'core',
      confidence: 0.85,
      reason: `Systematic step "${evidence.systematic_step_primary}" indicates experimental work`
    };
  }

  // Check if evidence mentions any core activity by name
  if (evidence.content && activities.length > 0) {
    const contentLower = evidence.content.toLowerCase();
    const mentionsActivity = activities.some(act =>
      contentLower.includes(act.name.toLowerCase())
    );

    if (mentionsActivity) {
      return {
        activity_type: 'core',
        confidence: 0.80,
        reason: 'Evidence references registered core activity'
      };
    }
  }

  // Keywords that strongly suggest supporting activities (infrastructure, deployment, maintenance)
  const supportingKeywords = [
    'deploy', 'deployed', 'deployment',
    'merge pull request', 'merged pr',
    'update readme', 'updated docs',
    'fix typo', 'fixed typo',
    'bump version', 'version bump',
    'dependency update', 'updated dependencies',
    'configure', 'configured', 'configuration',
    'setup', 'set up', 'install'
  ];

  if (evidence.content) {
    const contentLower = evidence.content.toLowerCase();
    const hasSupporting Keyword = supportingKeywords.some(kw =>
      contentLower.includes(kw)
    );

    // Short messages with supporting keywords are likely BAU/supporting work
    if (hasSupportingKeyword && evidence.content.length < 100) {
      return {
        activity_type: 'supporting',
        confidence: 0.75,
        reason: 'Short message with maintenance/deployment keywords'
      };
    }
  }

  // No strong signal - needs AI classification
  return null;
}

// Call LLM for classification with project context
async function classifyWithLLM(evidence, project, activities) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('No LLM API key configured');
    return { activity_type: 'core', confidence: 0, reason: 'No API key' };
  }

  // Build project context summary
  const activitiesSummary = activities.length > 0
    ? activities.slice(0, 5).map((a, i) =>
        `${i + 1}. ${a.name}\n   Technical Uncertainty: ${a.uncertainty}`
      ).join('\n\n')
    : 'No core activities registered yet';

  const prompt = `You are classifying evidence for Australian R&D Tax Incentive compliance (ITAA 1997 s.355-25 and s.355-30).

PROJECT CONTEXT:
- Project: "${project.name}" (FY ${project.year})
- Current R&D Focus: ${project.current_hypothesis || 'Not specified'}

CORE R&D ACTIVITIES REGISTERED FOR THIS PROJECT:
${activitiesSummary}

CLASSIFICATION RULES:

CORE R&D (s.355-25):
- Experimental work that directly addresses the technical uncertainties listed above
- Systematic progression involving hypothesis testing, experiments, observations, evaluation
- Outcome was unknown in advance and could not be determined by a competent professional
- Aimed at generating new knowledge
- Examples in THIS project context:
  * Testing different technical approaches to solve registered uncertainties
  * Benchmarking performance/feasibility of novel solutions
  * Investigating technical limits or thresholds
  * Experimenting with algorithms, architectures, or system designs

SUPPORTING R&D (s.355-30):
- Activities that enable core R&D but are not experimental themselves
- Must have DOMINANT PURPOSE of supporting a specific core R&D activity
- Infrastructure setup, deployment, configuration for experiments
- Data preparation, tooling, testing frameworks for R&D
- Documentation, refactoring (unless exploring novel patterns)
- Bug fixes, maintenance, routine operations
- Examples in THIS project context:
  * Setting up test infrastructure to run experiments
  * Deploying experimental code to measure performance
  * Configuring environments for reproducible tests
  * Writing scripts to collect/analyze experiment data

EVIDENCE TO CLASSIFY:
"""
${evidence.content}
"""

Additional context:
- Systematic step: ${evidence.systematic_step_primary || 'Not classified'}
- Source: ${evidence.source}
${evidence.meta?.type ? `- Type: ${evidence.meta.type}` : ''}

Given the project's specific R&D goals and registered technical uncertainties above, is this evidence from CORE R&D work or SUPPORTING activities?

Consider:
- Does this directly address an experimental question from the core activities?
- Or does this enable/support the experiments but isn't experimental itself?

Return JSON exactly: {
  "activity_type": "core" | "supporting",
  "confidence": 0.0 to 1.0,
  "reason": "Brief explanation relating to project's R&D goals"
}`;

  try {
    // Use OpenAI if available
    if (process.env.OPENAI_API_KEY) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a precise JSON classifier for Australian R&D Tax Incentive compliance. Always return valid JSON.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 150
        }),
        signal: AbortSignal.timeout(10000) // 10s timeout
      });

      if (!response.ok) {
        console.error('OpenAI API error:', response.status);
        return { activity_type: 'core', confidence: 0, reason: 'API error' };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) return { activity_type: 'core', confidence: 0, reason: 'Empty response' };

      // Parse JSON response
      const result = JSON.parse(content);

      // Strict contract validation
      const validTypes = ['core', 'supporting'];
      if (!validTypes.includes(result.activity_type) || typeof result.confidence !== 'number') {
        console.log('Invalid LLM response format:', result);
        return { activity_type: 'core', confidence: 0, reason: 'Invalid format' };
      }

      return result;
    }

    // Fallback: no API key - default to core
    return { activity_type: 'core', confidence: 0, reason: 'No API key configured' };

  } catch (error) {
    console.error('Classification error:', error.message);
    return { activity_type: 'core', confidence: 0, reason: error.message };
  }
}

export async function POST(req) {
  const startTime = Date.now();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  // Fetch evidence WITH project and activities for context-aware classification
  const { data: evidence, error: fetchError } = await supabaseAdmin
    .from('evidence')
    .select(`
      id,
      content,
      systematic_step_primary,
      linked_activity_id,
      activity_type,
      activity_type_source,
      activity_type_classified_at,
      source,
      meta,
      project_id,
      projects!inner(
        id,
        name,
        year,
        current_hypothesis,
        project_token
      )
    `)
    .eq('id', id)
    .single();

  if (fetchError || !evidence) {
    return NextResponse.json({ error: 'evidence not found' }, { status: 404 });
  }

  const project = evidence.projects;
  const projectToken = project?.project_token;

  // Fetch core activities for context
  const { data: activities } = await supabaseAdmin
    .from('core_activities')
    .select('id, name, uncertainty')
    .eq('project_id', project.id)
    .limit(5);

  // Apply rate limiting (per-IP + per-project)
  const clientIp = getClientIp(req);
  const rateLimitResponse = await rateLimitMiddleware(req, [
    { identifier: clientIp, config: RATE_LIMITS.CLASSIFY_PER_IP, name: 'per-ip' },
    { identifier: projectToken || 'unknown', config: RATE_LIMITS.CLASSIFY_PER_PROJECT, name: 'per-project' }
  ]);

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // Skip manually classified evidence
    if (evidence.activity_type_source === 'manual') {
      return NextResponse.json({
        ok: true,
        activity_type: evidence.activity_type,
        skipped: 'manual'
      });
    }

    // Idempotent: already classified (unless we want to reclassify auto classifications)
    if (evidence.activity_type_classified_at) {
      return NextResponse.json({
        ok: true,
        activity_type: evidence.activity_type,
        cached: true
      });
    }

    // Prefilter 1: no content
    if (!evidence.content || evidence.content.trim().length === 0) {
      await supabaseAdmin
        .from('evidence')
        .update({
          activity_type: 'core', // Default to core if no content
          activity_type_source: 'auto',
          activity_type_classified_at: new Date().toISOString()
        })
        .eq('id', id);

      console.log('activity_type_default:', { id, reason: 'no_content' });
      return NextResponse.json({ ok: true, activity_type: 'core', reason: 'no_content' });
    }

    // Sanitize text
    const cleanContent = sanitizeText(evidence.content);

    // Prefilter 2: < 10 chars after sanitization
    if (cleanContent.length < 10) {
      await supabaseAdmin
        .from('evidence')
        .update({
          activity_type: 'core',
          activity_type_source: 'auto',
          activity_type_classified_at: new Date().toISOString()
        })
        .eq('id', id);

      console.log('activity_type_default:', { id, reason: 'too_short', length: cleanContent.length });
      return NextResponse.json({ ok: true, activity_type: 'core', reason: 'too_short' });
    }

    // Try pre-classification heuristics (fast path)
    const preClassified = preClassifyActivityType(evidence, activities || []);
    if (preClassified && preClassified.confidence >= 0.75) {
      // High-confidence pre-classification - skip LLM
      await supabaseAdmin
        .from('evidence')
        .update({
          activity_type: preClassified.activity_type,
          activity_type_source: 'auto',
          activity_type_classified_at: new Date().toISOString()
        })
        .eq('id', id);

      const duration = Date.now() - startTime;
      console.log('activity_type_preclassified:', {
        id,
        activity_type: preClassified.activity_type,
        confidence: preClassified.confidence,
        reason: preClassified.reason,
        ms: duration
      });

      return NextResponse.json({
        ok: true,
        activity_type: preClassified.activity_type,
        confidence: preClassified.confidence,
        method: 'heuristic'
      });
    }

    // Call LLM for context-aware classification
    const result = await classifyWithLLM(evidence, project, activities || []);

    // Apply confidence threshold (same as systematic step classification)
    let finalActivityType = result.activity_type;
    if (result.confidence < 0.7) {
      finalActivityType = 'core'; // Default to core if low confidence
      console.log('activity_type_low_confidence:', { id, reason: 'low_confidence', confidence: result.confidence });
    }

    // Persist result
    await supabaseAdmin
      .from('evidence')
      .update({
        activity_type: finalActivityType,
        activity_type_source: 'auto',
        activity_type_classified_at: new Date().toISOString()
      })
      .eq('id', id);

    const duration = Date.now() - startTime;
    console.log('activity_type_classified:', {
      id,
      activity_type: finalActivityType,
      confidence: result.confidence,
      reason: result.reason,
      ms: duration
    });

    return NextResponse.json({
      ok: true,
      activity_type: finalActivityType,
      confidence: result.confidence,
      method: 'llm'
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('activity_type_error:', { id, error: error.message, ms: duration });

    // Set core on error (conservative default)
    try {
      await supabaseAdmin
        .from('evidence')
        .update({
          activity_type: 'core',
          activity_type_source: 'auto',
          activity_type_classified_at: new Date().toISOString()
        })
        .eq('id', id);
    } catch (updateError) {
      console.error('Failed to update after error:', updateError);
    }

    return NextResponse.json({
      ok: true,
      activity_type: 'core',
      error: error.message
    });
  }
}
