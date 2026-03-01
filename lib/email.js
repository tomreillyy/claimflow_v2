/**
 * Email utility using Mailjet API v3.1
 * Requires MAILJET_API_KEY and MAILJET_SECRET_KEY env vars
 */

import { supabaseAdmin } from './supabaseAdmin';

/**
 * Get the production app URL — never returns localhost
 */
export function getAppUrl() {
  const candidates = [
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_BASE,
  ];
  for (const url of candidates) {
    if (url && !url.includes('localhost') && !url.includes('127.0.0.1')) {
      return url.replace(/\/$/, '');
    }
  }
  return 'https://www.getclaimflow.com';
}

/**
 * Generate a Supabase magic link for one-click login.
 * Returns the action_link URL, or null if it fails (e.g. user doesn't exist).
 *
 * @param {string} email - Recipient email
 * @param {string} [redirectPath] - Path to redirect after login (e.g. '/consultant')
 * @returns {Promise<string|null>}
 */
export async function generateMagicLink(email, redirectPath = '/') {
  try {
    const redirectTo = `${getAppUrl()}${redirectPath}`;
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo },
    });
    if (error || !data?.properties?.action_link) return null;
    return data.properties.action_link;
  } catch {
    return null;
  }
}

/**
 * Wrap email text content in a branded HTML template
 */
function brandedHtml(textContent, { ctaUrl, ctaLabel } = {}) {
  // Convert plain text lines to HTML paragraphs
  const paragraphs = textContent
    .split('\n')
    .map(line => {
      if (line.trim() === '') return '';
      return `<p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.6;">${line}</p>`;
    })
    .join('\n');

  const ctaBlock = ctaUrl ? `
    <div style="margin:28px 0 12px;">
      <a href="${ctaUrl}" style="display:inline-block;padding:12px 28px;background-color:#021048;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;font-family:system-ui,-apple-system,sans-serif;">
        ${ctaLabel || 'Log in to ClaimFlow'}
      </a>
    </div>` : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 16px;">
    <!-- Header -->
    <div style="background-color:#021048;border-radius:12px 12px 0 0;padding:28px 32px;">
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">ClaimFlow</h1>
      <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.6);">R&D Tax Incentive Management</p>
    </div>
    <!-- Body -->
    <div style="background-color:#ffffff;padding:32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
      ${paragraphs}
      ${ctaBlock}
    </div>
    <!-- Footer -->
    <div style="background-color:#fafafa;border-radius:0 0 12px 12px;padding:20px 32px;border:1px solid #e5e7eb;border-top:none;">
      <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
        This email was sent by <a href="${getAppUrl()}" style="color:#021048;text-decoration:none;">ClaimFlow</a>.
        If you didn't expect this email, you can safely ignore it.
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Send a branded email via Mailjet
 * @param {Object} opts
 * @param {string} opts.to - Recipient email
 * @param {string} opts.subject - Email subject
 * @param {string} opts.text - Plain text body (auto-wrapped in branded HTML)
 * @param {string} [opts.ctaUrl] - Optional call-to-action button URL
 * @param {string} [opts.ctaLabel] - Optional CTA button label (default: "Log in to ClaimFlow")
 */
export async function sendEmail({ to, subject, text, ctaUrl, ctaLabel }) {
  const apiKey = process.env.MAILJET_API_KEY;
  const secretKey = process.env.MAILJET_SECRET_KEY;
  const fromEmail = process.env.FROM_EMAIL || 'noreply@claimflow.ai';

  if (!apiKey || !secretKey) {
    console.warn('[Email] MAILJET_API_KEY or MAILJET_SECRET_KEY not set, skipping email');
    return;
  }

  const html = brandedHtml(text, { ctaUrl, ctaLabel });

  const response = await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + Buffer.from(`${apiKey}:${secretKey}`).toString('base64'),
    },
    body: JSON.stringify({
      Messages: [{
        From: { Email: fromEmail, Name: 'ClaimFlow' },
        To: [{ Email: to }],
        Subject: subject,
        TextPart: text,
        HTMLPart: html,
      }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Mailjet error ${response.status}: ${body}`);
  }
}
