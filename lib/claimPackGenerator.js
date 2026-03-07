// Claim Pack Generator - AI prompt builder and section generation
// Generates RDTI-compliant claim pack sections using OpenAI GPT-4o

import { marked } from 'marked';
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
   - What publicly available solutions or knowledge were considered (literature, patents, internet searches, expert advice, vendor documentation, open-source libraries, relevant standards)?
   - Be specific: name what was searched — e.g. 'WCAG 2.1 AA was reviewed but does not address users with mild cognitive impairment' or 'Civica vendor documentation was found to be incomplete for this integration use case'
   - Why was existing knowledge inadequate to achieve the outcome?
${project.knowledge_gap ? '   - IMPORTANT: Reference the knowledge gap stated above directly' : ''}

3. **Competent Professional Test**
   - Why couldn't a competent professional in the field readily solve this?
   - What made the outcome non-obvious or non-determinable in advance, even with access to all publicly available knowledge?
   - Explain the specific gap between what was knowable and what required experimentation to resolve
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

### Prior Knowledge Search
[What existing solutions, standards, literature, or vendor capabilities were reviewed before this activity began. Why they were insufficient. 2–3 sentences citing specific evidence of the search (e.g. vendor docs reviewed, WCAG checked, papers referenced, libraries assessed). If no contemporaneous prior search record exists in the evidence provided, state: "No prior knowledge search record found in evidence — recommend adding a contemporaneous note of what was reviewed before experimentation began."]

### Hypothesis
[Testable technical proposition with measurable success criteria - 1-2 sentences]
${activity.hypothesis_text ? `[Use this verbatim or lightly edited: "${activity.hypothesis_text}"]` : ''}

### Experimental Method
[How tested: methods, metrics, test environments, controls - cite evidence - 2-3 sentences]

### Systematic Work & Results
[Chronological progression citing evidence IDs and dates - 3-5 sentences. Explicitly narrate any failed approaches, abandoned paths, or results that fell below threshold — state what was learned from each failure. Do NOT omit negative results — they demonstrate genuine experimental uncertainty and strengthen the claim.]
${missingSteps.length > 0 ? `[⚠ MISSING STEPS: ${missingSteps.join(', ')} — explicitly state: "No contemporaneous evidence was recorded for the [step] stage."]` : ''}

### Conclusion & New Knowledge
[What was definitively learned - reference evidence IDs - 2-3 sentences. Distinguish technical learnings from commercial outcomes. Frame as: "This activity determined that..." not "This resulted in improved engagement." If the outcome was inconclusive or partial, say so explicitly — partial results are still eligible.]
${activity.conclusion_text ? `[Use this verbatim or lightly edited: "${activity.conclusion_text}"]` : ''}

Total: 450-700 words in plain text with markdown headings.
Every factual statement must cite a specific evidence ID from the list above.`;
}

export function generateSupportingActivitiesPrompt(allEvidence, coreActivities) {
  // Build evidence sample for AI to analyse — all evidence, capped at 40 items for token budget
  const evidenceSample = (allEvidence || []).slice(0, 40).map(formatEvidenceSnippet).join('\n');

  // Note any evidence already explicitly typed as supporting
  const existingSupporting = (allEvidence || []).filter(e => e.evidence_type === 'supporting');
  const existingSupportingNote = existingSupporting.length > 0
    ? `\n**Already categorised as supporting evidence (${existingSupporting.length} items):**\n${existingSupporting.slice(0, 8).map(formatEvidenceSnippet).join('\n')}\n`
    : '';

  const activityNames = (coreActivities || []).map((a, i) => `  ${i + 1}. ${a.name}`).join('\n');

  return `Generate the "Supporting R&D Activities" section for this claim pack.

**Core Activities (reference these by exact name):**
${activityNames}

**All Project Evidence (${allEvidence?.length || 0} items — analyse for supporting activity signals):**
${evidenceSample}
${existingSupportingNote}
**TASK:** Scan ALL the evidence above for signals of work that directly enabled the core experiments. Supporting activity patterns to identify:
- Test environment or testbed setup (staging environments, mock data, sandbox configuration)
- Data preparation specifically for experiments (cleaning, transforming, sampling data to run tests)
- Integration scaffolding built to enable experiments (temporary adapters, connectors, middleware)
- Instrumentation or logging added to observe experimental results
- Scripts or tooling built purely to run experiments (not BAU automation)
- Internal pilot rounds or validation testing to observe experimental outcomes

**CRITICAL INSTRUCTIONS:**
- Supporting activities must meet the dominant purpose test: direct relationship to a named core activity, undertaken for the dominant purpose of supporting that core R&D activity
- If supporting activity signals are found, generate specific activity statements citing the evidence (IDs + dates)
- If no supporting activity signals are clearly present, state: "Based on the available evidence, no separate supporting activities have been identified for this period. Work that could constitute supporting activities — such as test infrastructure setup or data preparation — appears to have been conducted as part of the core experimental activities themselves and has been captured in the core activity statements above."
- Do NOT include ordinary BAU development, production deployment, standard bug fixing, or routine integration work

Include:
1. **Introduction** — brief explanation of supporting activity requirements (dominant purpose test)
2. **Supporting Activity Statements** — for each identified activity:
   - Description of work performed (cite evidence IDs)
   - Which core activity it supported (exact name from list above)
   - Why it was necessary for the experiment (dominant purpose statement)

Output: 2-4 paragraphs (250-450 words) in plain text with markdown formatting.`;
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

export function generateFinancialsPrompt(costLedger, activities, project, company = null, nonLabourCosts = []) {
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

  // Build non-labour cost context
  const contractors = nonLabourCosts.filter(c => c.cost_category === 'contractor');
  const cloudSoftware = nonLabourCosts.filter(c => c.cost_category === 'cloud_software');
  const contractorTotal = contractors.reduce((sum, c) => sum + parseFloat(c.rd_amount || c.amount * c.rd_percent / 100), 0);
  const cloudTotal = cloudSoftware.reduce((sum, c) => sum + parseFloat(c.rd_amount || c.amount * c.rd_percent / 100), 0);
  const grandTotal = apportionedTotal + contractorTotal + cloudTotal;

  let nonLabourContext = '';
  if (contractors.length > 0) {
    nonLabourContext += `\n**Contractor Costs (${contractors.length} contractors):**\n`;
    nonLabourContext += contractors.map(c =>
      `- ${c.vendor_name || 'Contractor'}: $${parseFloat(c.amount).toLocaleString('en-AU', {minimumFractionDigits: 2})} (${c.rd_percent}% R&D) — ${c.description}`
    ).join('\n');
    nonLabourContext += `\n- Total contractor R&D expenditure: $${contractorTotal.toLocaleString('en-AU', {minimumFractionDigits: 2})}`;
  }
  if (cloudSoftware.length > 0) {
    nonLabourContext += `\n\n**Cloud & Software Costs (${cloudSoftware.length} services):**\n`;
    nonLabourContext += cloudSoftware.map(c =>
      `- ${c.vendor_name || c.description}: $${parseFloat(c.amount).toLocaleString('en-AU', {minimumFractionDigits: 2})}/period (${c.rd_percent}% R&D)`
    ).join('\n');
    nonLabourContext += `\n- Total cloud/software R&D expenditure: $${cloudTotal.toLocaleString('en-AU', {minimumFractionDigits: 2})}`;
  }

  // Recalculate offset with grand total
  let grandOffsetCalc = '';
  if (grandTotal > 0) {
    if (turnoverBand === 'under_20m') {
      const offset25 = grandTotal * 0.435;
      const offset30 = grandTotal * 0.485;
      grandOffsetCalc = `- At 25% tax rate: $${offset25.toLocaleString('en-AU', {minimumFractionDigits: 2})} estimated refundable offset\n- At 30% tax rate: $${offset30.toLocaleString('en-AU', {minimumFractionDigits: 2})} estimated refundable offset`;
    } else if (turnoverBand === 'over_20m') {
      const offset385 = grandTotal * 0.385;
      grandOffsetCalc = `- At 30% tax + 8.5% intensity premium: $${offset385.toLocaleString('en-AU', {minimumFractionDigits: 2})} estimated non-refundable offset`;
    }
  }

  return `Generate the "Financials & Notional Deductions" section for this R&D claim pack.

**Cost Data Summary:**
- Staff payroll costs: $${totalAmount.toLocaleString('en-AU', {minimumFractionDigits: 2})}
  - Apportioned to R&D: $${apportionedTotal.toLocaleString('en-AU', {minimumFractionDigits: 2})}
${unapportionedTotal > 0 ? `  - Unapportioned (requires action): $${unapportionedTotal.toLocaleString('en-AU', {minimumFractionDigits: 2})}` : ''}
- Contractor costs: $${contractorTotal.toLocaleString('en-AU', {minimumFractionDigits: 2})}
- Cloud & software costs: $${cloudTotal.toLocaleString('en-AU', {minimumFractionDigits: 2})}
- **Total eligible R&D expenditure: $${grandTotal.toLocaleString('en-AU', {minimumFractionDigits: 2})}**
- Personnel: ${uniquePeople.length} people
- Period covered: ${months[0]} to ${months[months.length - 1]} (${months.length} months)
- Activities: ${activities.length} core activities

**Per-Person Breakdown:**
${perPersonSummary}
${nonLabourContext}

**Apportionment Method:**
${costLedger[0]?.basis_text || 'Not specified — document the apportionment basis'}

${offsetRateContext}
${grandOffsetCalc ? `\n**Estimated Offset Calculation (indicative only):**\n- Total eligible R&D expenditure: $${grandTotal.toLocaleString('en-AU', {minimumFractionDigits: 2})}\n${grandOffsetCalc}` : ''}

Include:
1. **Cost Categories** — staff costs (salaries, superannuation, on-costs)${contractors.length > 0 ? ', contractor costs' : ''}${cloudSoftware.length > 0 ? ', cloud & software costs' : ''} with breakdowns
2. **Apportionment Methodology** — explain the basis, how applied consistently, traceability to records
3. **Notional Deductions Calculation** — use the actual figures above, apply the correct offset rate for this entity's turnover band
4. **Record-Keeping** — source documents, attestations, audit trail

Output: 3-4 paragraphs (450-600 words) in plain text with markdown formatting.
Use the ACTUAL dollar figures provided. Apply the correct offset rate. Do not use placeholder amounts.`;
}

export function generateRdBoundaryPrompt(project, activities, evidence) {
  const coreEvidence = evidence.filter(e => e.evidence_type === 'core');
  const supportingEvidence = evidence.filter(e => e.evidence_type === 'supporting');
  const uncategorizedEvidence = evidence.filter(e => !e.evidence_type);

  // Build a snapshot of evidence for context
  const allEvidenceSample = [...coreEvidence, ...supportingEvidence, ...uncategorizedEvidence]
    .slice(0, 20).map(e => {
      const date = new Date(e.created_at).toISOString().split('T')[0];
      const snippet = cleanSnippet(e.content, 80);
      return `- [${date}|${e.evidence_type || 'uncategorised'}] ${snippet}`;
    }).join('\n');

  const activityNames = activities.map(a => `- ${a.name}`).join('\n');

  return `Generate the "R&D vs Non-R&D Boundary" section for this claim pack.

**Project:** ${project.name}
**Core Activities:**
${activityNames}
**Evidence Breakdown:**
- Core R&D: ${coreEvidence.length} items
- Supporting R&D: ${supportingEvidence.length} items
- Uncategorized: ${uncategorizedEvidence.length} items

**Evidence Sample (use to identify specific exclusions):**
${allEvidenceSample}

Include:
1. **What Was Claimed as R&D**
   - Core experimental activities (list the ${activities.length} activities by name)
   - Supporting activities with dominant purpose link
   - Clear experimental objectives and systematic progression

2. **What Was NOT Claimed — Specific Exclusions**
   - Based on the evidence above, identify and name specific work that was excluded — e.g. "production rollout from [month]", "standard bug fixing", "post-experiment deployment"
   - Do NOT use generic phrases like "BAU work excluded" — be specific about what was scoped out for this project
   - Common exclusions: production deployment, monitoring/support, feature development after technical uncertainty resolved, ordinary systems integration following documented APIs

3. **Software Exclusion Assessment**
   - CRITICAL: Address whether this software was developed for the dominant purpose of internal administration (which would exclude it from being a core R&D activity under s.355-25(1)(e) of ITAA 1997)
   - State clearly: is this software internal-admin-facing or client/external-facing?
   - If it is client-facing or a new product, state this — it is less clearly excluded
   - If any component is internal admin, note that it may only be eligible as a supporting activity

4. **Scoping Methodology**
   - How R&D work was isolated from non-R&D (evidence categorisation process)
   - Where the R&D ended and commercial product development began
   - Review and approval process

Output: 3-4 paragraphs (350-500 words) in plain text with markdown formatting.
Be specific about what was excluded and why, naming actual activities or time periods where possible.`;
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
// STRENGTHEN PROMPT GENERATOR
// Returns a prompt that asks AI to detect RDTI gaps in a section from evidence
// ============================================================================

export function generateStrengthenPrompt(sectionKey, currentContent, evidence, activities) {
  const evidenceSample = (evidence || []).slice(0, 50).map(formatEvidenceSnippet).join('\n');
  const activityNames = (activities || []).map(a => `- ${a.name}`).join('\n');
  const plainText = currentContent
    ? currentContent.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().substring(0, 1200)
    : '(section is empty)';

  const JSON_SCHEMA = `Return ONLY a JSON object, no markdown, no explanation:
{
  "suggestions": [
    {
      "id": "sugg_1",
      "title": "Short descriptive title (max 10 words)",
      "rationale": "1-2 sentences: what evidence signals this and why it matters for RDTI",
      "draftContent": "Ready-to-insert paragraph. Specific, evidence-grounded, cites evidence IDs in format [id|date|src].",
      "questions": ["Follow-up question 1?", "Follow-up question 2?", "Follow-up question 3?"]
    }
  ],
  "message": null
}
If no meaningful gaps detected: {"suggestions": [], "message": "No additional gaps detected for this section."}
RULES: max 3 suggestions; only suggest things with clear evidence signals; cite specific evidence IDs.`;

  const sectionInstructions = {
    supporting_activities: `Scan the evidence for signals of work that directly enabled core experiments but may be missing from the Supporting Activities section. Patterns to detect:
- Test environment or testbed setup (staging, mock data, sandbox config)
- Data preparation specifically for experiments (cleaning, sampling, transformation)
- Integration scaffolding built purely to enable experiments (temporary adapters, connectors)
- Instrumentation or logging added to observe experimental results
- Scripts or tooling built only for running experiments
- Internal pilot rounds to validate experimental outcomes
Each suggestion should identify a specific type of supporting activity signalled by evidence, provide a draft paragraph stating the dominant purpose link to a core activity, and ask 2-3 follow-up questions to confirm details.`,

    project_overview: `Scan the evidence for signals of prior knowledge search that may be missing or thin in the current Project Overview section. Patterns to detect:
- References to reviewing vendor documentation, APIs, or standards
- Mentions of assessing open-source libraries, frameworks, or existing tools
- Evidence of consulting engineers, contractors, or technical specialists
- Evidence of testing whether an existing known solution would work
- References to published standards (e.g. WCAG, ISO, RFC)
Each suggestion should identify a specific prior knowledge search signal, provide a draft paragraph naming the source reviewed and why it was insufficient, and ask 2-3 follow-up questions to capture what was checked and why it didn't resolve the uncertainty.`,

    core_activities: `Scan the evidence for signals of failed approaches, abandoned paths, or inconclusive results that may be missing from the Core Activities section. Patterns to detect:
- Words/phrases: failed, didn't work, abandoned, unexpected, error, retry, timeout, inconsistent, reverted, rolled back, couldn't reproduce, below threshold, not as expected
- Evidence of approaches that were tried and then changed
- Evidence of results that didn't meet success criteria
Each suggestion should identify a specific failed/partial result, provide draft text narrating what was attempted, what failed, and what was learned, and ask 2-3 follow-up questions to capture the learning.`,

    rd_boundary: `Scan the evidence for signals of work that should be explicitly excluded from R&D (non-R&D boundary work) but may not be named in the current R&D Boundary section. Patterns to detect:
- Production deployment or rollout references
- Post-experiment commercial development
- Routine bug fixing or monitoring
- Standard integration following documented vendor APIs
- Support and maintenance work
Each suggestion should identify a specific type of excluded work with the evidence that signals it, provide a draft exclusion statement, and ask 1-2 follow-up questions to confirm timing and scope.`,
  };

  const instruction = sectionInstructions[sectionKey];
  if (!instruction) return null;

  return `You are an RDTI compliance reviewer analysing an R&D claim pack section for gaps.

**TASK:** ${instruction}

**Current section content (plain text preview):**
${plainText}

**Core Activities:**
${activityNames}

**Project evidence (${evidence?.length || 0} items):**
${evidenceSample}

${JSON_SCHEMA}`;
}

// ============================================================================
// MAIN GENERATOR FUNCTION
// ============================================================================

export async function generateClaimPackSection(sectionKey, projectData) {
  const { project, activities, evidence, narratives, costLedger, knowledgeDocs = [], company = null, nonLabourCosts = [] } = projectData;

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
      // Pass ALL evidence — prompt will proactively identify supporting activity signals
      userPrompt = generateSupportingActivitiesPrompt(evidence, activities);
      break;

    case SECTION_KEYS.EVIDENCE_INDEX:
      userPrompt = generateEvidenceIndexPrompt(evidence, activities);
      break;

    case SECTION_KEYS.FINANCIALS:
      userPrompt = generateFinancialsPrompt(costLedger, activities, project, company, nonLabourCosts);
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

    // Convert markdown to HTML so Tiptap renders it correctly
    return marked.parse(content, { breaks: false });

  } catch (error) {
    console.error('[ClaimPackGenerator] OpenAI error:', error);
    throw error;
  }
}
