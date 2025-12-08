/**
 * Server-side authentication and authorization utilities
 * Provides secure helpers for validating project access and user permissions
 */

import { supabaseAdmin } from './supabaseAdmin';
import crypto from 'crypto';

/**
 * Verify that a user (by email) has access to a project via token
 * Returns the project if authorized, null otherwise
 *
 * @param {string} token - Project token
 * @param {string} userEmail - User's email address
 * @returns {Promise<{project: Object|null, error: string|null}>}
 */
export async function verifyProjectAccess(token, userEmail) {
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

  // Check if user is owner or participant
  const participants = project.participants || [];
  const isAuthorized = participants.includes(userEmail);

  if (!isAuthorized) {
    return { project: null, error: 'User not authorized for this project' };
  }

  return { project, error: null };
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

  // Then, verify they have access to the project
  const { project, error: projectError } = await verifyProjectAccess(projectToken, user.email);

  if (projectError || !project) {
    return { user, project: null, error: projectError || 'Project access denied' };
  }

  return { user, project, error: null };
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
