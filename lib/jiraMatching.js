// lib/jiraMatching.js
// AI matching engine for Jira issues against core R&D activities
// Combines patterns from auto-link/route.js (keyword pre-scoring + AI) and githubSync.js (evidence creation)

import { supabaseAdmin } from './supabaseAdmin';
import crypto from 'crypto';

// Budget limits
const MAX_ISSUES_PER_BATCH = 15;
const MAX_ISSUES_PER_RUN = 100;
const KEYWORD_SCORE_THRESHOLD = 0.05;

/**
 * Extract top terms from text for keyword matching (from auto-link)
 */
function extractTopTerms(text, maxTerms = 8) {
  if (!text) return [];

  const stopWords = new Set([
    'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'as', 'to', 'for', 'in', 'of',
    'it', 'that', 'this', 'with', 'from', 'by', 'we', 'our', 'if', 'when', 'how',
    'what', 'can', 'will', 'should', 'could', 'would', 'has', 'have', 'are', 'was',
    'were', 'been', 'being', 'be', 'do', 'does', 'did', 'done', 'but', 'not', 'also'
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));

  const freq = {};
  words.forEach(w => freq[w] = (freq[w] || 0) + 1);

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTerms)
    .map(([word]) => word);
}

/**
 * Jaccard similarity between two term sets
 */
function jaccardSimilarity(terms1, terms2) {
  const set1 = new Set(terms1);
  const set2 = new Set(terms2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * Truncate text for AI prompt
 */
function truncateText(text, maxChars = 300) {
  if (!text) return '';
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxChars) return clean;
  const truncated = clean.substring(0, maxChars);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > maxChars * 0.8 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
}

/**
 * Compute keyword scores between issues and activities
 * Returns only pairs above threshold
 */
function computeKeywordScores(issues, activities) {
  const pairs = [];

  for (const issue of issues) {
    const issueText = `${issue.summary} ${issue.description || ''} ${(issue.labels || []).join(' ')}`;
    const issueTerms = extractTopTerms(issueText, 8);

    let bestScore = 0;
    let bestActivity = null;

    for (const activity of activities) {
      const activityText = `${activity.name} ${activity.uncertainty || ''}`;
      const activityTerms = extractTopTerms(activityText, 8);
      const score = jaccardSimilarity(issueTerms, activityTerms);

      if (score > bestScore) {
        bestScore = score;
        bestActivity = activity;
      }
    }

    if (bestScore >= KEYWORD_SCORE_THRESHOLD) {
      pairs.push({
        issue,
        issueTerms,
        bestActivity,
        keywordScore: bestScore
      });
    }
  }

  return pairs;
}

/**
 * Call OpenAI to match issues against activities with RDTI step classification
 */
async function matchBatchWithAI(project, activities, issueBatch) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[Jira Matching] No OpenAI API key configured');
    return [];
  }

  const activityNames = activities.map(a => a.name.substring(0, 60));
  const activityDetails = activities.map(a =>
    `${a.name.substring(0, 60)}: ${(a.uncertainty || '').split(' ').slice(0, 40).join(' ')}`
  ).join('\n');

  const issueSummaries = issueBatch.map(item => {
    const issue = item.issue;
    return {
      key: issue.jira_key,
      summary: issue.summary,
      description: truncateText(issue.description, 200),
      type: issue.issue_type,
      status: issue.status,
      labels: (issue.labels || []).join(', '),
      components: (issue.components || []).join(', ')
    };
  });

  const hypothesis = (project.current_hypothesis || 'Not specified')
    .split(' ')
    .slice(0, 40)
    .join(' ');

  const prompt = `Classify Jira issues as R&D or not, and generate audit-ready summaries. Return ONLY valid JSON.

## Project Context
Hypothesis: ${hypothesis}

## Core R&D Activities (optional — match if relevant):
${activityDetails}

## Jira Issues:
${issueSummaries.map(s =>
  `${s.key} | ${s.type} | ${s.status} | ${s.summary} | ${s.description} | Labels: ${s.labels || 'none'} | Components: ${s.components || 'none'}`
).join('\n')}

## Task
For each Jira issue, determine if it represents R&D work (technical uncertainty, experimentation, systematic investigation, novel solutions).

Return for each issue:
- **is_rd**: true if this is R&D work, false if routine/BAU
- **activity**: best matching activity name from the list above, or null if none fit well
- **summary**: 1-2 sentence explanation of the R&D relevance (for tax audit records). If not R&D, briefly explain why.
- **step**: RDTI systematic progression step: "Hypothesis", "Experiment", "Observation", "Evaluation", or "Conclusion"
- **confidence**: "high", "medium", or "low"

Be generous with R&D classification — research, spikes, POCs, performance investigations, architecture exploration, algorithm work, and feasibility studies all qualify. Only exclude clear BAU work (CI updates, typo fixes, dependency bumps, housekeeping).

## JSON (no fences):
[
  {"key": "PROJ-123", "is_rd": true, "activity": "Activity Name" or null, "summary": "...", "step": "Experiment", "confidence": "high"}
]`;

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
          {
            role: 'system',
            content: 'You are an Australian RDTI (Research and Development Tax Incentive) specialist. You precisely identify R&D activities in software development under s.355-25 (core) and s.355-30 (supporting). Return valid JSON only.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 1500
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      console.error('[Jira Matching] OpenAI API error:', response.status);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content?.trim() || '';

    // Strip code fences
    content = content.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();

    let results;
    try {
      const match = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
      results = JSON.parse(match ? match[0] : content);
    } catch {
      console.error('[Jira Matching] Failed to parse AI response:', content.substring(0, 300));
      throw new Error('Failed to parse AI response');
    }

    if (!Array.isArray(results)) throw new Error('AI response not an array');

    const validSteps = new Set(['Hypothesis', 'Experiment', 'Observation', 'Evaluation', 'Conclusion']);

    // Fuzzy activity name matching — find closest match
    function findActivityId(aiActivityName) {
      if (!aiActivityName) return null;
      const lower = aiActivityName.toLowerCase().trim();
      // Exact match first
      for (const a of activities) {
        if (a.name.substring(0, 60).toLowerCase() === lower) return a.id;
      }
      // Partial match — AI might abbreviate or slightly change the name
      for (const a of activities) {
        const aLower = a.name.toLowerCase();
        if (aLower.includes(lower) || lower.includes(aLower)) return a.id;
      }
      // Word overlap match
      const aiWords = new Set(lower.split(/\s+/).filter(w => w.length > 3));
      let bestMatch = null;
      let bestOverlap = 0;
      for (const a of activities) {
        const aWords = new Set(a.name.toLowerCase().split(/\s+/).filter(w => w.length > 3));
        const overlap = [...aiWords].filter(w => aWords.has(w)).length;
        if (overlap > bestOverlap && overlap >= 2) {
          bestOverlap = overlap;
          bestMatch = a.id;
        }
      }
      return bestMatch;
    }

    return results
      .filter(r => r?.key)
      .map(r => ({
        jira_key: r.key,
        is_rd: r.is_rd !== false, // default to true if not specified
        activity_id: findActivityId(r.activity),
        ai_summary: r.summary ? String(r.summary).substring(0, 500) : null,
        suggested_step: validSteps.has(r.step) ? r.step : null,
        confidence: ['high', 'medium', 'low'].includes(r.confidence) ? r.confidence : 'low'
      }));

  } catch (error) {
    console.error('[Jira Matching] AI call error:', error.message);
    throw error;
  }
}

/**
 * Main matching function: keyword pre-filter → AI matching → store results
 */
export async function matchJiraIssues(projectId) {
  console.log(`[Jira Matching] Starting match for project: ${projectId}`);

  // Get project
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('id, current_hypothesis')
    .eq('id', projectId)
    .is('deleted_at', null)
    .single();

  if (!project) throw new Error('Project not found');

  // Get core activities
  const { data: activities } = await supabaseAdmin
    .from('core_activities')
    .select('id, name, uncertainty, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (!activities || activities.length === 0) {
    return { matched: 0, skipped: 0, reason: 'no_activities' };
  }

  // Get unmatched/stale cached issues
  // Fetch issues that either have no match at all, or have a pending match that might need re-evaluation
  const { data: allIssues } = await supabaseAdmin
    .from('jira_issues')
    .select('*')
    .eq('project_id', projectId)
    .order('jira_updated_at', { ascending: false })
    .limit(MAX_ISSUES_PER_RUN);

  if (!allIssues || allIssues.length === 0) {
    return { matched: 0, skipped: 0, reason: 'no_issues' };
  }

  // Only skip issues that have already been reviewed (approved/rejected/skipped)
  // Pending matches will be cleaned up and re-matched
  const issueIds = allIssues.map(i => i.id);
  const { data: existingMatches } = await supabaseAdmin
    .from('jira_issue_matches')
    .select('jira_issue_id, review_status')
    .in('jira_issue_id', issueIds)
    .in('review_status', ['approved', 'rejected', 'skipped']);

  const reviewedIssueIds = new Set(
    (existingMatches || []).map(m => m.jira_issue_id)
  );

  const unmatchedIssues = allIssues.filter(i => !reviewedIssueIds.has(i.id));
  console.log(`[Jira Matching] ${unmatchedIssues.length} issues to process (${reviewedIssueIds.size} already reviewed)`);

  if (unmatchedIssues.length === 0) {
    return { matched: 0, skipped: 0, reason: 'all_already_reviewed' };
  }

  // Keyword pre-scoring (skip pre-filter for small batches — not worth filtering <20 issues)
  let qualifiedPairs;
  if (unmatchedIssues.length <= 20) {
    // Send all issues directly to AI — cheap enough for small batches
    qualifiedPairs = unmatchedIssues.map(issue => ({
      issue,
      issueTerms: extractTopTerms(`${issue.summary} ${issue.description || ''}`, 8),
      bestActivity: activities[0],
      keywordScore: 0
    }));
    console.log(`[Jira Matching] Small batch (${unmatchedIssues.length} issues) — skipping keyword pre-filter`);
  } else {
    qualifiedPairs = computeKeywordScores(unmatchedIssues, activities);
    console.log(`[Jira Matching] ${qualifiedPairs.length}/${unmatchedIssues.length} issues passed keyword pre-filter`);
  }

  if (qualifiedPairs.length === 0) {
    return { matched: 0, skipped: unmatchedIssues.length, reason: 'none_passed_keyword_filter' };
  }

  // Batch AI matching
  let totalMatched = 0;
  let totalSkipped = 0;

  for (let i = 0; i < qualifiedPairs.length; i += MAX_ISSUES_PER_BATCH) {
    const batch = qualifiedPairs.slice(i, i + MAX_ISSUES_PER_BATCH);

    try {
      const aiResults = await matchBatchWithAI(project, activities, batch);

      console.log(`[Jira Matching] AI returned ${aiResults.length} results`);

      // Store matches — all R&D issues get saved, activity match is optional
      for (const result of aiResults) {
        console.log(`[Jira Matching] Processing ${result.jira_key}: is_rd=${result.is_rd}, activity_id=${result.activity_id}, summary=${result.ai_summary?.substring(0, 50)}`);

        if (!result.is_rd) {
          totalSkipped++;
          continue;
        }

        // Find the issue record
        const issueRecord = batch.find(p => p.issue.jira_key === result.jira_key);
        if (!issueRecord) {
          console.error(`[Jira Matching] Could not find issue record for ${result.jira_key}`);
          continue;
        }

        // Delete any old pending matches for this issue (clean slate approach)
        await supabaseAdmin
          .from('jira_issue_matches')
          .delete()
          .eq('project_id', projectId)
          .eq('jira_issue_id', issueRecord.issue.id)
          .eq('review_status', 'pending');

        const matchData = {
          project_id: projectId,
          jira_issue_id: issueRecord.issue.id,
          activity_id: result.activity_id || null,
          match_score: issueRecord.keywordScore || 0,
          match_confidence: result.confidence || 'medium',
          ai_summary: result.ai_summary || 'Classified as R&D work',
          suggested_step: result.suggested_step || null,
          keyword_score: issueRecord.keywordScore || 0,
          review_status: 'pending',
          updated_at: new Date().toISOString()
        };

        const { error: insertError } = await supabaseAdmin
          .from('jira_issue_matches')
          .insert(matchData);

        if (insertError) {
          console.error('[Jira Matching] Insert error:', JSON.stringify(insertError));
        } else {
          totalMatched++;
        }
      }
    } catch (err) {
      console.error(`[Jira Matching] Batch ${i} failed:`, err.message);
      // Continue with next batch
    }
  }

  console.log(`[Jira Matching] Complete: ${totalMatched} matched, ${totalSkipped} skipped`);

  return {
    matched: totalMatched,
    skipped: totalSkipped,
    total_issues: unmatchedIssues.length,
    qualified: qualifiedPairs.length
  };
}

/**
 * Create evidence record from an approved Jira match
 */
export async function createEvidenceFromMatch(match, issue, siteUrl) {
  const content = `[${issue.jira_key}] ${issue.summary}${issue.description ? '\n\n' + issue.description : ''}${match.ai_summary ? '\n\nR&D Relevance: ' + match.ai_summary : ''}`;

  const jiraUrl = siteUrl
    ? `${siteUrl.replace(/\/$/, '')}/browse/${issue.jira_key}`
    : `https://jira.atlassian.com/browse/${issue.jira_key}`;

  const contentHash = crypto
    .createHash('sha256')
    .update(issue.jira_key + issue.summary)
    .digest('hex');

  // Check for existing evidence with same hash
  const { data: existing } = await supabaseAdmin
    .from('evidence')
    .select('id')
    .eq('project_id', issue.project_id)
    .eq('content_hash', contentHash)
    .maybeSingle();

  if (existing) {
    return { id: existing.id, alreadyExists: true };
  }

  const evidenceRecord = {
    project_id: issue.project_id,
    author_email: issue.assignee_email || 'jira@import',
    content,
    source: 'note',
    systematic_step_primary: match.suggested_step || 'Unknown',
    systematic_step_source: 'auto',
    linked_activity_id: match.activity_id,
    link_source: 'auto',
    link_reason: match.ai_summary,
    meta: {
      type: 'jira',
      jira_key: issue.jira_key,
      jira_url: jiraUrl,
      issue_type: issue.issue_type,
      status: issue.status,
      labels: issue.labels,
      components: issue.components,
      story_points: issue.story_points,
      jira_created_at: issue.jira_created_at,
      jira_resolved_at: issue.jira_resolved_at
    },
    content_hash: contentHash,
    created_at: issue.jira_created_at || new Date().toISOString()
  };

  const { data, error } = await supabaseAdmin
    .from('evidence')
    .insert(evidenceRecord)
    .select('id')
    .single();

  if (error) {
    console.error('[Jira Matching] Evidence creation error:', error);
    throw error;
  }

  return { id: data.id, alreadyExists: false };
}

/**
 * Gap analysis: identify which activities are missing Jira evidence
 */
export async function analyzeGaps(projectId) {
  // Get all core activities
  const { data: activities } = await supabaseAdmin
    .from('core_activities')
    .select('id, name')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (!activities || activities.length === 0) {
    return { activities: [], summary: { total: 0, covered: 0, missing: 0 } };
  }

  // Get approved matches per activity
  const { data: matches } = await supabaseAdmin
    .from('jira_issue_matches')
    .select('activity_id, suggested_step, review_status')
    .eq('project_id', projectId)
    .eq('review_status', 'approved');

  // Get all evidence per activity (from all sources)
  const { data: evidence } = await supabaseAdmin
    .from('evidence')
    .select('linked_activity_id, systematic_step_primary')
    .eq('project_id', projectId)
    .not('soft_deleted', 'eq', true);

  const steps = ['Hypothesis', 'Experiment', 'Observation', 'Evaluation', 'Conclusion'];

  const activityGaps = activities.map(activity => {
    const activityMatches = (matches || []).filter(m => m.activity_id === activity.id);
    const activityEvidence = (evidence || []).filter(e => e.linked_activity_id === activity.id);

    // Count steps covered
    const jiraSteps = new Set(activityMatches.map(m => m.suggested_step).filter(Boolean));
    const evidenceSteps = new Set(activityEvidence.map(e => e.systematic_step_primary).filter(Boolean));
    const allCoveredSteps = new Set([...jiraSteps, ...evidenceSteps]);

    const missingSteps = steps.filter(s => !allCoveredSteps.has(s));

    return {
      activity_id: activity.id,
      activity_name: activity.name,
      jira_matches: activityMatches.length,
      total_evidence: activityEvidence.length,
      covered_steps: [...allCoveredSteps],
      missing_steps: missingSteps,
      coverage_pct: Math.round((allCoveredSteps.size / steps.length) * 100)
    };
  });

  const covered = activityGaps.filter(a => a.jira_matches > 0 || a.total_evidence > 0).length;

  return {
    activities: activityGaps,
    summary: {
      total: activities.length,
      covered,
      missing: activities.length - covered
    }
  };
}
