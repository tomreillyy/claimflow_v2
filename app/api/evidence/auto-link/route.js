import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Hard budget limits
const MAX_ITEMS_PER_RUN = 25;
const MAX_ITEMS_PER_DAY_PER_PROJECT = 100;
const RECENCY_WINDOW_DAYS = 60;
const ACTIVITY_BACKFILL_DAYS = 14;
const COOLDOWN_HOURS = 24;
const MIN_CONTENT_LENGTH = 20;
const RULE_SCORE_THRESHOLD = 0.10; // Top ~20% pass (lowered from 0.15 for better recall)
const ATTEMPT_RETRY_HOURS = 1; // Don't retry failed attempts for 1 hour

// Generate SHA-256 hash (64 hex chars)
function hashContent(content) {
  if (!content) return null;
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 64);
}

// Extract TF-IDF-style keywords (top 5 terms)
function extractTopTerms(text, maxTerms = 5) {
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

  // Simple TF scoring (can enhance with IDF later)
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTerms)
    .map(([word]) => word);
}

// Truncate and clean text
function truncateText(text, maxChars = 200) {
  if (!text) return '';

  let clean = text
    .replace(/<[^>]*>/g, '')
    .replace(/^>.*$/gm, '')
    .replace(/On .* wrote:/gi, '')
    .replace(/--\s*$/m, '')
    .replace(/Sent from .*/gi, '')
    .replace(/Best regards.*/gi, '')
    .replace(/Thanks.*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (clean.length <= maxChars) return clean;

  const truncated = clean.substring(0, maxChars);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > maxChars * 0.8 ? truncated.substring(0, lastSpace) : truncated;
}

// Calculate Jaccard similarity between two term sets
function jaccardSimilarity(terms1, terms2) {
  const set1 = new Set(terms1);
  const set2 = new Set(terms2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

// Deterministic prefilter: check if evidence passes before LLM call
function passesPrefilter(evidence, activities, now) {
  // A) Must have content length >= MIN_CONTENT_LENGTH
  if (!evidence.content || evidence.content.trim().length < MIN_CONTENT_LENGTH) {
    return { pass: false, reason: 'content_too_short' };
  }

  // B) Must not be soft-deleted
  if (evidence.soft_deleted) {
    return { pass: false, reason: 'soft_deleted' };
  }

  // C) Must not be manually linked
  if (evidence.link_source === 'manual') {
    return { pass: false, reason: 'manual_link' };
  }

  // D) Recency window check
  const evidenceAge = (now - new Date(evidence.created_at)) / (1000 * 60 * 60 * 24);
  const hasRecentActivity = activities.some(a => {
    const activityAge = (now - new Date(a.created_at)) / (1000 * 60 * 60 * 24);
    return activityAge < ACTIVITY_BACKFILL_DAYS;
  });

  if (evidenceAge > RECENCY_WINDOW_DAYS && !hasRecentActivity) {
    return { pass: false, reason: 'outside_recency_window' };
  }

  // E) Keyword overlap check (at least 1 match)
  const evidenceTerms = extractTopTerms(evidence.content, 5);
  let hasOverlap = false;

  for (const activity of activities) {
    const activityText = `${activity.name} ${activity.uncertainty}`;
    const activityTerms = extractTopTerms(activityText, 5);
    const similarity = jaccardSimilarity(evidenceTerms, activityTerms);

    if (similarity > 0) {
      hasOverlap = true;
      break;
    }
  }

  if (!hasOverlap) {
    return { pass: false, reason: 'no_keyword_overlap' };
  }

  return { pass: true };
}

// Calculate rule-based score for evidence-activity pair
function calculateRuleScore(evidenceTerms, activity) {
  const activityText = `${activity.name} ${activity.uncertainty}`;
  const activityTerms = extractTopTerms(activityText, 5);
  return jaccardSimilarity(evidenceTerms, activityTerms);
}

// Call AI to link evidence to activities
async function linkWithAI(project, activities, evidenceItems) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[Auto-Link] No OpenAI API key configured');
    return [];
  }

  // Build compact activity list (name ≤5 words, uncertainty ≤35 words)
  const activityNames = activities.map(a => a.name.substring(0, 50));
  const activityDetails = activities.map(a =>
    `${a.name.substring(0, 50)}: ${a.uncertainty.split(' ').slice(0, 35).join(' ')}`
  ).join('\n');

  // Build evidence summaries with strict token limits
  const evidenceSummaries = evidenceItems.map(ev => {
    const snippet = truncateText(ev.content, 200);
    const top3Terms = ev.topTerms.slice(0, 3);

    return {
      id: ev.id,
      step: ev.systematic_step_primary || 'Unknown',
      snippet,
      terms: top3Terms.join(', '),
      date: new Date(ev.created_at).toISOString().split('T')[0]
    };
  });

  const hypothesis = (project.current_hypothesis || 'Not specified')
    .split(' ')
    .slice(0, 35)
    .join(' ');

  const prompt = `Link R&D evidence to core activities. Return ONLY valid JSON.

## Project Hypothesis
${hypothesis}

## Core Activities (link to exact names):
${activityDetails}

## Evidence (id | step | date | snippet ≤200 chars | top terms):
${evidenceSummaries.map(e =>
  `${e.id} | [${e.step}] | ${e.date} | ${e.snippet} | ${e.terms}`
).join('\n')}

## Task
For each evidence ID:
- **activity**: exact activity name OR null (only if strong match)
- **reason**: ≤110 chars why it matches
- **confidence**: "high" or "low"

Return null for weak/ambiguous signals. Require strong keyword + step relevance.

## JSON (no fences):
[
  {"evidence_id": "abc", "activity": "Name" or null, "reason": "...", "confidence": "high"}
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
          { role: 'system', content: 'You are a precise JSON generator for R&D evidence linking. Always return valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 600
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      console.error('[Auto-Link] OpenAI API error:', response.status);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content?.trim() || '';

    // Strip code fences
    content = content.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();

    let links;
    try {
      const match = content.match(/\[\s*{[\s\S]*}\s*\]/);
      links = JSON.parse(match ? match[0] : content);
    } catch {
      console.error('[Auto-Link] Failed to parse AI response:', content.substring(0, 200));
      throw new Error('Failed to parse AI response');
    }

    if (!Array.isArray(links)) throw new Error('AI response not an array');

    const activityNameSet = new Set(activityNames);
    const activityIdMap = new Map(activities.map(a => [a.name.substring(0, 50), a.id]));

    return links
      .filter(link => link?.evidence_id)
      .map(link => ({
        evidence_id: link.evidence_id,
        activity_id: link.activity && activityNameSet.has(link.activity)
          ? activityIdMap.get(link.activity)
          : null,
        reason: link.reason ? String(link.reason).substring(0, 110) : null,
        confidence: link.confidence === 'high' ? 'high' : 'low'
      }));

  } catch (error) {
    console.error('[Auto-Link] AI call error:', error.message);
    throw error;
  }
}

// Check daily budget for project
async function checkDailyBudget(projectId) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count } = await supabaseAdmin
    .from('evidence')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .gte('link_attempted_at', oneDayAgo);

  return (count || 0) < MAX_ITEMS_PER_DAY_PER_PROJECT;
}

// Main auto-link handler
export async function POST(req) {
  const now = new Date();

  try {
    const { project_id, evidence_ids } = await req.json();

    if (!project_id) {
      return NextResponse.json({ error: 'project_id required' }, { status: 400 });
    }

    // Check daily budget
    const withinBudget = await checkDailyBudget(project_id);
    if (!withinBudget) {
      console.log('[Auto-Link] Daily budget exceeded for project', project_id);
      return NextResponse.json({ ok: true, linked: 0, reason: 'daily_budget_exceeded' });
    }

    // Get project
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id, current_hypothesis')
      .eq('id', project_id)
      .is('deleted_at', null)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get core activities (requirement A)
    const { data: activities } = await supabaseAdmin
      .from('core_activities')
      .select('id, name, uncertainty, created_at')
      .eq('project_id', project.id)
      .order('created_at', { ascending: true });

    if (!activities || activities.length === 0) {
      // Silence: no activities = normal, not an error
      return NextResponse.json({ ok: true, linked: 0, reason: 'no_activities' });
    }

    // Get evidence to consider
    let query = supabaseAdmin
      .from('evidence')
      .select('id, content, systematic_step_primary, created_at, linked_activity_id, link_source, content_hash, link_updated_at, link_attempted_at, soft_deleted')
      .eq('project_id', project.id);

    if (evidence_ids && Array.isArray(evidence_ids) && evidence_ids.length > 0) {
      query = query.in('id', evidence_ids);
    }

    const { data: allEvidence } = await query
      .order('created_at', { ascending: false })
      .limit(100);

    if (!allEvidence || allEvidence.length === 0) {
      return NextResponse.json({ ok: true, linked: 0, reason: 'no_evidence' });
    }

    // Filter candidates: content changed OR never processed OR cooldown expired
    const candidates = allEvidence.filter(ev => {
      if (ev.link_source === 'manual') return false;

      const currentHash = hashContent(ev.content);

      // Never processed
      if (!ev.link_updated_at && !ev.link_attempted_at) return true;

      // Content changed
      if (ev.content_hash && ev.content_hash !== currentHash) return true;

      // Cooldown for successful links
      if (ev.link_updated_at) {
        const hoursSince = (now - new Date(ev.link_updated_at)) / (1000 * 60 * 60);
        if (hoursSince < COOLDOWN_HOURS) return false;
      }

      // Retry cooldown for failed attempts
      if (ev.link_attempted_at) {
        const hoursSince = (now - new Date(ev.link_attempted_at)) / (1000 * 60 * 60);
        if (hoursSince < ATTEMPT_RETRY_HOURS) return false;
      }

      return true;
    });

    if (candidates.length === 0) {
      return NextResponse.json({ ok: true, linked: 0, reason: 'all_cached_or_cooldown' });
    }

    // Apply deterministic prefilters
    const passedPrefilter = [];
    const prefilterStats = {};

    for (const ev of candidates) {
      const result = passesPrefilter(ev, activities, now);
      if (result.pass) {
        // Add top terms for later use
        ev.topTerms = extractTopTerms(ev.content, 5);
        passedPrefilter.push(ev);
      } else {
        prefilterStats[result.reason] = (prefilterStats[result.reason] || 0) + 1;
      }
    }

    console.log(`[Auto-Link] Prefilter: ${passedPrefilter.length}/${candidates.length} passed. Rejected:`, prefilterStats);

    if (passedPrefilter.length === 0) {
      return NextResponse.json({ ok: true, linked: 0, reason: 'none_passed_prefilter' });
    }

    // Take most recent MAX_ITEMS_PER_RUN items
    const toProcess = passedPrefilter.slice(0, MAX_ITEMS_PER_RUN);

    console.log(`[Auto-Link] Processing ${toProcess.length} items for project ${project.id}`);

    // Call AI
    let aiLinks = [];
    let aiCallFailed = false;

    try {
      aiLinks = await linkWithAI(project, activities, toProcess);
    } catch (error) {
      aiCallFailed = true;
      console.error('[Auto-Link] AI call failed:', error.message);

      // Mark attempts to prevent immediate retry
      for (const ev of toProcess) {
        await supabaseAdmin
          .from('evidence')
          .update({ link_attempted_at: now.toISOString() })
          .eq('id', ev.id);
      }

      return NextResponse.json({
        ok: false,
        error: 'AI call failed',
        details: error.message
      }, { status: 500 });
    }

    // Apply dual-gate confidence filter: rule score + model confidence
    const finalLinks = [];
    for (const link of aiLinks) {
      const evidence = toProcess.find(e => e.id === link.evidence_id);
      if (!evidence || !link.activity_id) continue;

      const activity = activities.find(a => a.id === link.activity_id);
      if (!activity) continue;

      // Calculate rule-based score
      const ruleScore = calculateRuleScore(evidence.topTerms, activity);

      // Require BOTH: rule score >= threshold AND model confidence = high
      if (ruleScore >= RULE_SCORE_THRESHOLD && link.confidence === 'high') {
        finalLinks.push(link);
      } else {
        console.log(`[Auto-Link] Rejected link for ${evidence.id}: rule=${ruleScore.toFixed(3)}, confidence=${link.confidence}`);
      }
    }

    // Handle conflicts (two activities tie) - set to null
    const evidenceLinkCount = {};
    for (const link of finalLinks) {
      evidenceLinkCount[link.evidence_id] = (evidenceLinkCount[link.evidence_id] || 0) + 1;
    }

    const deconflictedLinks = finalLinks.filter(link => evidenceLinkCount[link.evidence_id] === 1);
    const conflictCount = finalLinks.length - deconflictedLinks.length;

    if (conflictCount > 0) {
      console.log(`[Auto-Link] Removed ${conflictCount} conflicting links (ties)`);
    }

    // Update database
    let updatedCount = 0;
    for (const link of deconflictedLinks) {
      const evidence = toProcess.find(e => e.id === link.evidence_id);
      if (!evidence) continue;

      const updates = {
        linked_activity_id: link.activity_id,
        link_source: 'auto',
        link_reason: link.reason,
        link_updated_at: now.toISOString(),
        link_attempted_at: now.toISOString(),
        content_hash: hashContent(evidence.content)
      };

      const { error } = await supabaseAdmin
        .from('evidence')
        .update(updates)
        .eq('id', link.evidence_id);

      if (!error) {
        updatedCount++;
      } else {
        console.error('[Auto-Link] Update failed for', link.evidence_id, error);
      }
    }

    // Mark items that got no link (stay unlinked) with attempt timestamp
    for (const ev of toProcess) {
      const wasLinked = deconflictedLinks.some(l => l.evidence_id === ev.id);
      if (!wasLinked) {
        await supabaseAdmin
          .from('evidence')
          .update({
            link_attempted_at: now.toISOString(),
            content_hash: hashContent(ev.content)
          })
          .eq('id', ev.id);
      }
    }

    console.log(`[Auto-Link] Linked ${updatedCount}/${toProcess.length} items for project ${project.id}`);

    return NextResponse.json({
      ok: true,
      linked: updatedCount,
      processed: toProcess.length,
      ai_links: aiLinks.length,
      final_links: deconflictedLinks.length,
      conflicts: conflictCount
    });

  } catch (error) {
    console.error('[Auto-Link] Error:', error);
    return NextResponse.json({
      ok: false,
      error: error.message
    }, { status: 500 });
  }
}
