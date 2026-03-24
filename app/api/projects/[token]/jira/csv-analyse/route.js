import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * POST — Parse a Jira CSV export, group by epic, AI-classify as R&D or not,
 * and return draft activities with evidence mappings.
 */
export async function POST(req, { params }) {
  const { token } = await params;

  // Get project
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('id, name, year, current_hypothesis')
    .eq('project_token', token)
    .is('deleted_at', null)
    .single();

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Parse multipart form data
  const formData = await req.formData();
  const file = formData.get('file');
  if (!file) {
    return NextResponse.json({ error: 'No CSV file provided' }, { status: 400 });
  }

  const csvText = await file.text();
  const rows = parseCsv(csvText);

  if (rows.length === 0) {
    return NextResponse.json({ error: 'CSV is empty or could not be parsed' }, { status: 400 });
  }

  // Group issues by epic
  const grouped = groupByEpic(rows);

  // Send to AI for classification
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
  }

  try {
    const results = await classifyEpics(grouped, project, apiKey);
    return NextResponse.json({
      totalIssues: rows.length,
      epicCount: Object.keys(grouped).length,
      results
    });
  } catch (err) {
    console.error('[Jira CSV] AI classification error:', err);
    return NextResponse.json({ error: 'AI classification failed: ' + err.message }, { status: 500 });
  }
}

/**
 * Parse CSV text into array of objects using header row
 */
function parseCsv(text) {
  const lines = text.split('\n');
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] || '').trim();
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Parse a single CSV line handling quoted fields
 */
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Group issues by their epic. Jira CSV uses various column names for epic.
 */
function groupByEpic(rows) {
  // Find the epic column — Jira exports use different names
  const epicKeys = ['epic link', 'epic name', 'epic', 'custom field (epic link)', 'custom field (epic name)', 'parent'];
  const summaryKeys = ['summary', 'title', 'issue summary'];
  const keyKeys = ['issue key', 'key', 'issue id'];
  const typeKeys = ['issue type', 'type', 'issuetype'];
  const statusKeys = ['status'];
  const descKeys = ['description'];
  const createdKeys = ['created', 'date created'];
  const resolvedKeys = ['resolved', 'date resolved', 'resolution date'];
  const labelsKeys = ['labels', 'label'];

  function findCol(row, candidates) {
    const rowKeys = Object.keys(row);
    for (const c of candidates) {
      if (rowKeys.includes(c)) return c;
    }
    return null;
  }

  const sample = rows[0] || {};
  const epicCol = findCol(sample, epicKeys);
  const summaryCol = findCol(sample, summaryKeys);
  const keyCol = findCol(sample, keyKeys);
  const typeCol = findCol(sample, typeKeys);
  const statusCol = findCol(sample, statusKeys);
  const descCol = findCol(sample, descKeys);
  const createdCol = findCol(sample, createdKeys);
  const resolvedCol = findCol(sample, resolvedKeys);
  const labelsCol = findCol(sample, labelsKeys);

  const groups = {};

  for (const row of rows) {
    const epicName = (epicCol ? row[epicCol] : '') || 'Ungrouped';
    const issue = {
      key: keyCol ? row[keyCol] : '',
      summary: summaryCol ? row[summaryCol] : '',
      type: typeCol ? row[typeCol] : '',
      status: statusCol ? row[statusCol] : '',
      description: descCol ? (row[descCol] || '').slice(0, 500) : '',
      created: createdCol ? row[createdCol] : '',
      resolved: resolvedCol ? row[resolvedCol] : '',
      labels: labelsCol ? row[labelsCol] : '',
    };

    if (!groups[epicName]) {
      groups[epicName] = [];
    }
    groups[epicName].push(issue);
  }

  return groups;
}

/**
 * AI classify each epic group — is it R&D? If so, generate activity draft.
 */
async function classifyEpics(grouped, project, apiKey) {
  const epicNames = Object.keys(grouped);

  // Build a summary of all epics and their issues for the AI
  const epicSummaries = epicNames.map(name => {
    const issues = grouped[name];
    const issueList = issues.slice(0, 15).map(i =>
      `  - [${i.type}] ${i.key}: ${i.summary}${i.status ? ' (' + i.status + ')' : ''}`
    ).join('\n');
    return `Epic: "${name}" (${issues.length} issues)\n${issueList}`;
  }).join('\n\n');

  const prompt = `You are an Australian RDTI (R&D Tax Incentive) specialist analysing Jira project data to identify R&D activities.

## Project Context
Name: ${project.name}
Year: ${project.year}
Hypothesis: ${project.current_hypothesis || 'Not specified'}

## Jira Epics & Issues
${epicSummaries}

## Your Task
For each epic, determine:
1. Is this R&D work? (technical uncertainty, systematic experimentation, new knowledge)
2. If yes, reword the epic name into an RDTI-appropriate activity name
3. Draft the uncertainty statement, hypothesis, and what was learned
4. Classify each issue into a systematic step (Hypothesis, Experiment, Observation, Evaluation, Conclusion)

## RDTI Criteria
- Core R&D (s.355-25): technical uncertainty, outcome not knowable in advance, systematic progression
- Supporting (s.355-30): directly enables core R&D (testbeds, data prep, integration)
- NOT R&D: routine dev, bug fixes, UI polish, deployment, documentation, admin tools

## Rewording Rules
- Lead with the technical uncertainty, not the business goal
- Use RDTI language: "investigation", "systematic", "novel approach"
- Strip commercial framing
- Keep it accurate to the actual work

## Output (valid JSON only, no fences):
[
  {
    "epic_name": "original epic name",
    "is_rd": true,
    "classification": "core" or "supporting" or "not_rd",
    "reason": "1-2 sentence explanation of why this is/isn't R&D",
    "activity_name": "RDTI-reworded name (3-10 words)" or null,
    "uncertainty": "The specific technical unknown being investigated" or null,
    "hypothesis": "We hypothesised that..." or null,
    "conclusion": "This activity determined whether..." or null,
    "issues": [
      {"key": "PROJ-123", "step": "Experiment", "summary": "brief issue summary"}
    ]
  }
]

Return results for ALL epics, including those classified as not_rd.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a precise JSON generator specialising in Australian RDTI classification. Return valid JSON arrays only, no prose or code fences.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 4000
    }),
    signal: AbortSignal.timeout(60000)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  let content = data.choices?.[0]?.message?.content?.trim() || '';
  content = content.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();

  let results;
  try {
    const match = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
    results = JSON.parse(match ? match[0] : content);
  } catch {
    console.error('[Jira CSV] Failed to parse AI response:', content.slice(0, 300));
    throw new Error('Failed to parse AI classification response');
  }

  if (!Array.isArray(results)) {
    throw new Error('AI response was not an array');
  }

  return results;
}
