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

    console.log(`[githubSync] ✓ Keeping commit: "${message.substring(0, 60)}..." by ${authorEmail}`);
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
      source: 'github',
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

  // Bulk insert with deduplication (skip if SHA already exists)
  const { data: inserted, error } = await supabaseAdmin
    .from('evidence')
    .upsert(evidenceRecords, {
      onConflict: 'content_hash',
      ignoreDuplicates: true
    })
    .select('id');

  if (error) {
    console.error('[githubSync] Bulk insert error:', error);
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
 * Main sync function - orchestrates the entire sync process
 * @param {string} projectId - Project UUID
 * @param {string} repoOwner - Repository owner
 * @param {string} repoName - Repository name
 * @param {string} accessToken - GitHub access token
 * @returns {Promise<Object>} Sync results {synced: number, skipped: number}
 */
export async function syncCommits(projectId, repoOwner, repoName, accessToken) {
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

  console.log(`[githubSync] Fetching commits since: ${since} (${repoRecord?.last_synced_at ? 'last sync' : 'default 30 days'})`);

  // 2. Fetch commits from GitHub
  const commits = await fetchGitHubCommits({
    owner: repoOwner,
    repo: repoName,
    since,
    token: accessToken
  });

  console.log(`[githubSync] Fetched ${commits.length} commits from GitHub`);

  if (commits.length === 0) {
    console.log(`[githubSync] No commits found in date range`);
    return { synced: 0, skipped: 0, reasons: {} };
  }

  // 3. Pre-filter commits
  const { filtered, skipReasons } = preFilterCommits(commits);
  const skipped = commits.length - filtered.length;

  console.log(`[githubSync] Filter results: ${filtered.length} kept, ${skipped} skipped`);
  console.log(`[githubSync] Skip breakdown:`, JSON.stringify(skipReasons, null, 2));

  // 4. Insert as evidence
  const inserted = await bulkInsertEvidence(filtered, projectId, repoOwner, repoName);

  console.log(`[githubSync] Inserted ${inserted.length} commits as evidence (${filtered.length - inserted.length} duplicates)`);

  // Track duplicates
  if (inserted.length < filtered.length) {
    skipReasons.duplicate = filtered.length - inserted.length;
  }

  // 5. Update last sync timestamp and SHA
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

  // 6. Trigger background processing
  await triggerAutoProcessing(inserted.map(e => e.id), projectId);

  console.log(`[githubSync] Sync complete: ${inserted.length} synced, ${skipped + (filtered.length - inserted.length)} skipped`);

  return {
    synced: inserted.length,
    skipped: skipped + (filtered.length - inserted.length),
    reasons: skipReasons
  };
}
