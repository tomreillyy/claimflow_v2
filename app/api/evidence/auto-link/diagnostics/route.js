import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Constants from auto-link
const MAX_ITEMS_PER_DAY_PER_PROJECT = 100;
const RECENCY_WINDOW_DAYS = 60;
const ACTIVITY_BACKFILL_DAYS = 14;
const COOLDOWN_HOURS = 24;
const MIN_CONTENT_LENGTH = 20;
const RULE_SCORE_THRESHOLD = 0.10;
const ATTEMPT_RETRY_HOURS = 1;

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

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTerms)
    .map(([word]) => word);
}

function jaccardSimilarity(terms1, terms2) {
  const set1 = new Set(terms1);
  const set2 = new Set(terms2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

function hashContent(content) {
  if (!content) return null;
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 64);
}

// Diagnostic endpoint - explains why items aren't linking
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const projectToken = searchParams.get('project_token');
    const evidenceId = searchParams.get('evidence_id');

    if (!projectToken) {
      return NextResponse.json({ error: 'project_token required' }, { status: 400 });
    }

    // Get project
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id, name, current_hypothesis')
      .eq('project_token', projectToken)
      .is('deleted_at', null)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get activities
    const { data: activities } = await supabaseAdmin
      .from('core_activities')
      .select('id, name, uncertainty, created_at')
      .eq('project_id', project.id)
      .order('created_at', { ascending: true });

    // Get evidence
    let evidenceQuery = supabaseAdmin
      .from('evidence')
      .select('*')
      .eq('project_id', project.id)
      .or('soft_deleted.is.null,soft_deleted.eq.false');

    if (evidenceId) {
      evidenceQuery = evidenceQuery.eq('id', evidenceId);
    }

    const { data: allEvidence } = await evidenceQuery.order('created_at', { ascending: false });

    // Check daily budget
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: attemptedToday } = await supabaseAdmin
      .from('evidence')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', project.id)
      .gte('link_attempted_at', oneDayAgo);

    const now = new Date();
    const diagnostics = {
      project: {
        id: project.id,
        name: project.name,
        hypothesis: project.current_hypothesis || 'Not set',
        activities_count: activities?.length || 0
      },
      budget: {
        attempted_today: attemptedToday || 0,
        daily_limit: MAX_ITEMS_PER_DAY_PER_PROJECT,
        within_budget: (attemptedToday || 0) < MAX_ITEMS_PER_DAY_PER_PROJECT
      },
      evidence: []
    };

    // No activities = nothing can link
    if (!activities || activities.length === 0) {
      diagnostics.blocking_issues = ['NO_ACTIVITIES: Project has no core activities. Add at least one activity first.'];
      return NextResponse.json(diagnostics);
    }

    // Analyze each evidence item
    for (const ev of (allEvidence || []).slice(0, 20)) { // Limit to 20 for diagnostics
      const analysis = {
        id: ev.id,
        created_at: ev.created_at,
        step: ev.systematic_step_primary,
        content_preview: ev.content?.substring(0, 100),
        current_link: ev.linked_activity_id ? 'LINKED' : 'UNLINKED',
        link_source: ev.link_source,
        link_reason: ev.link_reason,
        checks: {},
        blocking_reasons: [],
        activity_scores: []
      };

      // Check 1: Manual link
      if (ev.link_source === 'manual') {
        analysis.checks.manual_link = 'SKIP';
        analysis.blocking_reasons.push('Manually linked - will never auto-link');
      }

      // Check 2: Content length
      const contentLength = ev.content?.trim().length || 0;
      analysis.checks.content_length = {
        value: contentLength,
        min_required: MIN_CONTENT_LENGTH,
        pass: contentLength >= MIN_CONTENT_LENGTH
      };
      if (contentLength < MIN_CONTENT_LENGTH) {
        analysis.blocking_reasons.push(`Content too short: ${contentLength} < ${MIN_CONTENT_LENGTH} chars`);
      }

      // Check 3: Soft deleted
      analysis.checks.soft_deleted = {
        value: ev.soft_deleted || false,
        pass: !ev.soft_deleted
      };
      if (ev.soft_deleted) {
        analysis.blocking_reasons.push('Soft deleted');
      }

      // Check 4: Recency window
      const evidenceAge = (now - new Date(ev.created_at)) / (1000 * 60 * 60 * 24);
      const hasRecentActivity = activities.some(a => {
        const activityAge = (now - new Date(a.created_at)) / (1000 * 60 * 60 * 24);
        return activityAge < ACTIVITY_BACKFILL_DAYS;
      });
      analysis.checks.recency_window = {
        evidence_age_days: Math.round(evidenceAge),
        window_days: RECENCY_WINDOW_DAYS,
        has_recent_activity: hasRecentActivity,
        pass: evidenceAge <= RECENCY_WINDOW_DAYS || hasRecentActivity
      };
      if (evidenceAge > RECENCY_WINDOW_DAYS && !hasRecentActivity) {
        analysis.blocking_reasons.push(`Too old: ${Math.round(evidenceAge)} days > ${RECENCY_WINDOW_DAYS} days (no recent activities for backfill)`);
      }

      // Check 5: Cooldowns
      if (ev.link_updated_at) {
        const hoursSince = (now - new Date(ev.link_updated_at)) / (1000 * 60 * 60);
        analysis.checks.link_cooldown = {
          hours_since_update: Math.round(hoursSince * 10) / 10,
          cooldown_hours: COOLDOWN_HOURS,
          pass: hoursSince >= COOLDOWN_HOURS
        };
        if (hoursSince < COOLDOWN_HOURS) {
          analysis.blocking_reasons.push(`Link cooldown: ${Math.round(hoursSince)}h < ${COOLDOWN_HOURS}h`);
        }
      }

      if (ev.link_attempted_at) {
        const hoursSince = (now - new Date(ev.link_attempted_at)) / (1000 * 60 * 60);
        analysis.checks.attempt_cooldown = {
          hours_since_attempt: Math.round(hoursSince * 10) / 10,
          cooldown_hours: ATTEMPT_RETRY_HOURS,
          pass: hoursSince >= ATTEMPT_RETRY_HOURS
        };
        if (hoursSince < ATTEMPT_RETRY_HOURS) {
          analysis.blocking_reasons.push(`Attempt cooldown: ${Math.round(hoursSince)}h < ${ATTEMPT_RETRY_HOURS}h`);
        }
      }

      // Check 6: Content hash changed
      const currentHash = hashContent(ev.content);
      analysis.checks.content_hash = {
        current: currentHash?.substring(0, 16),
        stored: ev.content_hash?.substring(0, 16),
        changed: ev.content_hash ? currentHash !== ev.content_hash : 'never_hashed'
      };

      // Check 7: Keyword overlap & rule scores
      if (ev.content && contentLength >= MIN_CONTENT_LENGTH) {
        const evidenceTerms = extractTopTerms(ev.content, 5);
        analysis.evidence_terms = evidenceTerms;

        let hasOverlap = false;
        for (const activity of activities) {
          const activityText = `${activity.name} ${activity.uncertainty}`;
          const activityTerms = extractTopTerms(activityText, 5);
          const score = jaccardSimilarity(evidenceTerms, activityTerms);

          analysis.activity_scores.push({
            activity_name: activity.name,
            activity_terms: activityTerms,
            jaccard_score: Math.round(score * 1000) / 1000,
            passes_threshold: score >= RULE_SCORE_THRESHOLD,
            threshold: RULE_SCORE_THRESHOLD
          });

          if (score > 0) hasOverlap = true;
        }

        analysis.checks.keyword_overlap = {
          has_any_overlap: hasOverlap,
          pass: hasOverlap
        };

        if (!hasOverlap) {
          analysis.blocking_reasons.push('No keyword overlap with any activity');
        }

        // Sort by score
        analysis.activity_scores.sort((a, b) => b.jaccard_score - a.jaccard_score);
      }

      diagnostics.evidence.push(analysis);
    }

    // Summary
    const totalEvidence = allEvidence?.length || 0;
    const linked = allEvidence?.filter(e => e.linked_activity_id).length || 0;
    const manual = allEvidence?.filter(e => e.link_source === 'manual').length || 0;
    const auto = linked - manual;

    diagnostics.summary = {
      total_evidence: totalEvidence,
      linked: linked,
      linked_auto: auto,
      linked_manual: manual,
      unlinked: totalEvidence - linked,
      blocking_issues: diagnostics.blocking_issues || []
    };

    return NextResponse.json(diagnostics, { status: 200 });

  } catch (error) {
    console.error('[Auto-Link Diagnostics] Error:', error);
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
