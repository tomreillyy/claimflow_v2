import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSGCRate, getPayrollTaxRate } from '@/lib/onCostCalculator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const COST_INTERVIEW_SYSTEM_PROMPT = `You are an RDTI cost analyst helping an Australian company document their R&D expenditure for a tax incentive claim.

Your job: have a friendly, conversational chat to gather cost information. Ask about 2-3 things per message — don't overwhelm the user. Keep it natural.

## What you need to gather:

### Staff costs (MOST IMPORTANT)
- Names and roles of people who worked on R&D
- Their approximate annual salary (gross, before tax)
- What % of their time was spent on R&D activities (vs non-R&D work)

### External costs (ask after staff)
- Any external contractors or consultants used for R&D work
  - Who, what they did, roughly how much they were paid
- Cloud services or dev tools paid for (AWS, Azure, GitHub Enterprise, etc.)
  - Monthly/annual cost and what % is for R&D vs production

### Company info (ask early)
- Which Australian state/territory the company is based in (for payroll tax calculation)

## Rules:
- Staff costs = salary + superannuation (SGC rate) + on-costs (payroll tax, workers comp, leave provisions)
- YOU calculate super and on-costs — the user just gives you the salary
- If the user gives rough numbers, that's fine. Round to nearest $1,000.
- Contractors need a brief description of the R&D work they performed
- For cloud costs, ask what portion is R&D vs production
- Don't ask about depreciation or overheads — keep it focused
- Be encouraging — most users find costs boring, make it painless

## Response format:
You MUST always respond with valid JSON in this exact format:
{
  "reply": "Your conversational message to the user (markdown OK)",
  "extractedData": {
    "state": null or "NSW"/"VIC"/"QLD"/etc,
    "staffCosts": [
      { "name": "Full Name", "role": "Role", "annualSalary": 140000, "rdPercent": 80 }
    ],
    "contractors": [
      { "vendor": "Company Name", "description": "What they did", "amount": 30000, "rdPercent": 100 }
    ],
    "cloudCosts": [
      { "service": "AWS", "monthlyAmount": 3000, "rdPercent": 50 }
    ]
  },
  "stage": "team" | "external_costs" | "apportionment" | "review",
  "complete": false
}

- Start with stage "team" and ask about staff
- Move to "external_costs" once you have staff info
- Move to "apportionment" if you need to clarify R&D percentages
- Move to "review" when you have everything — summarise what you captured and ask the user to confirm
- Set complete: true ONLY in the review stage when user confirms
- Always include ALL previously captured data in extractedData (accumulate, don't reset)
- extractedData should contain whatever you've captured so far, even if incomplete`;

/**
 * POST /api/projects/[token]/costs/ai-interview
 *
 * Conversational AI for gathering R&D cost data.
 * Body: { messages: [{ role: 'user'|'assistant', content: string }] }
 * Response: { reply, extractedData, stage, complete }
 */
export async function POST(req, { params }) {
  try {
    const { token } = await params;

    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id, name, year')
      .eq('project_token', token)
      .is('deleted_at', null)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await req.json();
    const { messages = [] } = body;

    // Fetch project context to feed the AI
    const [{ data: activities }, { data: evidence }, { data: company }] = await Promise.all([
      supabaseAdmin
        .from('core_activities')
        .select('id, name, uncertainty')
        .eq('project_id', project.id),
      supabaseAdmin
        .from('evidence')
        .select('id, author_email, created_at, linked_activity_id, content')
        .eq('project_id', project.id)
        .or('soft_deleted.is.null,soft_deleted.eq.false')
        .not('author_email', 'is', null)
        .limit(100),
      supabaseAdmin
        .from('companies')
        .select('state_territory, aggregated_turnover_band')
        .eq('user_id', project.owner_id || user.id)
        .maybeSingle(),
    ]);

    // Build context about what we know
    const fyYear = project.year || '2025';
    const sgcRate = getSGCRate(fyYear);

    let projectContext = `\n## Project context:\n- Project: ${project.name}\n- Tax year: FY${fyYear}\n- SGC rate: ${(sgcRate * 100).toFixed(1)}%`;

    if (activities && activities.length > 0) {
      projectContext += `\n- R&D Activities:\n${activities.map(a => `  - ${a.name}`).join('\n')}`;
    }

    if (company?.state_territory) {
      const ptRate = getPayrollTaxRate(company.state_territory);
      projectContext += `\n- Company state: ${company.state_territory} (payroll tax rate: ${(ptRate * 100).toFixed(2)}%)`;
    }

    // Summarise evidence authors to help AI with apportionment
    if (evidence && evidence.length > 0) {
      const authorCounts = {};
      for (const e of evidence) {
        if (e.author_email) {
          authorCounts[e.author_email] = (authorCounts[e.author_email] || 0) + 1;
        }
      }
      if (Object.keys(authorCounts).length > 0) {
        projectContext += `\n- Evidence authors (to help with R&D time estimation):\n${
          Object.entries(authorCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([email, count]) => `  - ${email}: ${count} evidence items`)
            .join('\n')
        }`;
      }
    }

    // Build messages for OpenAI
    const systemMessage = COST_INTERVIEW_SYSTEM_PROMPT + projectContext;

    const openaiMessages = [
      { role: 'system', content: systemMessage },
    ];

    if (messages.length === 0) {
      // First message — AI starts the conversation
      openaiMessages.push({
        role: 'user',
        content: 'Start the cost interview. Greet me and ask about my R&D team.'
      });
    } else {
      // Continue conversation
      for (const msg of messages) {
        openaiMessages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }

    // Call OpenAI
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: openaiMessages,
        temperature: 0.4,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI error:', errorText);
      return NextResponse.json({ error: 'AI service error' }, { status: 502 });
    }

    const completion = await response.json();
    const rawContent = completion.choices?.[0]?.message?.content;

    if (!rawContent) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 502 });
    }

    // Parse JSON response
    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', rawContent);
      return NextResponse.json({
        reply: rawContent,
        extractedData: { staffCosts: [], contractors: [], cloudCosts: [], state: null },
        stage: 'team',
        complete: false,
      });
    }

    return NextResponse.json({
      reply: parsed.reply || '',
      extractedData: parsed.extractedData || { staffCosts: [], contractors: [], cloudCosts: [], state: null },
      stage: parsed.stage || 'team',
      complete: parsed.complete || false,
    });

  } catch (error) {
    console.error('Cost interview error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
