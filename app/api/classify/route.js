import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Sanitize email text: strip HTML, quotes, signatures
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

// Call LLM for classification
async function classifyWithLLM(content) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('No LLM API key configured');
    return { step: 'Unknown', confidence: 0 };
  }

  const prompt = `You are classifying R&D evidence for Australian RDTI compliance (ITAA 1997 s.355-25).
Core R&D requires systematic progression: Hypothesis → Experiment → Observation → Evaluation → Conclusion.

Classify this text into ONE of those five steps.
Return JSON exactly: {"step":"Hypothesis|Experiment|Observation|Evaluation|Conclusion|Unknown","confidence":0..1}
If unclear or non-R&D, return {"step":"Unknown","confidence":0}.

Text: """
${content}
"""`;

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
            { role: 'system', content: 'You are a precise JSON classifier. Always return valid JSON.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 100
        }),
        signal: AbortSignal.timeout(10000) // 10s timeout
      });

      if (!response.ok) {
        console.error('OpenAI API error:', response.status);
        return { step: 'Unknown', confidence: 0 };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) return { step: 'Unknown', confidence: 0 };

      // Parse JSON response
      const result = JSON.parse(content);

      // Strict contract validation
      const validSteps = ['Hypothesis', 'Experiment', 'Observation', 'Evaluation', 'Conclusion', 'Unknown'];
      if (!validSteps.includes(result.step) || typeof result.confidence !== 'number') {
        console.log('Invalid LLM response format:', result);
        return { step: 'Unknown', confidence: 0 };
      }

      return result;
    }

    // Fallback: no API key
    return { step: 'Unknown', confidence: 0 };

  } catch (error) {
    console.error('Classification error:', error.message);
    return { step: 'Unknown', confidence: 0 };
  }
}

export async function POST(req) {
  const startTime = Date.now();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  try {
    // Fetch evidence
    const { data: evidence, error: fetchError } = await supabaseAdmin
      .from('evidence')
      .select('id, content, systematic_step_primary, systematic_step_source, classified_at')
      .eq('id', id)
      .single();

    if (fetchError || !evidence) {
      console.error('Evidence not found:', id);
      return NextResponse.json({ error: 'evidence not found' }, { status: 404 });
    }

    // Skip manually classified evidence
    if (evidence.systematic_step_source === 'manual') {
      return NextResponse.json({
        ok: true,
        step: evidence.systematic_step_primary,
        skipped: 'manual'
      });
    }

    // Idempotent: already classified
    if (evidence.classified_at) {
      return NextResponse.json({
        ok: true,
        step: evidence.systematic_step_primary,
        cached: true
      });
    }

    // Prefilter 1: no content
    if (!evidence.content || evidence.content.trim().length === 0) {
      await supabaseAdmin
        .from('evidence')
        .update({
          systematic_step_primary: 'Unknown',
          classified_at: new Date().toISOString()
        })
        .eq('id', id);

      console.log('classification_unknown:', { id, reason: 'no_content' });
      return NextResponse.json({ ok: true, step: 'Unknown', reason: 'no_content' });
    }

    // Sanitize text
    const cleanContent = sanitizeText(evidence.content);

    // Prefilter 2: < 10 chars after sanitization
    if (cleanContent.length < 10) {
      await supabaseAdmin
        .from('evidence')
        .update({
          systematic_step_primary: 'Unknown',
          classified_at: new Date().toISOString()
        })
        .eq('id', id);

      console.log('classification_unknown:', { id, reason: 'too_short', length: cleanContent.length });
      return NextResponse.json({ ok: true, step: 'Unknown', reason: 'too_short' });
    }

    // Call LLM
    const result = await classifyWithLLM(cleanContent);

    // Apply confidence threshold
    let finalStep = result.step;
    if (result.confidence < 0.7) {
      finalStep = 'Unknown';
      console.log('classification_unknown:', { id, reason: 'low_confidence', confidence: result.confidence });
    }

    // Persist result
    await supabaseAdmin
      .from('evidence')
      .update({
        systematic_step_primary: finalStep,
        classified_at: new Date().toISOString()
      })
      .eq('id', id);

    const duration = Date.now() - startTime;
    console.log('classification_call:', { id, step: finalStep, confidence: result.confidence, ms: duration });

    return NextResponse.json({
      ok: true,
      step: finalStep,
      confidence: result.confidence
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('classification_error:', { id, error: error.message, ms: duration });

    // Set Unknown on error
    try {
      await supabaseAdmin
        .from('evidence')
        .update({
          systematic_step_primary: 'Unknown',
          classified_at: new Date().toISOString()
        })
        .eq('id', id);
    } catch (updateError) {
      console.error('Failed to update after error:', updateError);
    }

    return NextResponse.json({
      ok: true,
      step: 'Unknown',
      error: error.message
    });
  }
}
