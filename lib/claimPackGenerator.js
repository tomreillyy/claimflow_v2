// Claim Pack Generator - AI prompt builder and section generation
// Generates RDTI-compliant claim pack sections using OpenAI GPT-4o

import { AIRD_SYSTEM_PROMPT, SECTION_KEYS, SYSTEMATIC_STEPS, TOKEN_LIMITS } from './airdMasterContext';

// Helper: Clean and truncate text snippet
function cleanSnippet(text, maxLength = TOKEN_LIMITS.MAX_SNIPPET_LENGTH) {
  if (!text) return '';

  let clean = text
    .replace(/<[^>]*>/g, '') // Strip HTML
    .replace(/^>.*$/gm, '') // Remove quoted lines
    .replace(/On .* wrote:/gi, '')
    .replace(/--\s*$/m, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (clean.length <= maxLength) return clean;

  const truncated = clean.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > maxLength * 0.8 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
}

// Helper: Format evidence for AI prompt
function formatEvidenceSnippet(evidence) {
  const date = new Date(evidence.created_at).toISOString().split('T')[0];
  const id = evidence.id.substring(0, 8);
  const source = evidence.source === 'email' ? 'Email' : evidence.source === 'note' ? 'Note' : 'Upload';
  const snippet = cleanSnippet(evidence.content);

  return `- [${id}|${date}|${source}] ${snippet}`;
}

// Helper: Group evidence by systematic step
function groupEvidenceByStep(evidence) {
  const byStep = {};

  for (const step of SYSTEMATIC_STEPS) {
    const stepEvidence = evidence.filter(e => e.systematic_step_primary === step);
    if (stepEvidence.length > 0) {
      byStep[step] = stepEvidence.slice(0, TOKEN_LIMITS.MAX_EVIDENCE_SNIPPETS);
    }
  }

  return byStep;
}

// ============================================================================
// SECTION PROMPT GENERATORS
// ============================================================================

export function generateRdtiOverviewPrompt() {
  return `Generate the "What the RDTI Is" section for an R&D claim pack.

This is a 1-page summary explaining the Australian R&D Tax Incentive program.

Include:
- Purpose: tax offsets for eligible R&D activities generating new knowledge via experimentation
- AusIndustry assesses activities; ATO assesses expenditure/offsets
- Offset rates (from 1 July 2021):
  - <$20m aggregated turnover: refundable offset = company tax rate + 18.5%
  - ≥$20m: non-refundable = company tax rate + intensity premium (8.5%-16.5%)
- Registration deadline: within 10 months after end of income year
- Statutory basis: ITAA 1997 s.355-25

Output: 3-4 paragraphs (400-500 words) in plain text with markdown formatting.
Keep factual and neutral. No marketing language.`;
}

export function generateEligibleRdPrompt() {
  return `Generate the "What Counts as Eligible R&D" section for a software company's R&D claim pack.

Explain the eligibility criteria specific to software development.

Include:
- Core R&D requirements: (1) experimental, (2) systematic progression, (3) new knowledge
- Software lens: technical uncertainty not readily resolvable by competent professional
- Examples of eligible work: novel algorithms, scaling/latency limits, ML viability
- Supporting R&D: dominant purpose test (direct link to core activity)
- Explicit exclusions:
  - Internal administration software (only as supporting if linked)
  - Whole-of-platform builds without isolating experiments
  - Routine bug fixes, UI polish, BAU operations

Output: 4-5 paragraphs (500-600 words) in plain text with markdown formatting.
Reference AusIndustry Software Sector Guide (May 2024).`;
}

export function generateProjectOverviewPrompt(project, activities, evidenceCount) {
  const activityNames = activities.map(a => a.name).join(', ');

  return `Generate the "Project Overview & Prior Art" section for this R&D claim.

**Project:** ${project.name}
**Tax Year:** ${project.year}
**Hypothesis:** ${project.current_hypothesis || 'Not specified'}
**Activities:** ${activityNames}
**Total Evidence Items:** ${evidenceCount}

Include:
1. **Technical Problem Statement**
   - What technical uncertainty was addressed?
   - Why couldn't existing knowledge or standard approaches solve it?

2. **Prior Art Review**
   - What was already known/tried before this R&D?
   - What publicly available solutions were considered?
   - Why were they inadequate?

3. **Competent Professional Test**
   - Why couldn't a competent professional in the field readily solve this?
   - What made the outcome non-obvious or non-determinable?

4. **R&D Scope**
   - What work was included in R&D activities?
   - What was excluded as BAU/non-R&D?

Output: 3-4 paragraphs (400-600 words) in plain text with markdown formatting.
Be specific about technical challenges. Avoid vague statements like "improve performance".`;
}

export function generateCoreActivityPrompt(project, activity, narrative, evidence) {
  const evidenceByStep = groupEvidenceByStep(evidence);
  const missingSteps = SYSTEMATIC_STEPS.filter(step => !evidenceByStep[step]);

  // Build evidence summary
  const evidenceSummary = SYSTEMATIC_STEPS
    .filter(step => evidenceByStep[step])
    .map(step => {
      const items = evidenceByStep[step].map(formatEvidenceSnippet).join('\n');
      return `**${step}**\n${items}`;
    })
    .join('\n\n');

  return `Generate a Core Activity statement for RDTI compliance.

**Activity:** ${activity.name}
**Technical Uncertainty:** ${activity.uncertainty}
**Project Hypothesis:** ${project.current_hypothesis || 'Not specified'}

${narrative?.text ? `**Existing Narrative:**\n${narrative.text}\n` : ''}

**Evidence by Systematic Step:**
${evidenceSummary || 'No evidence available'}

${missingSteps.length > 0 ? `**Missing Steps:** ${missingSteps.join(', ')}` : ''}

Output structured format:

### Technical Uncertainty
[Why the outcome wasn't knowable upfront - 2-3 sentences]

### Hypothesis
[Testable technical proposition with success criteria - 1-2 sentences]

### Experimental Method
[How tested: methods, metrics, test environments - 2-3 sentences]

### Systematic Work & Results
[Chronological progression citing evidence IDs and dates - 3-5 sentences]
${missingSteps.length > 0 ? `[Note missing steps: ${missingSteps.join(', ')}]` : ''}

### Conclusion & New Knowledge
[What was learned that wasn't known before - 2-3 sentences]

Total: 400-600 words in plain text with markdown headings.
Include specific metrics, dates, and evidence IDs where available.`;
}

export function generateSupportingActivitiesPrompt(supportingEvidence, coreActivities) {
  if (!supportingEvidence || supportingEvidence.length === 0) {
    return null;
  }

  // Group by linked activity
  const byActivity = {};
  supportingEvidence.forEach(ev => {
    const activityId = ev.linked_activity_id;
    if (activityId) {
      if (!byActivity[activityId]) {
        byActivity[activityId] = [];
      }
      byActivity[activityId].push(ev);
    }
  });

  // Build activity summaries
  const activitySummaries = Object.entries(byActivity).map(([activityId, evidence]) => {
    const activity = coreActivities.find(a => a.id === activityId);
    const activityName = activity?.name || 'Unknown Activity';
    const evidenceList = evidence.slice(0, 5).map(formatEvidenceSnippet).join('\n');

    return `**Linked to:** ${activityName}
**Evidence:**
${evidenceList}`;
  }).join('\n\n---\n\n');

  return `Generate the "Supporting R&D Activities" section for this claim pack.

Supporting activities must meet the **dominant purpose test**: direct relationship to a named core activity with dominant purpose to support it.

**Supporting Evidence:**
${activitySummaries}

Include:
1. **Introduction**
   - Brief explanation of supporting activity requirements (dominant purpose test)
   - Overview of supporting work performed

2. **Supporting Activity Statements** (for each group)
   - Activity description
   - Which core activity it supports (name + dominant purpose link)
   - Why it was necessary for the experiment
   - Evidence summary (dates, sources)

Output: 2-4 paragraphs (300-500 words) in plain text with markdown formatting.
For each supporting activity, explicitly state the dominant-purpose link to the core activity.`;
}

export function generateEvidenceIndexPrompt(evidence, activities) {
  const coreEvidence = evidence.filter(e => e.evidence_type === 'core');
  const supportingEvidence = evidence.filter(e => e.evidence_type === 'supporting');
  const otherEvidence = evidence.filter(e => !e.evidence_type);

  const sourceCounts = {};
  evidence.forEach(e => {
    const source = e.source || 'unknown';
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  });

  const stepCounts = {};
  evidence.forEach(e => {
    const step = e.systematic_step_primary;
    if (step && step !== 'Unknown') {
      stepCounts[step] = (stepCounts[step] || 0) + 1;
    }
  });

  return `Generate the "Evidence Index" section for this R&D claim pack.

**Evidence Summary:**
- Total evidence items: ${evidence.length}
- Core R&D evidence: ${coreEvidence.length}
- Supporting R&D evidence: ${supportingEvidence.length}
- Other evidence: ${otherEvidence.length}

**Sources:**
${Object.entries(sourceCounts).map(([source, count]) => `- ${source}: ${count}`).join('\n')}

**Systematic Steps Coverage:**
${Object.entries(stepCounts).map(([step, count]) => `- ${step}: ${count}`).join('\n')}

Include:
1. **Contemporaneous Records Statement**
   - All evidence created at/near time of work
   - Timestamped and attributed
   - Traceable to specific activities
   - Satisfies ITAA 1997 s.355-25 requirements

2. **Evidence Categories**
   - Git commits and pull requests
   - Engineering notes and documentation
   - Email correspondence
   - File uploads and attachments
   - Test results and benchmarks

3. **Evidence Organization**
   - By core activity (${activities.length} activities)
   - By systematic step (${Object.keys(stepCounts).length} steps covered)
   - Source breakdown (note/email/upload/git)

4. **Traceability**
   - Each item has unique ID (first 8 chars shown in pack)
   - Linked to specific core or supporting activities
   - Includes date, author, source metadata

Output: 2-3 paragraphs (250-400 words) in plain text with markdown formatting.
Emphasize contemporaneous nature and traceability. No need to list individual evidence items (tables provided separately).`;
}

export function generateFinancialsPrompt(costLedger, activities, project) {
  if (!costLedger || costLedger.length === 0) {
    return `Generate the "Financials & Notional Deductions" section for this R&D claim pack.

**Note:** No payroll data uploaded yet. This section will be a template.

Include:
1. **Cost Categories** (template structure)
   - Salaries & on-costs (PAYG, superannuation)
   - Contractors/consultants
   - EP&E depreciation
   - Overheads (cloud compute, licenses)

2. **Apportionment Methodology**
   - [Placeholder for methodology description]
   - Example methods: timesheets, ticket-linked time, statistical sampling
   - Must be consistent and justifiable

3. **Notional Deductions Calculation**
   - [Placeholder for calculation worksheet]
   - Total R&D expenditure: [TBD]
   - Offset rate: [Based on turnover band]

4. **ATO R&D Schedule Tie-out**
   - [Placeholder for reconciliation]
   - Mapping to R&D schedule line items

Output: 2-3 paragraphs (200-300 words) in plain text with markdown formatting.
Use placeholders where data not available. Explain what will be completed once payroll uploaded.`;
  }

  const totalAmount = costLedger.reduce((sum, entry) => sum + parseFloat(entry.total_amount || 0), 0);
  const uniquePeople = [...new Set(costLedger.map(e => e.person_identifier))];
  const months = [...new Set(costLedger.map(e => e.month))].sort();

  return `Generate the "Financials & Notional Deductions" section for this R&D claim pack.

**Cost Data Summary:**
- Total payroll costs: $${totalAmount.toLocaleString('en-AU', {minimumFractionDigits: 2})}
- Personnel: ${uniquePeople.length} people
- Period covered: ${months.length} months
- Activities: ${activities.length} core activities

**Apportionment Method:**
${costLedger[0]?.basis_text || 'Not specified'}

Include:
1. **Cost Categories**
   - Salaries & on-costs breakdown
   - Apportioned vs unapportioned amounts
   - Allocation methodology

2. **Apportionment Methodology**
   - Explain how costs allocated to R&D
   - Basis: ${costLedger[0]?.basis_text || 'percentage/hours-based allocation'}
   - Consistency and justification

3. **Notional Deductions Calculation**
   - Total eligible R&D expenditure: $${totalAmount.toLocaleString('en-AU', {minimumFractionDigits: 2})}
   - Offset rate: [Based on ${project.year} turnover - to be determined]
   - Estimated offset: [Calculate based on applicable rate]

4. **Record-Keeping**
   - Source documents: payroll reports
   - Allocation records: monthly attestations
   - Traceability to activities

Output: 3-4 paragraphs (400-500 words) in plain text with markdown formatting.
Include specific dollar amounts and explain apportionment methodology clearly.`;
}

export function generateRdBoundaryPrompt(project, activities, evidence) {
  const coreEvidence = evidence.filter(e => e.evidence_type === 'core');
  const supportingEvidence = evidence.filter(e => e.evidence_type === 'supporting');
  const uncategorizedEvidence = evidence.filter(e => !e.evidence_type);

  return `Generate the "R&D vs Non-R&D Boundary" section for this claim pack.

**Project:** ${project.name}
**Core Activities:** ${activities.length}
**Evidence Breakdown:**
- Core R&D: ${coreEvidence.length} items
- Supporting R&D: ${supportingEvidence.length} items
- Uncategorized: ${uncategorizedEvidence.length} items

Include:
1. **What Was Claimed as R&D**
   - Core experimental activities (${activities.length} activities)
   - Supporting activities with dominant purpose link
   - Clear experimental objectives and systematic progression

2. **What Was NOT Claimed**
   - Routine development/BAU work
   - UI polish and UX improvements (unless part of experiment)
   - Deployment and infrastructure (unless experimental)
   - Bug fixes and maintenance (unless novel technical challenge)
   - General integration work

3. **Scoping Methodology**
   - How R&D work was isolated from non-R&D
   - Evidence categorization process (core/supporting/excluded)
   - Review and approval process

4. **Exclusions Justification**
   - Internal admin software (if any) - excluded or supporting only
   - Productization work - separated from experimental R&D
   - Whole-of-platform considerations

Output: 2-3 paragraphs (300-400 words) in plain text with markdown formatting.
Be specific about what was excluded and why. This demonstrates compliance awareness.`;
}

export function generateOverseasContractedPrompt(project) {
  return `Generate the "Overseas & Contracted Work" section for this claim pack.

**Project:** ${project.name}

**Assumption:** If no overseas findings or RSP agreements exist, state "Not Applicable".

Include (if applicable):
1. **Overseas R&D**
   - Advance findings from AusIndustry (if any)
   - Work performed overseas vs in Australia
   - How overseas work relates to Australian R&D

2. **Registered Science Partnerships (RSPs)**
   - RSP agreements (if any)
   - Contracted research providers
   - Collaboration arrangements

3. **Related Party Arrangements**
   - Inter-company R&D (if any)
   - Transfer pricing considerations
   - Arm's length terms

Output: 1-2 paragraphs (150-250 words) in plain text with markdown formatting.
If none of the above apply, state "Not Applicable - all R&D conducted in Australia by internal team."`;
}

export function generateRegistrationTieoutPrompt(project, activities) {
  return `Generate the "Registration & Tax Return Tie-out" section for this claim pack.

**Project:** ${project.name}
**Tax Year:** ${project.year}
**Core Activities:** ${activities.length}

Include:
1. **Registration Status**
   - Activity descriptions submitted to AusIndustry portal
   - Registration deadline: [10 months after end of ${project.year}]
   - Confirmation/acknowledgement (if available)

2. **Activity Descriptions** (for portal)
   - Concise descriptions of ${activities.length} core activities
   - Focus on hypothesis, uncertainty, systematic progression
   - Format for portal character limits

3. **ATO R&D Schedule Mapping**
   - How activities map to R&D schedule line items
   - Notional deductions allocation
   - Offset calculation

4. **Reconciliation**
   - Claim pack activities ↔ Portal registration ↔ Tax return
   - Consistency check across all submissions

Output: 2-3 paragraphs (250-350 words) in plain text with markdown formatting.
Emphasize consistency between portal registration and this claim pack.`;
}

export function generateAttestationsPrompt(project) {
  return `Generate the "Attestations & Sign-offs" section for this claim pack.

**Project:** ${project.name}

Include:
1. **Internal Sign-offs Required**
   - Technical lead/CTO: Confirms R&D nature of work, technical uncertainty
   - CFO/Finance: Confirms cost apportionment methodology and amounts
   - CEO/Managing Director: Overall claim accuracy and completeness

2. **Methodology Acknowledgements**
   - Apportionment method documented and applied consistently
   - Evidence collection process (AIRD system usage)
   - Review and quality control procedures

3. **Reviewer Attestation**
   - Responsible person has reviewed this claim pack
   - Evidence examined and assessed for RDTI compliance
   - Statutory declarations (if required)

4. **Document Control**
   - Generated: [Date]
   - Version: [1.0]
   - Next review: [Before submission to advisors/AusIndustry]

Output: 2-3 paragraphs (200-300 words) in plain text with markdown formatting.
Include placeholder signature blocks for key stakeholders.`;
}

// ============================================================================
// MAIN GENERATOR FUNCTION
// ============================================================================

export async function generateClaimPackSection(sectionKey, projectData) {
  const { project, activities, evidence, narratives, costLedger } = projectData;

  let userPrompt;

  switch (sectionKey) {
    case SECTION_KEYS.RDTI_OVERVIEW:
      userPrompt = generateRdtiOverviewPrompt();
      break;

    case SECTION_KEYS.ELIGIBLE_RD:
      userPrompt = generateEligibleRdPrompt();
      break;

    case SECTION_KEYS.PROJECT_OVERVIEW:
      userPrompt = generateProjectOverviewPrompt(project, activities, evidence.length);
      break;

    case SECTION_KEYS.CORE_ACTIVITIES:
      // Special case: generate per activity, then combine
      const activitySections = await Promise.all(
        activities.map(async (activity) => {
          const activityEvidence = evidence.filter(e =>
            e.linked_activity_id === activity.id && e.evidence_type === 'core'
          );
          const narrative = narratives.find(n => n.activity_id === activity.id);
          const prompt = generateCoreActivityPrompt(project, activity, narrative, activityEvidence);
          return callOpenAI(prompt);
        })
      );
      return activitySections.join('\n\n---\n\n');

    case SECTION_KEYS.SUPPORTING_ACTIVITIES:
      const supportingEvidence = evidence.filter(e => e.evidence_type === 'supporting');
      userPrompt = generateSupportingActivitiesPrompt(supportingEvidence, activities);
      if (!userPrompt) {
        return 'No supporting activities recorded for this project.';
      }
      break;

    case SECTION_KEYS.EVIDENCE_INDEX:
      userPrompt = generateEvidenceIndexPrompt(evidence, activities);
      break;

    case SECTION_KEYS.FINANCIALS:
      userPrompt = generateFinancialsPrompt(costLedger, activities, project);
      break;

    case SECTION_KEYS.RD_BOUNDARY:
      userPrompt = generateRdBoundaryPrompt(project, activities, evidence);
      break;

    case SECTION_KEYS.OVERSEAS_CONTRACTED:
      userPrompt = generateOverseasContractedPrompt(project);
      break;

    case SECTION_KEYS.REGISTRATION_TIEOUT:
      userPrompt = generateRegistrationTieoutPrompt(project, activities);
      break;

    case SECTION_KEYS.ATTESTATIONS:
      userPrompt = generateAttestationsPrompt(project);
      break;

    default:
      throw new Error(`Unknown section key: ${sectionKey}`);
  }

  return callOpenAI(userPrompt);
}

// ============================================================================
// OPENAI API CALL
// ============================================================================

async function callOpenAI(userPrompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Use mini for cost efficiency, upgrade to gpt-4o for complex sections if needed
        messages: [
          { role: 'system', content: AIRD_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3, // Low temperature for consistency
        max_tokens: TOKEN_LIMITS.MAX_SECTION_TOKENS
      }),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    return content;

  } catch (error) {
    console.error('[ClaimPackGenerator] OpenAI error:', error);
    throw error;
  }
}
