// lib/jiraSync.js
// Jira issue sync utility functions (mirrors lib/githubSync.js)

import { supabaseAdmin } from './supabaseAdmin';
import { getJiraToken } from './serverAuth';
import crypto from 'crypto';

/**
 * Make an authenticated Jira API request
 */
async function jiraApiRequest(cloudId, accessToken, path, params = {}, { method = 'GET', body = null } = {}) {
  const url = new URL(`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3${path}`);
  if (method === 'GET') {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  }

  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    }
  };

  if (body) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url.toString(), options);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[jiraSync] Jira API error: ${response.status} - ${errorText}`);
    throw new Error(`Jira API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Convert Atlassian Document Format (ADF) to plain text
 * ADF is a nested JSON structure used for Jira issue descriptions
 */
export function adfToPlainText(node) {
  if (!node) return '';

  // String content (leaf node)
  if (typeof node === 'string') return node;

  // Text node
  if (node.type === 'text') return node.text || '';

  // Nodes with content array (paragraph, heading, listItem, etc.)
  let text = '';

  if (Array.isArray(node.content)) {
    text = node.content.map(child => adfToPlainText(child)).join('');
  }

  // Add appropriate spacing based on node type
  switch (node.type) {
    case 'paragraph':
    case 'heading':
    case 'blockquote':
    case 'rule':
      return text + '\n';
    case 'hardBreak':
      return '\n';
    case 'listItem':
      return '- ' + text + '\n';
    case 'bulletList':
    case 'orderedList':
      return text;
    case 'codeBlock':
      return text + '\n';
    case 'table':
    case 'tableRow':
    case 'tableCell':
    case 'tableHeader':
      return text + ' ';
    case 'mediaGroup':
    case 'mediaSingle':
    case 'media':
      return ''; // Skip media nodes
    case 'doc':
      return text;
    default:
      return text;
  }
}

/**
 * Extract comments text from Jira comment response
 */
function extractCommentsText(commentField) {
  if (!commentField || !commentField.comments) return '';

  return commentField.comments
    .map(comment => {
      const author = comment.author?.displayName || 'Unknown';
      const body = adfToPlainText(comment.body);
      return `[${author}]: ${body}`;
    })
    .join('\n')
    .trim();
}

/**
 * Check if text shows R&D signals (zero AI cost)
 * Extended version of isLikelyRD from githubSync.js for Jira
 */
function isLikelyRD(content) {
  if (!content || content.length < 15) return false;

  const lower = content.toLowerCase();

  // Noise patterns (auto-discard)
  const noisePatterns = [
    'fix typo', 'update readme', 'bump version', 'dependency update',
    'chore:', 'docs:', 'style:', 'housekeeping', 'cleanup',
    'update dependencies', 'maintenance', 'formatting'
  ];

  if (noisePatterns.some(pattern => lower.includes(pattern))) {
    return false;
  }

  // R&D signal keywords (extended for Jira)
  const rdKeywords = [
    'perf', 'performance', 'optimize', 'benchmark', 'latency', 'throughput',
    'attempt', 'experiment', 'test', 'investigate', 'prototype', 'spike',
    'reduce', 'improve', 'faster', 'slower', 'measure', 'metric',
    'hypothesis', 'trial', 'evaluate', 'compare', 'alternative',
    'research', 'poc', 'proof of concept', 'investigation', 'feasibility',
    'algorithm', 'architecture', 'scalability', 'novel', 'uncertain',
    'approach', 'technical debt', 'refactor', 'redesign', 'migration',
    'integrate', 'api', 'infrastructure', 'security', 'reliability'
  ];

  if (rdKeywords.some(keyword => lower.includes(keyword))) {
    return true;
  }

  // Check for metrics (numbers with units)
  if (/\d+(\.\d+)?\s?(ms|sec|s|MB|KB|GB|%|x|times)/.test(content)) {
    return true;
  }

  // Jira-specific: Epic/Story with substantial description likely R&D
  if (content.length > 200) {
    return true;
  }

  return false;
}

/**
 * Check if content matches any of the given keywords (case-insensitive)
 */
function matchesKeywords(text, keywords) {
  if (!keywords || keywords.length === 0) return true;
  if (!text) return false;
  const lower = text.toLowerCase();
  return keywords.some(kw => lower.includes(kw.toLowerCase()));
}

/**
 * Fetch Jira issues using JQL with pagination
 */
export async function fetchJiraIssues({ cloudId, accessToken, projectKeys, jqlFilter, since, filterIssueTypes }) {
  // Build JQL query
  let jql = '';

  if (jqlFilter) {
    // Custom JQL takes priority
    jql = jqlFilter;
  } else if (projectKeys && projectKeys.length > 0) {
    jql = `project in (${projectKeys.join(', ')})`;
  } else {
    throw new Error('Either projectKeys or jqlFilter must be provided');
  }

  // Add date filter for incremental sync
  if (since) {
    const sinceDate = new Date(since).toISOString().split('T')[0]; // YYYY-MM-DD
    jql += ` AND updated >= "${sinceDate}"`;
  }

  // Add issue type filter
  if (filterIssueTypes && filterIssueTypes.length > 0) {
    jql += ` AND issuetype in (${filterIssueTypes.map(t => `"${t}"`).join(', ')})`;
  }

  jql += ' ORDER BY updated DESC';

  console.log(`[jiraSync] JQL query: ${jql}`);

  const fieldsList = [
    'summary', 'description', 'issuetype', 'status', 'priority',
    'assignee', 'labels', 'components', 'created', 'updated',
    'resolutiondate', 'comment', 'customfield_10016' // story points
  ];

  const allIssues = [];
  let nextPageToken = null;
  const maxResults = 50;
  const maxTotal = 1000; // Cap to prevent runaway syncs

  while (allIssues.length < maxTotal) {
    const requestBody = {
      jql,
      fields: fieldsList,
      maxResults
    };
    if (nextPageToken) {
      requestBody.nextPageToken = nextPageToken;
    }

    const data = await jiraApiRequest(cloudId, accessToken, '/search/jql', {}, {
      method: 'POST',
      body: requestBody
    });

    if (!data.issues || data.issues.length === 0) break;

    allIssues.push(...data.issues);
    console.log(`[jiraSync] Fetched ${data.issues.length} issues (total: ${allIssues.length})`);

    // New API uses nextPageToken instead of startAt
    if (!data.nextPageToken) break;
    nextPageToken = data.nextPageToken;
  }

  console.log(`[jiraSync] Total issues fetched: ${allIssues.length}`);
  return allIssues;
}

/**
 * Pre-filter Jira issues to remove noise and non-R&D work
 */
export function preFilterJiraIssues(issues, filterKeywords) {
  const skipReasons = {
    keyword_filtered: 0,
    not_rd: 0,
    too_short: 0
  };

  const filtered = issues.filter(issue => {
    const summary = issue.fields?.summary || '';
    const description = adfToPlainText(issue.fields?.description);
    const combined = `${summary} ${description}`;

    // Apply custom keyword filter
    if (filterKeywords && filterKeywords.length > 0) {
      if (!matchesKeywords(combined, filterKeywords)) {
        skipReasons.keyword_filtered++;
        return false;
      }
    }

    // Minimum content length
    if (combined.trim().length < 20) {
      skipReasons.too_short++;
      return false;
    }

    // R&D relevance check
    if (!isLikelyRD(combined)) {
      skipReasons.not_rd++;
      return false;
    }

    return true;
  });

  console.log(`[jiraSync] Pre-filter: ${filtered.length}/${issues.length} passed. Rejected:`, skipReasons);
  return { filtered, skipReasons };
}

/**
 * Transform Jira API issue to our cached format and upsert
 */
export async function cacheJiraIssues(issues, projectId) {
  if (issues.length === 0) return [];

  const records = issues.map(issue => {
    const fields = issue.fields || {};
    const description = adfToPlainText(fields.description);
    const commentsText = extractCommentsText(fields.comment);

    // Generate content hash for change detection
    const contentHash = crypto
      .createHash('sha256')
      .update((fields.summary || '') + (description || '') + (commentsText || ''))
      .digest('hex');

    return {
      project_id: projectId,
      jira_key: issue.key,
      jira_id: issue.id,
      summary: fields.summary || '',
      description: description || null,
      issue_type: fields.issuetype?.name || null,
      status: fields.status?.name || null,
      priority: fields.priority?.name || null,
      assignee_email: fields.assignee?.emailAddress || null,
      assignee_name: fields.assignee?.displayName || null,
      labels: fields.labels || [],
      components: (fields.components || []).map(c => c.name),
      sprint_name: null, // Sprint data requires separate API call
      story_points: fields.customfield_10016 || null,
      jira_created_at: fields.created || null,
      jira_updated_at: fields.updated || null,
      jira_resolved_at: fields.resolutiondate || null,
      comments_text: commentsText || null,
      content_hash: contentHash,
      fetched_at: new Date().toISOString()
    };
  });

  // Upsert in batches to avoid request size limits
  const batchSize = 50;
  const allUpserted = [];

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    const { data, error } = await supabaseAdmin
      .from('jira_issues')
      .upsert(batch, {
        onConflict: 'project_id,jira_key',
        ignoreDuplicates: false
      })
      .select('id, jira_key, content_hash');

    if (error) {
      console.error(`[jiraSync] Cache upsert error (batch ${i}):`, error);
      throw error;
    }

    allUpserted.push(...(data || []));
  }

  console.log(`[jiraSync] Cached ${allUpserted.length} issues`);
  return allUpserted;
}

/**
 * List available Jira projects for a user
 */
export async function listJiraProjects(cloudId, accessToken) {
  const projects = await jiraApiRequest(cloudId, accessToken, '/project', {
    orderBy: 'name',
    maxResults: 50
  });

  return (Array.isArray(projects) ? projects : []).map(p => ({
    key: p.key,
    name: p.name,
    projectTypeKey: p.projectTypeKey,
    avatarUrl: p.avatarUrls?.['24x24'] || null
  }));
}

/**
 * Main sync function — fetches, filters, and caches Jira issues
 */
export async function syncJiraIssues(projectId, userId) {
  console.log(`[jiraSync] Starting sync for project: ${projectId}`);

  // 1. Get Jira token (with refresh)
  const { accessToken, cloudId, siteUrl, error: tokenError } = await getJiraToken(userId);
  if (tokenError || !accessToken) {
    throw new Error(tokenError || 'Failed to get Jira token');
  }

  // 2. Get connection config
  const { data: connection } = await supabaseAdmin
    .from('jira_connections')
    .select('*')
    .eq('project_id', projectId)
    .single();

  if (!connection) {
    throw new Error('No Jira connection configured for this project');
  }

  // Update sync status
  await supabaseAdmin
    .from('jira_connections')
    .update({ sync_status: 'syncing', sync_error: null })
    .eq('id', connection.id);

  try {
    // 3. Determine since date (default 90 days if never synced)
    const since = connection.last_synced_at ||
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    // 4. Fetch issues from Jira API
    const issues = await fetchJiraIssues({
      cloudId,
      accessToken,
      projectKeys: connection.jira_project_keys,
      jqlFilter: connection.jql_filter,
      since,
      filterIssueTypes: connection.filter_issue_types
    });

    // 5. Apply keyword pre-filter
    const { filtered, skipReasons } = preFilterJiraIssues(issues, connection.filter_keywords);

    // 6. Cache filtered issues
    const cached = await cacheJiraIssues(filtered, projectId);

    // 7. Update last_synced_at and status
    await supabaseAdmin
      .from('jira_connections')
      .update({
        last_synced_at: new Date().toISOString(),
        sync_status: 'idle',
        sync_error: null
      })
      .eq('id', connection.id);

    const result = {
      fetched: issues.length,
      filtered: filtered.length,
      cached: cached.length,
      skipped: issues.length - filtered.length,
      reasons: skipReasons,
      siteUrl
    };

    console.log(`[jiraSync] Sync complete:`, result);
    return result;

  } catch (err) {
    // Update sync status on error
    await supabaseAdmin
      .from('jira_connections')
      .update({
        sync_status: 'error',
        sync_error: err.message
      })
      .eq('id', connection.id);

    throw err;
  }
}
