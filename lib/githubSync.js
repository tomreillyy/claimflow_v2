// lib/githubSync.js
// GitHub commit sync utility functions

import { supabaseAdmin } from './supabaseAdmin';
import crypto from 'crypto';

/**
 * Fetches commits from GitHub API since last sync
 * @param {Object} options
 * @param {string} options.owner - Repository owner
 * @param {string} options.repo - Repository name
 * @param {string} options.since - ISO date string or null
 * @param {string} options.token - GitHub access token
 * @returns {Promise<Array>} Array of commit objects
 */
export async function fetchGitHubCommits({ owner, repo, since, token }) {
  const baseUrl = 'https://api.github.com';
  const params = new URLSearchParams();

  if (since) {
    params.append('since', new Date(since).toISOString());
  }

  // Fetch commits with stats (additions/deletions)
  const url = `${baseUrl}/repos/${owner}/${repo}/commits?${params.toString()}`;

  console.log(`[githubSync] Fetching commits from: ${url}`);
  console.log(`[githubSync] Using token: ${token ? token.substring(0, 10) + '...' : 'MISSING'}`);

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });

  console.log(`[githubSync] GitHub API response status: ${response.status}`);
  console.log(`[githubSync] Rate limit remaining: ${response.headers.get('x-ratelimit-remaining')}`);

  if (!response.ok) {
    const error = await response.text();
    console.error(`[githubSync] GitHub API error: ${response.status} - ${error}`);
    throw new Error(`GitHub API error: ${response.status} - ${error}`);
  }

  const commits = await response.json();
  console.log(`[githubSync] Received ${commits.length} commits from API`);

  // Log first commit for debugging if any
  if (commits.length > 0) {
    console.log(`[githubSync] First commit: ${commits[0].sha.substring(0, 7)} - "${commits[0].commit.message.split('\n')[0]}"`);
  }

  return commits;
}

/**
 * Fetches pull requests from GitHub API since last sync
 * @param {Object} options
 * @param {string} options.owner - Repository owner
 * @param {string} options.repo - Repository name
 * @param {string} options.since - ISO date string or null
 * @param {string} options.token - GitHub access token
 * @returns {Promise<Array>} Array of pull request objects
 */
export async function fetchGitHubPullRequests({ owner, repo, since, token }) {
  const params = new URLSearchParams();
  params.append('state', 'all'); // Include open + closed PRs
  params.append('sort', 'updated');
  params.append('direction', 'desc');

  const url = `https://api.github.com/repos/${owner}/${repo}/pulls?${params.toString()}`;

  console.log(`[githubSync] Fetching pull requests from: ${url}`);

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });

  console.log(`[githubSync] GitHub PR API response status: ${response.status}`);

  if (!response.ok) {
    const error = await response.text();
    console.error(`[githubSync] GitHub PR API error: ${response.status} - ${error}`);
    throw new Error(`GitHub PR API error: ${response.status} - ${error}`);
  }

  const prs = await response.json();

  // Filter by date if since provided
  const sinceDate = since ? new Date(since) : null;
  const filtered = sinceDate
    ? prs.filter(pr => new Date(pr.updated_at) > sinceDate)
    : prs;

  console.log(`[githubSync] Received ${prs.length} PRs, ${filtered.length} after date filter`);

  return filtered;
}

/**
 * Check if content shows R&D signals (keyword-based, zero AI cost)
 * @param {string} content - Text to analyze
 * @returns {boolean} True if likely R&D work
 */
function isLikelyRD(content) {
  if (!content || content.length < 15) return false;

  const lower = content.toLowerCase();

  // Noise patterns (auto-discard)
  const noisePatterns = [
    'fix typo', 'update readme', 'bump version', 'dependency update',
    'merge pull request', 'revert "', 'initial commit', 'update deps'
  ];

  if (noisePatterns.some(pattern => lower.includes(pattern))) {
    return false;
  }

  // R&D signal keywords
  const rdKeywords = [
    'perf', 'performance', 'optimize', 'benchmark', 'latency', 'throughput',
    'attempt', 'experiment', 'test', 'investigate', 'prototype', 'spike',
    'reduce', 'improve', 'faster', 'slower', 'measure', 'metric',
    'hypothesis', 'trial', 'evaluate', 'compare', 'alternative'
  ];

  if (rdKeywords.some(keyword => lower.includes(keyword))) {
    return true;
  }

  // Check for metrics (numbers with units)
  if (/\d+(\.\d+)?\s?(ms|sec|s|MB|KB|GB|%|x|times)/.test(content)) {
    return true;
  }

  // Default: discard (conservative filter)
  return false;
}

/**
 * Pre-filters commits to remove noise and non-R&D work
 * @param {Array} commits - Array of GitHub commit objects
 * @returns {Object} {filtered: Array, reasons: Object} Filtered commits and skip reasons
 */
export function preFilterCommits(commits) {
  // Patterns to skip (common non-R&D commits)
  const skipPatterns = [
    { pattern: /^merge/i, reason: 'merge_commit' },
    { pattern: /^bump|version/i, reason: 'version_bump' },
    { pattern: /^update dependencies/i, reason: 'dependency_update' },
    { pattern: /^(format|lint|prettier|eslint)/i, reason: 'formatting' },
    { pattern: /^(readme|docs?):/i, reason: 'documentation' },
    { pattern: /^wip$/i, reason: 'wip' },
    { pattern: /^initial commit/i, reason: 'initial_commit' },
    { pattern: /^\[skip\s*ci\]/i, reason: 'skip_ci' }
  ];

  const skipReasons = {
    pattern_matched: {},
    too_short: 0,
    duplicate: 0
  };

  const filtered = commits.filter(commit => {
    const message = commit.commit.message.split('\n')[0]; // First line only
    const authorEmail = commit.commit.author.email.toLowerCase();

    // Skip if matches noise patterns
    const matchedPattern = skipPatterns.find(({ pattern }) => pattern.test(message));
    if (matchedPattern) {
      skipReasons.pattern_matched[matchedPattern.reason] =
        (skipReasons.pattern_matched[matchedPattern.reason] || 0) + 1;
      console.log(`[githubSync] Skipping commit (${matchedPattern.reason}): "${message.substring(0, 60)}..." by ${authorEmail}`);
      return false;
    }

    // Require minimum length (15 chars)
    if (message.length < 15) {
      skipReasons.too_short++;
      console.log(`[githubSync] Skipping commit (too short): "${message}" by ${authorEmail}`);
      return false;
    }

    // R&D relevance check
    if (!isLikelyRD(message)) {
      skipReasons.not_rd = (skipReasons.not_rd || 0) + 1;
      console.log(`[githubSync] Skipping commit (not R&D): "${message.substring(0, 60)}..." by ${authorEmail}`);
      return false;
    }

    console.log(`[githubSync] ✓ Keeping commit: "${message.substring(0, 60)}..." by ${authorEmail}`);
    return true;
  });

  return { filtered, skipReasons };
}

/**
 * Pre-filters pull requests to remove noise
 * @param {Array} prs - Array of GitHub pull request objects
 * @returns {Object} {filtered: Array, reasons: Object} Filtered PRs and skip reasons
 */
export function preFilterPullRequests(prs) {
  const skipReasons = {
    not_rd: 0,
    too_short: 0,
    dependency_only: 0
  };

  const filtered = prs.filter(pr => {
    const title = pr.title || '';
    const body = pr.body || '';
    const combined = `${title} ${body}`;

    // Skip dependency-only PRs
    if (/^(bump|update|upgrade).*dependenc/i.test(title)) {
      skipReasons.dependency_only++;
      console.log(`[githubSync] Skipping PR (dependency): "${title.substring(0, 60)}..."`);
      return false;
    }

    // Require minimum length
    if (combined.trim().length < 20) {
      skipReasons.too_short++;
      console.log(`[githubSync] Skipping PR (too short): "${title}"`);
      return false;
    }

    // R&D relevance check
    if (!isLikelyRD(combined)) {
      skipReasons.not_rd++;
      console.log(`[githubSync] Skipping PR (not R&D): "${title.substring(0, 60)}..."`);
      return false;
    }

    console.log(`[githubSync] ✓ Keeping PR: "${title.substring(0, 60)}..."`);
    return true;
  });

  return { filtered, skipReasons };
}

/**
 * Inserts filtered commits as evidence items
 * @param {Array} commits - Filtered commit objects
 * @param {string} projectId - Project UUID
 * @param {string} repoOwner - Repository owner
 * @param {string} repoName - Repository name
 * @returns {Promise<Array>} Inserted evidence records
 */
export async function bulkInsertEvidence(commits, projectId, repoOwner, repoName) {
  if (commits.length === 0) return [];

  // Transform commits to evidence format
  const evidenceRecords = commits.map(commit => {
    const message = commit.commit.message;
    const sha = commit.sha;
    const authorEmail = commit.commit.author.email;
    const commitUrl = commit.html_url;

    // Extract commit stats (files changed, additions, deletions)
    const stats = commit.stats || {};

    // Generate content hash for staleness detection
    const contentHash = crypto
      .createHash('sha256')
      .update(message + sha)
      .digest('hex');

    return {
      project_id: projectId,
      author_email: authorEmail,
      content: message,
      source: 'note', // Use 'note' source type (valid: 'note', 'email', 'upload')
      meta: {
        sha: sha.substring(0, 40), // Full SHA
        commit_url: commitUrl,
        repo: `${repoOwner}/${repoName}`,
        files_changed: commit.files?.length || 0,
        additions: stats.additions || 0,
        deletions: stats.deletions || 0,
        committed_at: commit.commit.author.date
      },
      content_hash: contentHash,
      created_at: commit.commit.author.date // Use commit date, not current time
    };
  });

  // Check for existing commits by content_hash to avoid duplicates
  const contentHashes = evidenceRecords.map(r => r.content_hash);
  const { data: existing } = await supabaseAdmin
    .from('evidence')
    .select('content_hash')
    .eq('project_id', projectId)
    .in('content_hash', contentHashes);

  const existingHashes = new Set((existing || []).map(e => e.content_hash));
  const newRecords = evidenceRecords.filter(r => !existingHashes.has(r.content_hash));

  console.log(`[githubSync] Filtered ${newRecords.length} new commits (${existingHashes.size} duplicates)`);

  if (newRecords.length === 0) {
    return [];
  }

  // Bulk insert only new records
  const { data: inserted, error } = await supabaseAdmin
    .from('evidence')
    .insert(newRecords)
    .select('id');

  if (error) {
    console.error('[githubSync] Bulk insert error:', error);
    throw error;
  }

  return inserted || [];
}

/**
 * Inserts filtered pull requests as evidence items
 * @param {Array} prs - Filtered pull request objects
 * @param {string} projectId - Project UUID
 * @param {string} repoOwner - Repository owner
 * @param {string} repoName - Repository name
 * @returns {Promise<Array>} Inserted evidence records
 */
export async function bulkInsertPullRequests(prs, projectId, repoOwner, repoName) {
  if (prs.length === 0) return [];

  // Transform PRs to evidence format
  const evidenceRecords = prs.map(pr => {
    const title = pr.title || '';
    const body = pr.body || '';
    const content = `${title}\n\n${body}`.trim();
    const authorEmail = pr.user?.email || `${pr.user?.login}@github.com`;

    // Generate content hash for staleness detection (include PR number to distinguish from commits)
    const contentHash = crypto
      .createHash('sha256')
      .update(content + 'pr' + pr.number)
      .digest('hex');

    return {
      project_id: projectId,
      author_email: authorEmail,
      content: content,
      source: 'note', // Use 'note' source type (valid: 'note', 'email', 'upload')
      meta: {
        type: 'pr',
        pr_number: pr.number,
        pr_url: pr.html_url,
        repo: `${repoOwner}/${repoName}`,
        state: pr.state,
        merged: pr.merged_at ? true : false,
        merged_at: pr.merged_at,
        files_changed: pr.changed_files || 0,
        additions: pr.additions || 0,
        deletions: pr.deletions || 0,
        pr_created_at: pr.created_at
      },
      content_hash: contentHash,
      created_at: pr.created_at // Use PR creation date
    };
  });

  // Check for existing PRs by content_hash to avoid duplicates
  const contentHashes = evidenceRecords.map(r => r.content_hash);
  const { data: existing } = await supabaseAdmin
    .from('evidence')
    .select('content_hash')
    .eq('project_id', projectId)
    .in('content_hash', contentHashes);

  const existingHashes = new Set((existing || []).map(e => e.content_hash));
  const newRecords = evidenceRecords.filter(r => !existingHashes.has(r.content_hash));

  console.log(`[githubSync] Filtered ${newRecords.length} new PRs (${existingHashes.size} duplicates)`);

  if (newRecords.length === 0) {
    return [];
  }

  // Bulk insert only new records
  const { data: inserted, error } = await supabaseAdmin
    .from('evidence')
    .insert(newRecords)
    .select('id');

  if (error) {
    console.error('[githubSync] PR bulk insert error:', error);
    throw error;
  }

  return inserted || [];
}

/**
 * Triggers auto-classification and auto-linking for new evidence
 * @param {Array} evidenceIds - Array of evidence UUIDs
 * @param {string} projectId - Project UUID
 */
export async function triggerAutoProcessing(evidenceIds, projectId) {
  if (evidenceIds.length === 0) return;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Trigger auto-linking in background (fire-and-forget)
  fetch(`${baseUrl}/api/evidence/auto-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_id: projectId,
      evidence_ids: evidenceIds
    })
  }).catch(err => console.error('[githubSync] Auto-link trigger failed:', err.message));
}

/**
 * Main sync function - syncs commits AND pull requests
 * @param {string} projectId - Project UUID
 * @param {string} repoOwner - Repository owner
 * @param {string} repoName - Repository name
 * @param {string} accessToken - GitHub access token
 * @returns {Promise<Object>} Sync results {synced: number, skipped: number}
 */
export async function syncGitHubData(projectId, repoOwner, repoName, accessToken) {
  console.log(`[githubSync] Starting sync for ${repoOwner}/${repoName}, project: ${projectId}`);

  // 1. Fetch last sync info
  const { data: repoRecord } = await supabaseAdmin
    .from('github_repos')
    .select('last_synced_at, last_synced_sha')
    .eq('project_id', projectId)
    .eq('repo_owner', repoOwner)
    .eq('repo_name', repoName)
    .single();

  // Default to 30 days ago if never synced
  const since = repoRecord?.last_synced_at ||
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  let totalSynced = 0;
  let totalSkipped = 0;
  const allReasons = {};

  // 2. Sync commits
  console.log(`[githubSync] Fetching commits since: ${since} (${repoRecord?.last_synced_at ? 'last sync' : 'default 30 days'})`);

  const commits = await fetchGitHubCommits({
    owner: repoOwner,
    repo: repoName,
    since,
    token: accessToken
  });

  console.log(`[githubSync] Fetched ${commits.length} commits from GitHub`);

  if (commits.length > 0) {
    const { filtered: filteredCommits, skipReasons: commitReasons } = preFilterCommits(commits);
    const insertedCommits = await bulkInsertEvidence(filteredCommits, projectId, repoOwner, repoName);

    totalSynced += insertedCommits.length;
    totalSkipped += (commits.length - insertedCommits.length);
    Object.assign(allReasons, commitReasons);

    // Track duplicates
    if (insertedCommits.length < filteredCommits.length) {
      allReasons.commit_duplicates = filteredCommits.length - insertedCommits.length;
    }

    // Trigger auto-processing
    await triggerAutoProcessing(insertedCommits.map(e => e.id), projectId);

    console.log(`[githubSync] Commits: ${insertedCommits.length} inserted, ${commits.length - insertedCommits.length} skipped`);
  }

  // 3. Sync pull requests
  console.log(`[githubSync] Fetching pull requests since: ${since}`);

  const prs = await fetchGitHubPullRequests({
    owner: repoOwner,
    repo: repoName,
    since,
    token: accessToken
  });

  console.log(`[githubSync] Fetched ${prs.length} pull requests from GitHub`);

  if (prs.length > 0) {
    const { filtered: filteredPRs, skipReasons: prReasons } = preFilterPullRequests(prs);
    const insertedPRs = await bulkInsertPullRequests(filteredPRs, projectId, repoOwner, repoName);

    totalSynced += insertedPRs.length;
    totalSkipped += (prs.length - insertedPRs.length);

    // Prefix PR reasons to distinguish from commit reasons
    Object.keys(prReasons).forEach(key => {
      allReasons[`pr_${key}`] = prReasons[key];
    });

    // Track duplicates
    if (insertedPRs.length < filteredPRs.length) {
      allReasons.pr_duplicates = filteredPRs.length - insertedPRs.length;
    }

    // Trigger auto-processing
    await triggerAutoProcessing(insertedPRs.map(e => e.id), projectId);

    console.log(`[githubSync] PRs: ${insertedPRs.length} inserted, ${prs.length - insertedPRs.length} skipped`);
  }

  // 4. Update last sync timestamp and SHA
  const latestCommitSha = commits[0]?.sha;
  await supabaseAdmin
    .from('github_repos')
    .update({
      last_synced_at: new Date().toISOString(),
      last_synced_sha: latestCommitSha
    })
    .eq('project_id', projectId)
    .eq('repo_owner', repoOwner)
    .eq('repo_name', repoName);

  console.log(`[githubSync] Sync complete: ${totalSynced} total synced, ${totalSkipped} total skipped`);
  console.log(`[githubSync] Skip breakdown:`, JSON.stringify(allReasons, null, 2));

  return {
    synced: totalSynced,
    skipped: totalSkipped,
    reasons: allReasons
  };
}

// Backwards compatibility alias
export const syncCommits = syncGitHubData;
