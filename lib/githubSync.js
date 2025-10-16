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

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${error}`);
  }

  return await response.json();
}

/**
 * Pre-filters commits to remove noise and non-R&D work
 * @param {Array} commits - Array of GitHub commit objects
 * @param {Array} participants - Project participant emails
 * @returns {Array} Filtered commits
 */
export function preFilterCommits(commits, participants) {
  // Patterns to skip (common non-R&D commits)
  const skipPatterns = [
    /^merge/i,
    /^bump|version/i,
    /^update dependencies/i,
    /^(format|lint|prettier|eslint)/i,
    /^(readme|docs?):/i,
    /^wip$/i,
    /^initial commit/i,
    /^\[skip\s*ci\]/i
  ];

  return commits.filter(commit => {
    const message = commit.commit.message.split('\n')[0]; // First line only
    const authorEmail = commit.commit.author.email.toLowerCase();

    // Skip if matches noise patterns
    if (skipPatterns.some(pattern => pattern.test(message))) {
      return false;
    }

    // Require minimum length (15 chars)
    if (message.length < 15) {
      return false;
    }

    // Only include commits from project participants
    const isParticipant = participants.some(
      p => p.toLowerCase() === authorEmail
    );

    return isParticipant;
  });
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
 * @param {Array} participants - Project participant emails
 * @returns {Promise<Object>} Sync results {synced: number, skipped: number}
 */
export async function syncCommits(projectId, repoOwner, repoName, accessToken, participants) {
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

  // 2. Fetch commits from GitHub
  const commits = await fetchGitHubCommits({
    owner: repoOwner,
    repo: repoName,
    since,
    token: accessToken
  });

  if (commits.length === 0) {
    return { synced: 0, skipped: 0 };
  }

  // 3. Pre-filter commits
  const filtered = preFilterCommits(commits, participants);
  const skipped = commits.length - filtered.length;

  // 4. Insert as evidence
  const inserted = await bulkInsertEvidence(filtered, projectId, repoOwner, repoName);

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

  return {
    synced: inserted.length,
    skipped
  };
}
