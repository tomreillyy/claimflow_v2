/**
 * Server-side authentication and authorization utilities
 * Provides secure helpers for validating project access and user permissions
 */

import { supabaseAdmin } from './supabaseAdmin';
import crypto from 'crypto';

/**
 * Check if a user is a consultant for a project's owner
 *
 * @param {string} consultantUserId - The consultant's user ID
 * @param {string} ownerUserId - The project owner's user ID
 * @returns {Promise<boolean>}
 */
export async function isConsultantForOwner(consultantUserId, ownerUserId) {
  if (!consultantUserId || !ownerUserId) return false;

  // Check 1: Direct consultant-client link
  const { data } = await supabaseAdmin
    .from('consultant_clients')
    .select('id')
    .eq('consultant_user_id', consultantUserId)
    .eq('client_user_id', ownerUserId)
    .maybeSingle();

  if (data) return true;

  // Check 2: Team member assignment
  try {
    const [{ data: memberships }, { data: clientLinks }] = await Promise.all([
      supabaseAdmin
        .from('consultant_team_members')
        .select('id, lead_consultant_id')
        .eq('member_user_id', consultantUserId),
      supabaseAdmin
        .from('consultant_clients')
        .select('id, consultant_user_id')
        .eq('client_user_id', ownerUserId),
    ]);

    if (!memberships?.length || !clientLinks?.length) return false;

    const leadIds = new Set(memberships.map(m => m.lead_consultant_id));
    const matchingClientLinks = clientLinks.filter(cl => leadIds.has(cl.consultant_user_id));
    if (!matchingClientLinks.length) return false;

    const memberIds = memberships.map(m => m.id);
    const matchingClientLinkIds = matchingClientLinks.map(cl => cl.id);

    const { count } = await supabaseAdmin
      .from('consultant_team_assignments')
      .select('id', { count: 'exact', head: true })
      .in('team_member_id', memberIds)
      .in('consultant_client_id', matchingClientLinkIds);

    return (count || 0) > 0;
  } catch (e) {
    // Tables may not exist yet
    return false;
  }
}

/**
 * Verify that a user (by email) has access to a project via token
 * Returns the project if authorized, null otherwise
 *
 * @param {string} token - Project token
 * @param {string} userEmail - User's email address
 * @param {string} [userId] - User's ID (optional, enables consultant access check)
 * @returns {Promise<{project: Object|null, error: string|null}>}
 */
export async function verifyProjectAccess(token, userEmail, userId = null) {
  if (!token || !userEmail) {
    return { project: null, error: 'Missing token or user email' };
  }

  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .select('id, owner_id, participants, name, project_token')
    .eq('project_token', token)
    .is('deleted_at', null)
    .single();

  if (error || !project) {
    return { project: null, error: 'Project not found' };
  }

  // Check if user is owner
  if (userId && project.owner_id === userId) {
    return { project, error: null };
  }

  // Check if user is a participant
  const participants = project.participants || [];
  if (participants.includes(userEmail)) {
    return { project, error: null };
  }

  // Check if user is a consultant for the project's owner
  if (userId) {
    const isConsultant = await isConsultantForOwner(userId, project.owner_id);
    if (isConsultant) {
      return { project, error: null };
    }
  }

  return { project: null, error: 'User not authorized for this project' };
}

/**
 * Get authenticated user from request
 * Validates the Bearer token and returns user info
 *
 * @param {Request} req - The request object
 * @returns {Promise<{user: Object|null, error: string|null}>}
 */
export async function getAuthenticatedUser(req) {
  const authHeader = req.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Missing or invalid authorization header' };
  }

  const token = authHeader.split('Bearer ')[1];

  // Verify the token with Supabase
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return { user: null, error: 'Invalid or expired token' };
  }

  return { user, error: null };
}

/**
 * Verify user has access to a project and return both user and project
 * Combines authentication and authorization in one call
 *
 * @param {Request} req - The request object
 * @param {string} projectToken - Project token
 * @returns {Promise<{user: Object|null, project: Object|null, error: string|null}>}
 */
export async function verifyUserAndProjectAccess(req, projectToken) {
  // First, authenticate the user
  const { user, error: authError } = await getAuthenticatedUser(req);

  if (authError || !user) {
    return { user: null, project: null, error: authError || 'Authentication failed' };
  }

  // Then, verify they have access to the project (pass user.id for consultant check)
  const { project, error: projectError } = await verifyProjectAccess(projectToken, user.email, user.id);

  if (projectError || !project) {
    return { user, project: null, error: projectError || 'Project access denied' };
  }

  return { user, project, error: null };
}

/**
 * Get GitHub access token for a project
 * Checks user-level token first, falls back to legacy per-project token
 *
 * @param {string} userId - The authenticated user's ID
 * @param {string} projectId - The project's ID
 * @returns {Promise<{accessToken: string|null, error: string|null}>}
 */
export async function getGitHubToken(userId, projectId) {
  // Try user-level token first
  if (userId) {
    const { data: userToken } = await supabaseAdmin
      .from('user_github_tokens')
      .select('access_token')
      .eq('user_id', userId)
      .maybeSingle();

    if (userToken?.access_token) {
      return { accessToken: userToken.access_token, error: null };
    }
  }

  // Fall back to legacy per-project token
  if (projectId) {
    const { data: projectToken } = await supabaseAdmin
      .from('project_github_tokens')
      .select('access_token')
      .eq('project_id', projectId)
      .maybeSingle();

    if (projectToken?.access_token) {
      return { accessToken: projectToken.access_token, error: null };
    }
  }

  return { accessToken: null, error: 'GitHub not connected. Please connect GitHub first.' };
}

/**
 * Get Jira access token for a user, refreshing if expired
 * Jira tokens expire every hour, so this handles transparent refresh
 *
 * @param {string} userId - The authenticated user's ID
 * @returns {Promise<{accessToken: string|null, cloudId: string|null, siteUrl: string|null, error: string|null}>}
 */
export async function getJiraToken(userId) {
  if (!userId) {
    return { accessToken: null, cloudId: null, siteUrl: null, error: 'No user ID provided' };
  }

  const { data: tokenRow } = await supabaseAdmin
    .from('user_jira_tokens')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!tokenRow) {
    return { accessToken: null, cloudId: null, siteUrl: null, error: 'Jira not connected. Please connect Jira first.' };
  }

  // Check if token is still valid (5 minute buffer)
  const expiresAt = new Date(tokenRow.token_expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000;

  if (expiresAt.getTime() - now.getTime() > bufferMs) {
    return {
      accessToken: tokenRow.access_token,
      cloudId: tokenRow.cloud_id,
      siteUrl: tokenRow.site_url,
      error: null
    };
  }

  // Token expired or expiring soon — refresh it
  const clientId = process.env.JIRA_CLIENT_ID;
  const clientSecret = process.env.JIRA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return { accessToken: null, cloudId: null, siteUrl: null, error: 'Jira OAuth not configured on server' };
  }

  try {
    const refreshResponse = await fetch('https://auth.atlassian.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: tokenRow.refresh_token
      })
    });

    if (!refreshResponse.ok) {
      const errText = await refreshResponse.text();
      console.error('[Jira Auth] Token refresh failed:', refreshResponse.status, errText);
      return { accessToken: null, cloudId: null, siteUrl: null, error: 'Jira token refresh failed. Please reconnect Jira.' };
    }

    const refreshData = await refreshResponse.json();
    const newExpiresAt = new Date(Date.now() + (refreshData.expires_in || 3600) * 1000).toISOString();

    // Update stored tokens
    await supabaseAdmin
      .from('user_jira_tokens')
      .update({
        access_token: refreshData.access_token,
        refresh_token: refreshData.refresh_token || tokenRow.refresh_token,
        token_expires_at: newExpiresAt,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    return {
      accessToken: refreshData.access_token,
      cloudId: tokenRow.cloud_id,
      siteUrl: tokenRow.site_url,
      error: null
    };
  } catch (err) {
    console.error('[Jira Auth] Token refresh error:', err);
    return { accessToken: null, cloudId: null, siteUrl: null, error: 'Failed to refresh Jira token' };
  }
}

/**
 * Verify SendGrid webhook signature
 * Protects against forged webhook requests
 *
 * @param {Request} req - The request object
 * @param {string} payload - Raw request body
 * @returns {boolean} - True if signature is valid
 */
export function verifyWebhookSignature(req, payload) {
  const SENDGRID_WEBHOOK_SECRET = process.env.SENDGRID_WEBHOOK_SECRET;

  if (!SENDGRID_WEBHOOK_SECRET) {
    console.error('[Auth] SENDGRID_WEBHOOK_SECRET not configured');
    return false;
  }

  const signature = req.headers.get('x-twilio-email-event-webhook-signature');
  const timestamp = req.headers.get('x-twilio-email-event-webhook-timestamp');

  if (!signature || !timestamp) {
    console.error('[Auth] Missing webhook signature or timestamp');
    return false;
  }

  // Verify timestamp is recent (within 10 minutes)
  const currentTime = Math.floor(Date.now() / 1000);
  const requestTime = parseInt(timestamp, 10);

  if (Math.abs(currentTime - requestTime) > 600) {
    console.error('[Auth] Webhook timestamp too old or in future');
    return false;
  }

  // Compute expected signature: HMAC-SHA256(timestamp + payload, secret)
  const data = timestamp + payload;
  const expectedSignature = crypto
    .createHmac('sha256', SENDGRID_WEBHOOK_SECRET)
    .update(data)
    .digest('base64');

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Verify cron secret for protected endpoints
 * Prevents unauthorized triggering of expensive operations
 *
 * @param {Request} req - The request object
 * @returns {boolean} - True if authorized
 */
export function verifyCronSecret(req) {
  const CRON_SECRET = process.env.CRON_SECRET;

  if (!CRON_SECRET) {
    console.error('[Auth] CRON_SECRET not configured - cron endpoints are unprotected!');
    // In production, fail closed - require the secret
    if (process.env.NODE_ENV === 'production') {
      return false;
    }
    // In development, warn but allow
    console.warn('[Auth] Allowing cron request in development mode without secret');
    return true;
  }

  const authHeader = req.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  // Constant-time comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(CRON_SECRET)
    );
  } catch {
    // Lengths don't match
    return false;
  }
}

/**
 * Validate file upload
 * Checks file size, type, and magic bytes
 *
 * @param {File} file - The uploaded file
 * @param {Object} options - Validation options
 * @param {number} options.maxSizeMB - Maximum file size in MB (default: 10)
 * @param {string[]} options.allowedMimeTypes - Allowed MIME types
 * @param {boolean} options.checkMagicBytes - Verify magic bytes (default: true)
 * @returns {Promise<{valid: boolean, error: string|null}>}
 */
export async function validateFileUpload(file, options = {}) {
  const {
    maxSizeMB = 10,
    allowedMimeTypes = [],
    checkMagicBytes = true
  } = options;

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxSizeMB}MB`
    };
  }

  // Check MIME type
  if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`
    };
  }

  // Check magic bytes to prevent MIME type spoofing
  if (checkMagicBytes && allowedMimeTypes.length > 0) {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer.slice(0, 12));

    const isValid = verifyMagicBytes(bytes, file.type);
    if (!isValid) {
      return {
        valid: false,
        error: 'File content does not match declared type'
      };
    }
  }

  return { valid: true, error: null };
}

/**
 * Verify file magic bytes match declared MIME type
 *
 * @param {Uint8Array} bytes - First bytes of the file
 * @param {string} mimeType - Declared MIME type
 * @returns {boolean}
 */
function verifyMagicBytes(bytes, mimeType) {
  // Common magic byte signatures
  const signatures = {
    'image/png': [0x89, 0x50, 0x4E, 0x47],
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    'image/gif': [0x47, 0x49, 0x46],
    'application/pdf': [0x25, 0x50, 0x44, 0x46],
    'application/zip': [0x50, 0x4B, 0x03, 0x04],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [0x50, 0x4B, 0x03, 0x04], // XLSX
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [0x50, 0x4B, 0x03, 0x04], // DOCX
    'text/csv': null, // CSV has no magic bytes, skip check
    'text/plain': null,
  };

  const expectedSignature = signatures[mimeType];

  // If no signature defined, skip verification (e.g., for text files)
  if (expectedSignature === null || expectedSignature === undefined) {
    return true;
  }

  // Check if file starts with expected bytes
  for (let i = 0; i < expectedSignature.length; i++) {
    if (bytes[i] !== expectedSignature[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Sanitize filename to prevent path traversal attacks
 *
 * @param {string} filename - Original filename
 * @param {number} maxLength - Maximum length (default: 255)
 * @returns {string} - Sanitized filename
 */
export function sanitizeFilename(filename, maxLength = 255) {
  if (!filename) return `file_${Date.now()}`;

  // Remove path separators and special characters
  let sanitized = filename
    .replace(/[\/\\]/g, '') // Remove slashes
    .replace(/\.\./g, '') // Remove parent directory references
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
    .replace(/_{2,}/g, '_'); // Collapse multiple underscores

  // Ensure it doesn't start with a dot (hidden file)
  if (sanitized.startsWith('.')) {
    sanitized = sanitized.substring(1);
  }

  // Truncate to max length
  if (sanitized.length > maxLength) {
    const ext = sanitized.substring(sanitized.lastIndexOf('.'));
    const name = sanitized.substring(0, maxLength - ext.length);
    sanitized = name + ext;
  }

  return sanitized || `file_${Date.now()}`;
}

/**
 * Rate limit check (simple in-memory implementation)
 * For production, use Redis or similar
 *
 * @param {string} key - Unique identifier (e.g., IP address, user ID)
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} - True if request should be allowed
 */
const rateLimitStore = new Map();

export function checkRateLimit(key, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (now > record.resetTime) {
    // Window expired, reset
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false; // Rate limit exceeded
  }

  record.count++;
  return true;
}

// Cleanup old rate limit entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Generate a signed URL for private storage bucket access
 *
 * @param {string} storagePath - Path in storage bucket (e.g., "project-id/filename.pdf")
 * @param {string} bucket - Bucket name (default: "evidence")
 * @param {number} expiresIn - URL expiry in seconds (default: 3600 = 1 hour)
 * @returns {Promise<{signedUrl: string|null, error: string|null}>}
 */
export async function getSignedStorageUrl(storagePath, bucket = 'evidence', expiresIn = 3600) {
  if (!storagePath) {
    return { signedUrl: null, error: 'Storage path is required' };
  }

  try {
    const { data, error } = await supabaseAdmin
      .storage
      .from(bucket)
      .createSignedUrl(storagePath, expiresIn);

    if (error) {
      console.error(`[Storage] Failed to create signed URL for ${storagePath}:`, error);
      return { signedUrl: null, error: error.message };
    }

    return { signedUrl: data.signedUrl, error: null };
  } catch (err) {
    console.error(`[Storage] Exception creating signed URL for ${storagePath}:`, err);
    return { signedUrl: null, error: 'Failed to generate signed URL' };
  }
}

/**
 * Extract storage path from full URL or return as-is if already a path
 * Handles both public URLs and storage paths
 *
 * @param {string} urlOrPath - Full URL or storage path
 * @returns {string} - Storage path
 */
/**
 * Check if a user has an active subscription
 *
 * @param {string} userId - The user's ID
 * @returns {Promise<boolean>} - True if user has active subscription
 */
export async function checkSubscriptionStatus(userId) {
  if (!userId) return false;

  try {
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', userId)
      .single();

    if (!subscription) return false;

    const isActive = subscription.status === 'active' &&
      new Date(subscription.current_period_end) > new Date();

    return isActive;
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
}

export function extractStoragePath(urlOrPath) {
  if (!urlOrPath) return null;

  // If it's already a path (no protocol), return as-is
  if (!urlOrPath.startsWith('http')) {
    return urlOrPath;
  }

  // Extract path from URL
  // Example: https://xxx.supabase.co/storage/v1/object/public/evidence/project-id/file.pdf
  // -> project-id/file.pdf
  try {
    const url = new URL(urlOrPath);
    const pathParts = url.pathname.split('/');

    // Find the bucket name and everything after it
    const bucketIndex = pathParts.findIndex((part, idx) =>
      part === 'evidence' || part === 'payroll'
    );

    if (bucketIndex !== -1) {
      return pathParts.slice(bucketIndex + 1).join('/');
    }

    // Fallback: take everything after /object/public/ or /object/sign/
    const publicIndex = pathParts.indexOf('public');
    const signIndex = pathParts.indexOf('sign');
    const startIndex = Math.max(publicIndex, signIndex);

    if (startIndex !== -1 && startIndex + 2 < pathParts.length) {
      // Skip bucket name, return path
      return pathParts.slice(startIndex + 2).join('/');
    }

    return null;
  } catch (err) {
    console.error('[Storage] Failed to parse URL:', err);
    return null;
  }
}
