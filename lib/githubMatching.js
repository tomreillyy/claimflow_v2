// lib/githubMatching.js
// AI matching engine for GitHub commits/PRs against core R&D activities
// Mirrors jiraMatching.js pattern: keyword pre-scoring → AI classification → store matches

import { supabaseAdmin } from './supabaseAdmin';
import crypto from 'crypto';

const MAX_ITEMS_PER_BATCH = 15;
const MAX_ITEMS_PER_RUN = 100;
const KEYWORD_SCORE_THRESHOLD = 0.05;

/**
 * Extract top terms from text for keyword matching
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
 * Compute keyword scores between commits and activities
 */
function computeKeywordScores(items, activities) {
  const pairs = [];

  for (const item of items) {
    const itemText = `${item.commit_message} ${item.commit_meta?.branch || ''}`;
    const itemTerms = extractTopTerms(itemText, 8);

    let bestScore = 0;
    let bestActivity = null;

    for (const activity of activities) {
      const activityText = `${activity.name} ${activity.uncertainty || ''}`;
      const activityTerms = extractTopTerms(activityText, 8);
      const score = jaccardSimilarity(itemTerms, activityTerms);

      if (score > bestScore) {
        bestScore = score;
        bestActivity = activity;
      }
    }

    if (bestScore >= KEYWORD_SCORE_THRESHOLD) {
      pairs.push({
        item,
        itemTerms,
        bestActivity,
        keywordScore: bestScore
      });
    }
  }

  return pairs;
}

/**
 * Call OpenAI to match commits against activities with RDTI step classification
 */
async function matchBatchWithAI(project, activities, itemBatch) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[GitHub Matching] No OpenAI API key configured');
    return [];
  }

  const activityDetails = activities.map(a =>
    `${a.name.substring(0, 60)}: ${(a.uncertainty || '').split(' ').slice(0, 40).join(' ')}`
  ).join('\n');

  const commitSummaries = itemBatch.map(pair => {
    const item = pair.item;
    const meta = item.commit_meta || {};
    return {
      sha: item.commit_sha.substring(0, 7),
      message: truncateText(item.commit_message, 200),
      files_changed: meta.files_changed || 0,
      additions: meta.additions || 0,
      deletions: meta.deletions || 0,
      branch: meta.branch || '',
      author: meta.author_email || item.author_email || ''
    };
  });

  const hypothesis = (project.current_hypothesis || 'Not specified')
    .split(' ')
    .slice(0, 40)
    .join(' ');

  const prompt = `Classify GitHub commits as R&D or not, and generate audit-ready summaries. Return ONLY valid JSON.

## Project Context
Hypothesis: ${hypothesis}

## Core R&D Activities (optional — match if relevant):
${activityDetails}

## GitHub Commits:
${commitSummaries.map(s =>
  `${s.sha} | ${s.message} | ${s.files_changed} files (+${s.additions}/-${s.deletions}) | branch: ${s.branch || 'default'}`
).join('\n')}

## Task
For each commit, determine if it represents R&D work (technical uncertainty, experimentation, systematic investigation, novel solutions).

Return for each commit:
- **is_rd**: true if this is R&D work, false if routine/BAU
- **activity**: best matching activity name from the list above, or null if none fit well
- **summary**: 1-2 sentence explanation of the R&D relevance (for tax audit records). If not R&D, briefly explain why.
- **step**: RDTI systematic progression step: "Hypothesis", "Experiment", "Observation", "Evaluation", or "Conclusion"
- **confidence**: "high", "medium", or "low"

Be generous with R&D classification — research, spikes, POCs, performance investigations, architecture exploration, algorithm work, and feasibility studies all qualify. Only exclude clear BAU work (CI updates, typo fixes, dependency bumps, housekeeping).

## JSON (no fences):
[
  {"sha": "abc1234", "is_rd": true, "activity": "Activity Name" or null, "summary": "...", "step": "Experiment", "confidence": "high"}
]`;

  // Log what we're sending to the AI
  console.log(`[GitHub Matching] === AI BATCH INPUT ===`);
  console.log(`[GitHub Matching] Hypothesis: "${hypothesis}"`);
  console.log(`[GitHub Matching] Activities (${activities.length}):`);
  activities.forEach(a => console.log(`  - ${a.name.substring(0, 60)}`));
  console.log(`[GitHub Matching] Commits (${commitSummaries.length}):`);
  commitSummaries.forEach(s => console.log(`  ${s.sha} | ${s.message.substring(0, 80)} | branch: ${s.branch}`));

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
        max_tokens: 3000
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      console.error('[GitHub Matching] OpenAI API error:', response.status);
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
      console.error('[GitHub Matching] Failed to parse AI response:', content.substring(0, 300));
      throw new Error('Failed to parse AI response');
    }

    if (!Array.isArray(results)) throw new Error('AI response not an array');

    // Log AI classifications
    console.log(`[GitHub Matching] === AI RESPONSE (${results.length} items) ===`);
    results.forEach(r => {
      console.log(`  ${r.sha} | is_rd: ${r.is_rd} | confidence: ${r.confidence} | step: ${r.step} | activity: ${r.activity || 'none'}`);
      if (r.summary) console.log(`    summary: ${String(r.summary).substring(0, 120)}`);
    });

    const validSteps = new Set(['Hypothesis', 'Experiment', 'Observation', 'Evaluation', 'Conclusion']);

    // Fuzzy activity name matching
    function findActivityId(aiActivityName) {
      if (!aiActivityName) return null;
      const lower = aiActivityName.toLowerCase().trim();
      for (const a of activities) {
        if (a.name.substring(0, 60).toLowerCase() === lower) return a.id;
      }
      for (const a of activities) {
        const aLower = a.name.toLowerCase();
        if (aLower.includes(lower) || lower.includes(aLower)) return a.id;
      }
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
      .filter(r => r?.sha)
      .map(r => ({
        sha: r.sha,
        is_rd: r.is_rd !== false,
        activity_id: findActivityId(r.activity),
        ai_summary: r.summary ? String(r.summary).substring(0, 500) : null,
        suggested_step: validSteps.has(r.step) ? r.step : null,
        confidence: ['high', 'medium', 'low'].includes(r.confidence) ? r.confidence : 'low'
      }));

  } catch (error) {
    console.error('[GitHub Matching] AI call error:', error.message);
    throw error;
  }
}

/**
 * Main matching function: fetches cached commits from evidence → keyword pre-filter → AI matching → store in github_commit_matches
 */
export async function matchGitHubCommits(projectId) {
  console.log(`[GitHub Matching] Starting match for project: ${projectId}`);

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

  // Get GitHub evidence items that haven't been matched yet
  // These are commits/PRs in the evidence table with meta.sha or meta.pr_number
  const { data: allEvidence } = await supabaseAdmin
    .from('evidence')
    .select('id, content, meta, author_email, created_at')
    .eq('project_id', projectId)
    .not('soft_deleted', 'eq', true)
    .order('created_at', { ascending: false })
    .limit(MAX_ITEMS_PER_RUN);

  // Filter to GitHub items only (have SHA in meta)
  const githubItems = (allEvidence || []).filter(e =>
    e.meta?.sha || e.meta?.pr_number
  );

  if (githubItems.length === 0) {
    return { matched: 0, skipped: 0, reason: 'no_github_items' };
  }

  // Convert to match-friendly format and deduplicate by SHA
  const allItems = githubItems.map(e => ({
    evidence_id: e.id,
    commit_sha: e.meta?.sha || `pr-${e.meta?.pr_number}`,
    commit_message: e.content || '',
    commit_url: e.meta?.commit_url || e.meta?.pr_url || '',
    commit_meta: {
      files_changed: e.meta?.files_changed || 0,
      additions: e.meta?.additions || 0,
      deletions: e.meta?.deletions || 0,
      branch: e.meta?.branch || '',
      author_email: e.author_email || '',
      type: e.meta?.pr_number ? 'pr' : 'commit',
      pr_number: e.meta?.pr_number || null,
      repo: e.meta?.repo || ''
    },
    author_email: e.author_email,
    created_at: e.created_at
  }));

  // Deduplicate by SHA — keep the first (most recent) evidence record per commit
  const seenShas = new Set();
  const items = allItems.filter(item => {
    if (seenShas.has(item.commit_sha)) return false;
    seenShas.add(item.commit_sha);
    return true;
  });

  if (items.length < allItems.length) {
    console.log(`[GitHub Matching] Deduplicated: ${allItems.length} → ${items.length} unique items`);
  }

  // Only skip items that have already been reviewed (approved/rejected/skipped)
  const shas = items.map(i => i.commit_sha);
  const { data: existingMatches } = await supabaseAdmin
    .from('github_commit_matches')
    .select('commit_sha, review_status')
    .eq('project_id', projectId)
    .in('commit_sha', shas)
    .in('review_status', ['approved', 'rejected', 'skipped', 'auto_approved']);

  const reviewedShas = new Set(
    (existingMatches || []).map(m => m.commit_sha)
  );

  const unmatchedItems = items.filter(i => !reviewedShas.has(i.commit_sha));
  console.log(`[GitHub Matching] ${unmatchedItems.length} items to process (${reviewedShas.size} already reviewed)`);

  if (unmatchedItems.length === 0) {
    return { matched: 0, skipped: 0, reason: 'all_already_reviewed' };
  }

  // Keyword pre-scoring
  let qualifiedPairs;
  if (unmatchedItems.length <= 20) {
    qualifiedPairs = unmatchedItems.map(item => ({
      item,
      itemTerms: extractTopTerms(item.commit_message, 8),
      bestActivity: activities[0],
      keywordScore: 0
    }));
    console.log(`[GitHub Matching] Small batch (${unmatchedItems.length} items) — skipping keyword pre-filter`);
  } else {
    qualifiedPairs = computeKeywordScores(unmatchedItems, activities);
    console.log(`[GitHub Matching] ${qualifiedPairs.length}/${unmatchedItems.length} items passed keyword pre-filter`);
  }

  if (qualifiedPairs.length === 0) {
    return { matched: 0, skipped: unmatchedItems.length, reason: 'none_passed_keyword_filter' };
  }

  // Batch AI matching
  let totalMatched = 0;
  let totalSkipped = 0;
  let totalAutoApproved = 0;
  const diagnostics = {
    items_sent: qualifiedPairs.map(p => ({
      sha: p.item.commit_sha.substring(0, 7),
      message: p.item.commit_message.substring(0, 100)
    })),
    activities: activities.map(a => a.name),
    hypothesis: project.current_hypothesis || 'Not specified',
    ai_results: [],
    unmatched_shas: []
  };

  for (let i = 0; i < qualifiedPairs.length; i += MAX_ITEMS_PER_BATCH) {
    const batch = qualifiedPairs.slice(i, i + MAX_ITEMS_PER_BATCH);

    try {
      const aiResults = await matchBatchWithAI(project, activities, batch);
      console.log(`[GitHub Matching] AI returned ${aiResults.length} results for batch of ${batch.length}`);
      diagnostics.ai_results.push(...aiResults.map(r => ({
        sha: r.sha, is_rd: r.is_rd, confidence: r.confidence,
        step: r.suggested_step, summary: (r.ai_summary || '').substring(0, 120)
      })));

      // Track items AI didn't return
      const returnedShas = new Set(aiResults.map(r => r.sha));
      for (const pair of batch) {
        const shortSha = pair.item.commit_sha.substring(0, 7);
        if (!returnedShas.has(shortSha) && ![...returnedShas].some(s => shortSha.startsWith(s) || s.startsWith(shortSha))) {
          diagnostics.unmatched_shas.push(shortSha);
          console.log(`[GitHub Matching] AI did NOT return result for ${shortSha}: "${pair.item.commit_message.substring(0, 60)}"`);
        }
      }

      for (const result of aiResults) {
        if (!result.is_rd) {
          totalSkipped++;
          continue;
        }

        // Find the item record by matching SHA prefix
        const itemRecord = batch.find(p =>
          p.item.commit_sha.startsWith(result.sha) || result.sha.startsWith(p.item.commit_sha.substring(0, 7))
        );
        if (!itemRecord) {
          console.error(`[GitHub Matching] Could not find item for SHA ${result.sha}`);
          continue;
        }

        // Delete any old pending matches for this item
        await supabaseAdmin
          .from('github_commit_matches')
          .delete()
          .eq('project_id', projectId)
          .eq('commit_sha', itemRecord.item.commit_sha)
          .eq('review_status', 'pending');

        // Auto-approve high confidence matches
        const isAutoApproved = result.confidence === 'high';
        const reviewStatus = isAutoApproved ? 'auto_approved' : 'pending';

        const matchData = {
          project_id: projectId,
          commit_sha: itemRecord.item.commit_sha,
          commit_message: itemRecord.item.commit_message.substring(0, 1000),
          commit_url: itemRecord.item.commit_url || null,
          commit_meta: itemRecord.item.commit_meta,
          activity_id: result.activity_id || null,
          match_score: itemRecord.keywordScore || 0,
          match_confidence: result.confidence || 'medium',
          ai_summary: result.ai_summary || 'Classified as R&D work',
          suggested_step: result.suggested_step || null,
          review_status: reviewStatus,
          updated_at: new Date().toISOString()
        };

        // If auto-approved, create evidence linkage
        if (isAutoApproved && itemRecord.item.evidence_id) {
          matchData.evidence_id = itemRecord.item.evidence_id;
          // Also update the existing evidence with step/activity classification
          const updateFields = {};
          if (result.suggested_step) {
            updateFields.systematic_step_primary = result.suggested_step;
            updateFields.systematic_step_source = 'auto';
          }
          if (result.activity_id) {
            updateFields.linked_activity_id = result.activity_id;
            updateFields.link_source = 'auto';
            updateFields.link_reason = result.ai_summary;
          }
          if (Object.keys(updateFields).length > 0) {
            await supabaseAdmin
              .from('evidence')
              .update(updateFields)
              .eq('id', itemRecord.item.evidence_id);
          }
          matchData.reviewed_by = 'auto';
          matchData.reviewed_at = new Date().toISOString();
          totalAutoApproved++;
        }

        const { error: insertError } = await supabaseAdmin
          .from('github_commit_matches')
          .insert(matchData);

        if (insertError) {
          console.error('[GitHub Matching] Insert error:', JSON.stringify(insertError));
        } else {
          totalMatched++;
        }
      }
    } catch (err) {
      console.error(`[GitHub Matching] Batch ${i} failed:`, err.message);
    }
  }

  console.log(`[GitHub Matching] Complete: ${totalMatched} matched (${totalAutoApproved} auto-approved), ${totalSkipped} skipped`);

  return {
    matched: totalMatched,
    auto_approved: totalAutoApproved,
    skipped: totalSkipped,
    total_items: unmatchedItems.length,
    qualified: qualifiedPairs.length,
    diagnostics
  };
}

/**
 * Create evidence record from an approved GitHub commit match
 * (For commits that were manually approved — auto-approved ones already have evidence)
 */
export async function createEvidenceFromCommitMatch(match, projectId) {
  const meta = match.commit_meta || {};
  const ispr = meta.type === 'pr';

  const content = match.commit_message
    + (match.ai_summary ? '\n\nR&D Relevance: ' + match.ai_summary : '');

  const contentHash = crypto
    .createHash('sha256')
    .update(match.commit_sha + match.commit_message)
    .digest('hex');

  // Check for existing evidence with same hash
  const { data: existing } = await supabaseAdmin
    .from('evidence')
    .select('id')
    .eq('project_id', projectId)
    .eq('content_hash', contentHash)
    .maybeSingle();

  if (existing) {
    // Update existing evidence with classification
    const updateFields = {};
    if (match.suggested_step) {
      updateFields.systematic_step_primary = match.suggested_step;
      updateFields.systematic_step_source = 'auto';
    }
    if (match.activity_id) {
      updateFields.linked_activity_id = match.activity_id;
      updateFields.link_source = 'auto';
      updateFields.link_reason = match.ai_summary;
    }
    if (Object.keys(updateFields).length > 0) {
      await supabaseAdmin
        .from('evidence')
        .update(updateFields)
        .eq('id', existing.id);
    }
    return { id: existing.id, alreadyExists: true };
  }

  const evidenceRecord = {
    project_id: projectId,
    author_email: meta.author_email || null,
    content,
    source: 'note',
    meta: ispr ? {
      type: 'pr',
      pr_number: meta.pr_number,
      pr_url: match.commit_url,
      repo: meta.repo,
      files_changed: meta.files_changed || 0,
      additions: meta.additions || 0,
      deletions: meta.deletions || 0
    } : {
      sha: match.commit_sha,
      commit_url: match.commit_url,
      repo: meta.repo,
      files_changed: meta.files_changed || 0,
      additions: meta.additions || 0,
      deletions: meta.deletions || 0
    },
    content_hash: contentHash,
    created_at: new Date().toISOString()
  };

  // Set classification fields
  const validSteps = ['Hypothesis', 'Experiment', 'Observation', 'Evaluation', 'Conclusion'];
  if (match.suggested_step && validSteps.includes(match.suggested_step)) {
    evidenceRecord.systematic_step_primary = match.suggested_step;
    evidenceRecord.systematic_step_source = 'auto';
  }
  if (match.activity_id) {
    evidenceRecord.linked_activity_id = match.activity_id;
    evidenceRecord.link_source = 'auto';
    evidenceRecord.link_reason = match.ai_summary;
  }

  const { data, error } = await supabaseAdmin
    .from('evidence')
    .insert(evidenceRecord)
    .select('id')
    .single();

  if (error) {
    console.error('[GitHub Matching] Evidence creation error:', error);
    throw error;
  }

  return { id: data.id, alreadyExists: false };
}

/**
 * Unified gap analysis: checks RDTI step coverage across ALL sources
 */
export async function analyzeAllGaps(projectId) {
  const { data: activities } = await supabaseAdmin
    .from('core_activities')
    .select('id, name')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (!activities || activities.length === 0) {
    return { activities: [], summary: { total: 0, covered: 0, missing: 0 } };
  }

  // Get approved Jira matches
  const { data: jiraMatches } = await supabaseAdmin
    .from('jira_issue_matches')
    .select('activity_id, suggested_step, review_status')
    .eq('project_id', projectId)
    .in('review_status', ['approved']);

  // Get approved/auto-approved GitHub matches
  const { data: githubMatches } = await supabaseAdmin
    .from('github_commit_matches')
    .select('activity_id, suggested_step, review_status')
    .eq('project_id', projectId)
    .in('review_status', ['approved', 'auto_approved']);

  // Get all evidence (from all sources)
  const { data: evidence } = await supabaseAdmin
    .from('evidence')
    .select('linked_activity_id, systematic_step_primary')
    .eq('project_id', projectId)
    .not('soft_deleted', 'eq', true);

  const steps = ['Hypothesis', 'Experiment', 'Observation', 'Evaluation', 'Conclusion'];

  const activityGaps = activities.map(activity => {
    const jiraSteps = new Set(
      (jiraMatches || [])
        .filter(m => m.activity_id === activity.id)
        .map(m => m.suggested_step)
        .filter(Boolean)
    );
    const githubSteps = new Set(
      (githubMatches || [])
        .filter(m => m.activity_id === activity.id)
        .map(m => m.suggested_step)
        .filter(Boolean)
    );
    const evidenceSteps = new Set(
      (evidence || [])
        .filter(e => e.linked_activity_id === activity.id)
        .map(e => e.systematic_step_primary)
        .filter(Boolean)
    );
    const allCoveredSteps = new Set([...jiraSteps, ...githubSteps, ...evidenceSteps]);

    const jiraCount = (jiraMatches || []).filter(m => m.activity_id === activity.id).length;
    const githubCount = (githubMatches || []).filter(m => m.activity_id === activity.id).length;
    const evidenceCount = (evidence || []).filter(e => e.linked_activity_id === activity.id).length;
    const missingSteps = steps.filter(s => !allCoveredSteps.has(s));

    return {
      activity_id: activity.id,
      activity_name: activity.name,
      jira_matches: jiraCount,
      github_matches: githubCount,
      total_evidence: evidenceCount,
      covered_steps: [...allCoveredSteps],
      missing_steps: missingSteps,
      coverage_pct: Math.round((allCoveredSteps.size / steps.length) * 100)
    };
  });

  const covered = activityGaps.filter(a =>
    a.jira_matches > 0 || a.github_matches > 0 || a.total_evidence > 0
  ).length;

  return {
    activities: activityGaps,
    summary: {
      total: activities.length,
      covered,
      missing: activities.length - covered
    }
  };
}
