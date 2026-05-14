import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 20;

/**
 * POST /api/ai/rewrite
 * Rewrites selected text to be more RDTI-compliant.
 * Body: { text: string, context?: string }
 * Response: { rewritten: string }
 */
export async function POST(req) {
  const { error } = await getAuthenticatedUser(req);
  if (error) return NextResponse.json({ error }, { status: 401 });

  const { text, context } = await req.json().catch(() => ({}));
  if (!text?.trim()) {
    return NextResponse.json({ error: 'No text provided' }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 1000,
        messages: [
          {
            role: 'system',
            content: `You are an expert editor for Australian R&D Tax Incentive (RDTI) claim narratives. Rewrite the given text to be clearer, more precise, and better aligned with AusIndustry requirements. Keep the same meaning and facts. Use factual, neutral, evidence-based language. No marketing speak. Focus on technical specifics, metrics, and outcomes. Return ONLY the rewritten text, no explanation.`,
          },
          {
            role: 'user',
            content: `Rewrite this text for an RDTI ${context || 'claim narrative'}:\n\n${text}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const rewritten = data.choices?.[0]?.message?.content?.trim();

    if (!rewritten) {
      throw new Error('Empty response from OpenAI');
    }

    return NextResponse.json({ rewritten });
  } catch (err) {
    console.error('Rewrite failed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
