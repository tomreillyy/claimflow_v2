// Claim Pack Generator - AI prompt builder and section generation
// Generates RDTI-compliant claim pack sections using OpenAI GPT-4o

import { CLAIMFLOW_SYSTEM_PROMPT, SECTION_KEYS, SYSTEMATIC_STEPS, TOKEN_LIMITS } from './claimFlowMasterContext';

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
  const source = evidence.source === 'email' ? 'Email' : evidence.source === 'note' ? 'Note' : evidence.source === 'document' ? 'Document' : evidence.source === 'github' ? 'GitHub' : 'Upload';
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

// Helper: Format knowledge document snippet for AI prompt (longer than evidence snippets)
function formatDocumentSnippet(doc, maxLength = 500) {
  const snippet = cleanSnippet(doc.extracted_text, maxLength);
  const date = new Date(doc.created_at).toISOString().split('T')[0];
  return `- [${doc.file_name} | ${date}] ${snippet}`;
}

// ============================================================================
// SECTION PROMPT GENERATORS
// ============================================================================
// NOTE: Generic RDTI explainer sections removed - we only generate project-specific content

export function generateProjectOverviewPrompt(project, activities, evidenceCount, knowledgeDocs = []) {
  const activityNames = activities.map(a => a.name).join(', ');

  const knowledgeSection = knowledgeDocs.length > 0
    ? `\n**Reference Documents (from Knowledge Base):**\n${knowledgeDocs.slice(0, 5).map(d => formatDocumentSnippet(d)).join('\n')}\n`
    : '';

  // Build technical framing section from structured fields if available
  const hasTechnicalFraming = project.technical_uncertainty || project.knowledge_gap || project.testing_method || project.success_criteria;
  const technicalFramingSection = hasTechnicalFraming
    ? `\n**Structured Technical Framing (use this as primary source):**
${project.technical_uncertainty ? `- **Technical Uncertainty:** ${project.technical_uncertainty}` : ''}
${project.knowledge_gap ? `- **Knowledge Gap:** ${project.knowledge_gap}` : ''}
${project.testing_method ? `- **Testing Method:** ${project.testing_method}` : ''}
${project.success_criteria ? `- **Success Criteria:** ${project.success_criteria}` : ''}\n`
    : '';

  return `Generate the "Project Overview & Existing Knowledge" section for this R&D claim.

**Project:** ${project.name}
**Tax Year:** ${project.year}
**Hypothesis:** ${project.current_hypothesis || 'Not specified'}
${project.project_overview ? `**Project Context:** ${project.project_overview}` : ''}
**Activities:** ${activityNames}
**Total Evidence Items:** ${evidenceCount}
${technicalFramingSection}${knowledgeSection}
Include:
1. **Technical Problem Statement**
   - What technical uncertainty was addressed?
   - Why couldn't existing knowledge or standard approaches solve it?
${hasTechnicalFraming ? '   - IMPORTANT: Use the structured technical framing fields above as primary source — these are direct inputs from the technical team' : ''}
${project.project_overview ? '   - Use the project context provided above to ground this in the specific challenges' : ''}

2. **Existing Knowledge Review**
   - What was already known/tried before this R&D?
   - What publicly available solutions or knowledge were considered (literature, patents, internet searches, expert advice)?
   - Why was existing knowledge inadequate to achieve the outcome?
${project.knowledge_gap ? '   - IMPORTANT: Reference the knowledge gap stated above directly' : ''}

3. **Competent Professional Test**
   - Why couldn't a competent professional in the field readily solve this?
   - What made the outcome non-obvious or non-determinable?
${project.success_criteria ? `   - The success criteria were: ${project.success_criteria}` : ''}

4. **R&D Scope**
   - What work was included in R&D activities?
   - What was excluded as BAU/non-R&D?

Output: 3-4 paragraphs (400-600 words) in plain text with markdown formatting.
Be specific about technical challenges. Avoid vague statements like "improve performance".
${hasTechnicalFraming ? 'CRITICAL: Ground every claim in the structured technical framing fields above. Do not substitute generic RDTI boilerplate.' : ''}
${project.project_overview ? 'IMPORTANT: Ground your response in the project context provided above.' : ''}`;
}

export function generateCoreActivityPrompt(project, activity, narrative, evidence, knowledgeDocs = []) {
  const evidenceByStep = groupEvidenceByStep(evidence);
  const missingSteps = SYSTEMATIC_STEPS.filter(step => !evidenceByStep[step]);
  const hasCoreEvidence = evidence && evidence.length > 0;

  // Build evidence summary
  const evidenceSummary = SYSTEMATIC_STEPS
    .filter(step => evidenceByStep[step])
    .map(step => {
      const items = evidenceByStep[step].map(formatEvidenceSnippet).join('\n');
      return `**${step}**\n${items}`;
    })
    .join('\n\n');

  // CRITICAL: If no evidence, warn and produce minimal output
  if (!hasCoreEvidence) {
    return `Generate a MINIMAL placeholder Core Activity statement.

**Activity:** ${activity.name}
**Technical Uncertainty:** ${activity.uncertainty}
**Project Hypothesis:** ${project.current_hypothesis || 'Not specified'}

**⚠ CRITICAL ISSUE: No core evidence items found for this activity.**

Output a single paragraph stating:
"[Activity Name]: This activity requires core R&D evidence to be linked before a compliant narrative can be generated. Evidence must demonstrate the systematic progression of hypothesis, experiment, observation, evaluation, and conclusion. Please link contemporaneous evidence items to this activity."

Do NOT generate speculative content. Keep output under 100 words.`;
  }

  // Filter knowledge docs relevant to this activity by keyword match
  const activityTerms = activity.name.toLowerCase().split(/\s+/).filter(t => t.length > 3);
  const relevantDocs = knowledgeDocs
    .filter(d => {
      const docText = (d.file_name + ' ' + (d.extracted_text || '')).toLowerCase();
      return activityTerms.some(term => docText.includes(term));
    })
    .slice(0, 3);

  const docSection = relevantDocs.length > 0
    ? `**Reference Documents:**\n${relevantDocs.map(d => formatDocumentSnippet(d)).join('\n')}\n\n`
    : '';

  return `Generate a Core Activity statement for RDTI compliance.

**Activity:** ${activity.name}
**Technical Uncertainty:** ${activity.uncertainty}
**Project Hypothesis:** ${project.current_hypothesis || 'Not specified'}
${activity.hypothesis_text ? `**Structured Hypothesis (from technical team):** ${activity.hypothesis_text}` : ''}
${activity.conclusion_text ? `**Documented Conclusion (from technical team):** ${activity.conclusion_text}` : ''}

${narrative?.text ? `**Existing Narrative:**\n${narrative.text}\n` : ''}
${docSection}**Evidence by Systematic Step:**
${evidenceSummary}

${missingSteps.length > 0 ? `**⚠ Missing Steps:** ${missingSteps.join(', ')} - These gaps must be flagged in output.` : ''}

**CRITICAL INSTRUCTIONS:**
- Ground ALL prose strictly in the evidence provided above
- Cite evidence IDs (8-char format) and dates inline for every factual claim, e.g. "As recorded on [YYYY-MM-DD] [id|date|src]"
- Do NOT speculate or add generic statements not traceable to evidence
- If a systematic step is missing, explicitly state the gap and its implication
- Use clear, professional language (NO hashtags or social media formatting)
${activity.hypothesis_text ? '- IMPORTANT: Use the structured hypothesis above as the definitive hypothesis statement — do not rephrase it into something generic' : ''}
${activity.conclusion_text ? '- IMPORTANT: Use the documented conclusion above as the definitive conclusion — do not substitute generic outcomes' : ''}

Output structured format:

### Technical Uncertainty
[Why the outcome wasn't knowable upfront - cite evidence IDs - 2-3 sentences]

### Hypothesis
[Testable technical proposition with measurable success criteria - 1-2 sentences]
${activity.hypothesis_text ? `[Use this verbatim or lightly edited: "${activity.hypothesis_text}"]` : ''}

### Experimental Method
[How tested: methods, metrics, test environments, controls - cite evidence - 2-3 sentences]

### Systematic Work & Results
[Chronological progression citing evidence IDs and dates - 3-5 sentences]
${missingSteps.length > 0 ? `[⚠ MISSING STEPS: ${missingSteps.join(', ')} — explicitly state: "No contemporaneous evidence was recorded for the [step] stage."]` : ''}

### Conclusion & New Knowledge
[What was definitively learned - reference evidence IDs - 2-3 sentences]
${activity.conclusion_text ? `[Use this verbatim or lightly edited: "${activity.conclusion_text}"]` : ''}

Total: 400-600 words in plain text with markdown headings.
Every factual statement must cite a specific evidence ID from the list above.`;
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

  // Build per-activity evidence table (max 25 core items to stay within token limits)
  const activityEvidenceTable = activities.map(activity => {
    const actEvidence = coreEvidence
      .filter(e => e.linked_activity_id === activity.id)
      .slice(0, 12);
    if (actEvidence.length === 0) return `**${activity.name}:** No evidence linked`;
    const rows = actEvidence.map(e => {
      const date = new Date(e.created_at).toISOString().split('T')[0];
      const id = e.id.substring(0, 8);
      const src = e.source || 'note';
      const step = e.systematic_step_primary || '—';
      const snippet = cleanSnippet(e.content, 80);
      return `  | ${id} | ${date} | ${src} | ${step} | ${snippet} |`;
    }).join('\n');
    return `**${activity.name}:**\n  | ID | Date | Source | Step | Summary |\n  |---|---|---|---|---|\n${rows}`;
  }).join('\n\n');

  return `Generate the "Evidence Index" section for this R&D claim pack.

**Evidence Summary:**
- Total evidence items: ${evidence.length}
- Core R&D evidence (linked to activities): ${coreEvidence.length}
- Supporting R&D evidence: ${supportingEvidence.length}
- Unlinked evidence: ${otherEvidence.length}

**Sources:**
${Object.entries(sourceCounts).map(([source, count]) => `- ${source}: ${count}`).join('\n')}

**Systematic Steps Coverage (core evidence only):**
${Object.entries(stepCounts).map(([step, count]) => `- ${step}: ${count} items`).join('\n')}

**Evidence by Activity:**
${activityEvidenceTable}

Include:
1. **Contemporaneous Records Statement** — affirm all evidence was created at or near time of work, is timestamped, attributed to individuals, and satisfies ITAA 1997 s.355-25 requirements

2. **Evidence Types Present** — describe only the types actually present based on the sources above (note/email/upload/github/document), not generic lists

3. **Coverage Assessment** — for each activity and systematic step, note whether coverage is complete or has gaps, referencing the evidence table above

4. **Traceability Statement** — each item ID (8-char prefix) links to a full timestamped record in the ClaimFlow system

Output: 3-4 paragraphs (350-500 words) in plain text with markdown formatting.
Base the coverage assessment on the ACTUAL evidence table provided — do not claim coverage that isn't there.`;
}

export function generateFinancialsPrompt(costLedger, activities, project, company = null) {
  // Determine offset rate based on company turnover band
  const turnoverBand = company?.aggregated_turnover_band;
  const entityType = company?.entity_type;

  let offsetRateContext;
  if (turnoverBand === 'under_20m') {
    offsetRateContext = `**Offset Rate (aggregated turnover < $20m):**
- Refundable tax offset = company tax rate + 18.5%
- Base company tax rate: 25% (if aggregated turnover < $50m, small business rate) or 30%
- Estimated refundable offset rate: 43.5% (at 25% tax rate) or 48.5% (at 30% tax rate)
- This is a REFUNDABLE offset — company can receive cash refund even in a tax loss position`;
  } else if (turnoverBand === 'over_20m') {
    offsetRateContext = `**Offset Rate (aggregated turnover ≥ $20m):**
- Non-refundable tax offset = company tax rate + intensity premium
- Intensity premium tiers: 8.5% (R&D intensity 0–2%), 16.5% (R&D intensity > 2%)
- R&D intensity = notional R&D deductions / total expenses for the income year
- This is a NON-REFUNDABLE offset — can only be applied against tax payable`;
  } else {
    offsetRateContext = `**Offset Rate:**
- Not yet determined — aggregated turnover band not specified
- Under $20m turnover: refundable offset (company tax rate + 18.5%)
- $20m or over: non-refundable offset with intensity premium
- Confirm turnover band in company settings to calculate accurate offset`;
  }

  if (!costLedger || costLedger.length === 0) {
    return `Generate the "Financials & Notional Deductions" section for this R&D claim pack.

**Project:** ${project.name}
**Tax Year:** ${project.year}
**Note:** No payroll data uploaded yet. Use placeholder structure.

${offsetRateContext}

Include:
1. **Cost Categories** (template structure)
   - Salaries & on-costs (PAYG, superannuation at current SGC rate)
   - Contractors/consultants (with R&D scope in SOWs)
   - EP&E depreciation (R&D-used assets)
   - Overheads (cloud compute, licences — with justified allocation)

2. **Apportionment Methodology**
   - Document and apply consistently: timesheets, ticket-linked time, or statistical sampling
   - Must cover the full claim period for all personnel

3. **Notional Deductions Calculation**
   - Total eligible R&D expenditure: [TBD — upload payroll CSV]
   - Applicable offset rate: ${turnoverBand === 'under_20m' ? '43.5% or 48.5% (refundable)' : turnoverBand === 'over_20m' ? 'company tax rate + intensity premium (non-refundable)' : '[determine based on turnover band]'}

4. **ATO R&D Schedule Tie-out**
   - Notional deductions map to label 675 (core R&D) and label 676 (supporting R&D) in the Company tax return

Output: 2-3 paragraphs (250-350 words) in plain text with markdown formatting.
Use placeholders where data not available.`;
  }

  const totalAmount = costLedger.reduce((sum, entry) => sum + parseFloat(entry.total_amount || 0), 0);
  const uniquePeople = [...new Set(costLedger.map(e => e.person_identifier))];
  const months = [...new Set(costLedger.map(e => e.month))].sort();
  const unapportioned = costLedger.filter(e => !e.activity_id);
  const unapportionedTotal = unapportioned.reduce((sum, e) => sum + parseFloat(e.total_amount || 0), 0);
  const apportionedTotal = totalAmount - unapportionedTotal;

  // Build per-person summary
  const perPersonSummary = uniquePeople.map(person => {
    const entries = costLedger.filter(e => e.person_identifier === person);
    const personTotal = entries.reduce((sum, e) => sum + parseFloat(e.total_amount || 0), 0);
    return `- ${person}: $${personTotal.toLocaleString('en-AU', {minimumFractionDigits: 2})}`;
  }).join('\n');

  // Calculate estimated offset for display
  let offsetCalc = '';
  if (apportionedTotal > 0) {
    if (turnoverBand === 'under_20m') {
      const offset25 = apportionedTotal * 0.435;
      const offset30 = apportionedTotal * 0.485;
      offsetCalc = `- At 25% tax rate: $${offset25.toLocaleString('en-AU', {minimumFractionDigits: 2})} estimated refundable offset\n- At 30% tax rate: $${offset30.toLocaleString('en-AU', {minimumFractionDigits: 2})} estimated refundable offset`;
    } else if (turnoverBand === 'over_20m') {
      const offset385 = apportionedTotal * 0.385;
      offsetCalc = `- At 30% tax + 8.5% intensity premium: $${offset385.toLocaleString('en-AU', {minimumFractionDigits: 2})} estimated non-refundable offset (confirm intensity calculation)`;
    }
  }

  return `Generate the "Financials & Notional Deductions" section for this R&D claim pack.

**Cost Data Summary:**
- Total payroll costs: $${totalAmount.toLocaleString('en-AU', {minimumFractionDigits: 2})}
- Apportioned to R&D: $${apportionedTotal.toLocaleString('en-AU', {minimumFractionDigits: 2})}
${unapportionedTotal > 0 ? `- Unapportioned (requires action): $${unapportionedTotal.toLocaleString('en-AU', {minimumFractionDigits: 2})}` : ''}
- Personnel: ${uniquePeople.length} people
- Period covered: ${months[0]} to ${months[months.length - 1]} (${months.length} months)
- Activities: ${activities.length} core activities

**Per-Person Breakdown:**
${perPersonSummary}

**Apportionment Method:**
${costLedger[0]?.basis_text || 'Not specified — document the apportionment basis'}

${offsetRateContext}
${offsetCalc ? `\n**Estimated Offset Calculation (indicative only):**\n- Eligible R&D expenditure: $${apportionedTotal.toLocaleString('en-AU', {minimumFractionDigits: 2})}\n${offsetCalc}` : ''}

Include:
1. **Cost Categories** — salaries & on-costs breakdown with apportioned vs unapportioned split
2. **Apportionment Methodology** — explain the basis, how applied consistently, traceability to timesheets/records
3. **Notional Deductions Calculation** — use the actual figures above, apply the correct offset rate for this entity's turnover band
4. **Record-Keeping** — source documents, monthly attestations, audit trail

Output: 3-4 paragraphs (450-600 words) in plain text with markdown formatting.
Use the ACTUAL dollar figures provided. Apply the correct offset rate. Do not use placeholder amounts.`;
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
  // Calculate registration deadline: 10 months after 30 June of the claim year
  let registrationDeadline = '[confirm with advisor]';
  if (project.year && typeof project.year === 'string') {
    const yearMatch = project.year.match(/(\d{4})-(\d{4})/);
    if (yearMatch) {
      const endYear = parseInt(yearMatch[2]);
      // 10 months after 30 June = 30 April of following year
      registrationDeadline = `30 April ${endYear + 1}`;
    }
  }

  // Build per-activity portal description scaffolds
  const activityDescriptions = activities.map((a, i) => {
    return `**Activity ${i + 1}: ${a.name}**
Name: ${a.name}
Technical Uncertainty: ${a.uncertainty || '[describe what could not be determined in advance]'}
${a.hypothesis_text ? `Hypothesis: ${a.hypothesis_text}` : 'Hypothesis: [testable proposition with measurable success criteria]'}
Systematic Approach: [describe experiment → observation → evaluation → conclusion progression]
New Knowledge Sought: [what knowledge will be generated if successful]
[AusIndustry portal character limit: ~2000 chars per activity. This description is ~${
  ((a.name || '').length + (a.uncertainty || '').length + (a.hypothesis_text || '').length)
} chars of key content — expand to 1500-2000 chars total in the portal]`;
  }).join('\n\n');

  const activityNameList = activities.map((a, i) => `  Activity ${i + 1}: "${a.name}"`).join('\n');

  return `Generate the "Registration & Tax Return Tie-out" section for this claim pack.

**Project:** ${project.name}
**Tax Year:** ${project.year}
**Core Activities:** ${activities.length}
**Registration Deadline:** ${registrationDeadline}

CRITICAL — EXACT ACTIVITY NAMES (use these verbatim, do NOT substitute or invent alternative names):
${activityNameList}

**Activity Data for Portal Descriptions:**
${activityDescriptions}

Include:

1. **Registration Status**
   - Confirm registration must be lodged via the AusIndustry Business Portal
   - Registration deadline: ${registrationDeadline} (10 months after 30 June ${project.year?.split('-')[1] || ''})
   - IMPORTANT: The activity names and descriptions in this claim pack must EXACTLY match what is registered in the portal — flag this consistency requirement

2. **Portal Activity Descriptions**
   For each of the ${activities.length} activities above, generate a complete AusIndustry portal-ready description.
   USE THE EXACT ACTIVITY NAMES LISTED ABOVE — do not rename or rephrase them.
   - 1500–2000 characters each (portal maximum ~2000 chars)
   - Lead with the technical uncertainty (why the outcome couldn't be known in advance)
   - State the hypothesis as a testable proposition
   - Describe the systematic experimental method
   - Note what new knowledge the activity aims to generate
   - Use factual, technical language — no marketing language
   - Do NOT claim it's eligible R&D — describe the activity, let AusIndustry assess

3. **ATO R&D Schedule Mapping**
   - Core R&D activities → label 675 (notional deductions for core R&D)
   - Supporting R&D activities → label 676 (notional deductions for supporting R&D)
   - Total notional deductions = sum of all apportioned R&D expenditure
   - Confirm the registered project name matches this claim pack

4. **Consistency Checklist**
   - Activity names: claim pack ↔ portal ↔ tax return — must be identical
   - Expenditure amounts: claim pack ↔ ATO R&D schedule — must reconcile
   - Tax year: confirm ${project.year} aligns with the company's income year

Output: 4-5 paragraphs plus the portal descriptions (600-900 words total) in plain text with markdown formatting.
Generate REAL portal descriptions for each activity using the data above — do not use generic placeholder text.`;
}

export function generateAttestationsPrompt(project) {
  const generatedDate = new Date().toISOString().split('T')[0];
  return `Generate the "Attestations & Sign-offs" section for this claim pack.

**Project:** ${project.name}
**Generated:** ${generatedDate}

Include:
1. **Internal Sign-offs Required**
   - Technical lead/CTO: Confirms R&D nature of work, technical uncertainty
   - CFO/Finance: Confirms cost apportionment methodology and amounts
   - CEO/Managing Director: Overall claim accuracy and completeness

2. **Methodology Acknowledgements**
   - Apportionment method documented and applied consistently
   - Evidence collection process (ClaimFlow system usage)
   - Review and quality control procedures

3. **Reviewer Attestation**
   - Responsible person has reviewed this claim pack
   - Evidence examined and assessed for RDTI compliance
   - Statutory declarations (if required)

4. **Document Control**
   - Generated: ${generatedDate}
   - Version: 1.0
   - Next review: Before submission to advisors/AusIndustry

Output: 2-3 paragraphs (200-300 words) in plain text with markdown formatting.
Include placeholder signature blocks for key stakeholders.`;
}

// ============================================================================
// MAIN GENERATOR FUNCTION
// ============================================================================

export async function generateClaimPackSection(sectionKey, projectData) {
  const { project, activities, evidence, narratives, costLedger, knowledgeDocs = [], company = null } = projectData;

  let userPrompt;

  switch (sectionKey) {
    case SECTION_KEYS.PROJECT_OVERVIEW:
      userPrompt = generateProjectOverviewPrompt(project, activities, evidence.length, knowledgeDocs);
      break;

    case SECTION_KEYS.CORE_ACTIVITIES:
      // Special case: generate per activity, then combine
      const activitySections = await Promise.all(
        activities.map(async (activity) => {
          const activityEvidence = evidence.filter(e =>
            e.linked_activity_id === activity.id && e.evidence_type === 'core'
          );
          const narrative = narratives.find(n => n.activity_id === activity.id);
          const prompt = generateCoreActivityPrompt(project, activity, narrative, activityEvidence, knowledgeDocs);
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
      userPrompt = generateFinancialsPrompt(costLedger, activities, project, company);
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
          { role: 'system', content: CLAIMFLOW_SYSTEM_PROMPT },
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
