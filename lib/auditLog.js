/**
 * Audit logging helper for tracking data access and modifications.
 * Logs are written to the audit_log table via supabaseAdmin (bypasses RLS).
 *
 * Usage:
 *   import { logAudit } from '@/lib/auditLog';
 *   await logAudit(req, {
 *     action: 'costs.export',
 *     resourceType: 'cost_ledger',
 *     resourceId: project.id,
 *     projectId: project.id,
 *     userId: user.id,
 *     userEmail: user.email,
 *     metadata: { format: 'csv', rows: 150 },
 *   });
 */

import { supabaseAdmin } from './supabaseAdmin';

/**
 * Write an audit log entry. Fire-and-forget — never throws.
 *
 * @param {Request|null} req - The HTTP request (for IP/UA extraction). Null for background jobs.
 * @param {Object} opts
 * @param {string} opts.action - Dot-namespaced action (e.g. 'project.view', 'evidence.delete')
 * @param {string} opts.resourceType - The type of resource (e.g. 'project', 'evidence')
 * @param {string} [opts.resourceId] - ID of the specific resource
 * @param {string} [opts.projectId] - Associated project ID
 * @param {string} [opts.userId] - Acting user's ID
 * @param {string} [opts.userEmail] - Acting user's email
 * @param {Object} [opts.metadata] - Additional context
 * @param {'info'|'warning'|'critical'} [opts.severity='info']
 */
export async function logAudit(req, opts) {
  try {
    const {
      action,
      resourceType,
      resourceId = null,
      projectId = null,
      userId = null,
      userEmail = null,
      metadata = {},
      severity = 'info',
    } = opts;

    // Extract IP and User-Agent from request
    let ipAddress = null;
    let userAgent = null;

    if (req) {
      ipAddress =
        req.headers?.get?.('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers?.get?.('x-real-ip') ||
        null;
      userAgent = req.headers?.get?.('user-agent') || null;
    }

    await supabaseAdmin.from('audit_log').insert({
      user_id: userId,
      user_email: userEmail,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      project_id: projectId,
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata,
      severity,
    });
  } catch (error) {
    // Never let audit logging break the request
    console.error('[AuditLog] Failed to write audit entry:', error.message);
  }
}
