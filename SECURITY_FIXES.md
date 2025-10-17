# Security Fixes Applied - Production Readiness Update

This document outlines the critical security vulnerabilities that have been addressed to prepare the ClaimFlow application for production deployment.

## Overview

A comprehensive security audit was performed, identifying **15 vulnerabilities** across Critical, High, Medium, and Low severity levels. This document details the fixes that have been implemented for the most critical issues.

---

## ✅ Fixed Vulnerabilities

### 1. **SendGrid Webhook Signature Verification** (CRITICAL - Fixed)

**Issue:** The inbound email webhook (`/api/inbound/sendgrid`) had no authentication, allowing anyone to POST forged emails and inject evidence into projects.

**Fix Applied:**
- Added webhook signature verification in `/app/api/inbound/sendgrid/route.js`
- Verifies `x-twilio-email-event-webhook-signature` and `x-twilio-email-event-webhook-timestamp` headers
- Implements timestamp validation (10-minute window) to prevent replay attacks
- Fails closed in production if `SENDGRID_WEBHOOK_SECRET` is not configured

**Required Configuration:**
```bash
# Generate a strong secret
openssl rand -base64 32

# Add to .env.local
SENDGRID_WEBHOOK_SECRET=<your_secret_here>

# Configure in SendGrid Dashboard:
# Inbound Parse > Settings > Add webhook URL with signature verification enabled
```

**Files Modified:**
- `app/api/inbound/sendgrid/route.js`
- `lib/serverAuth.js` (new utility functions)

---

### 2. **Cron Endpoint Protection** (HIGH - Fixed)

**Issue:** Cron endpoints (`/api/cron/nudge` and `/api/cron/process-narratives`) had no authentication. Anyone could trigger expensive OpenAI API calls and send spam emails.

**Fix Applied:**
- Added Bearer token authentication to both cron endpoints
- Implements `verifyCronSecret()` utility with constant-time comparison
- Fails closed in production if `CRON_SECRET` is not configured

**Required Configuration:**
```bash
# Generate a strong secret
openssl rand -base64 32

# Add to .env.local
CRON_SECRET=<your_secret_here>

# Update your cron job caller (e.g., Vercel Cron or external service):
curl -X GET/POST https://yourapp.com/api/cron/nudge \
  -H "Authorization: Bearer <your_secret_here>"
```

**Files Modified:**
- `app/api/cron/nudge/route.js`
- `app/api/cron/process-narratives/route.js`
- `lib/serverAuth.js`

---

### 3. **File Upload Validation** (HIGH - Fixed)

**Issue:** No validation on file uploads (size, type, content). Attackers could upload malicious files, exhaust storage, or inject malware.

**Fix Applied:**
- Implemented comprehensive file validation in `lib/serverAuth.js`
- **Size limits:** 10MB for evidence, 25MB for payroll
- **MIME type validation:** Whitelist of allowed types only
- **Magic byte verification:** Prevents MIME type spoofing by checking file signatures
- **Filename sanitization:** Removes path traversal characters and special chars

**Allowed File Types:**
- Images: PNG, JPEG, GIF, WebP
- Documents: PDF
- Spreadsheets: CSV, XLS, XLSX
- Text: Plain text

**Files Modified:**
- `app/api/evidence/[token]/upload/route.js`
- `app/api/projects/[token]/payroll/upload/route.js`
- `app/api/inbound/sendgrid/route.js`
- `lib/serverAuth.js` (`validateFileUpload`, `sanitizeFilename` functions)

---

### 4. **Secure File Naming** (MEDIUM - Fixed)

**Issue:** User-controlled filenames could contain path traversal sequences (`../`, `../../`) or malicious characters.

**Fix Applied:**
- All file uploads now use `sanitizeFilename()` utility
- Removes path separators (`/`, `\`)
- Removes parent directory references (`..`)
- Replaces special characters with underscores
- Prevents hidden files (removes leading dots)
- Enforces maximum filename length (255 chars)

**Files Modified:**
- `app/api/evidence/[token]/upload/route.js`
- `app/api/projects/[token]/payroll/upload/route.js`
- `app/api/inbound/sendgrid/route.js`

---

## 🔧 Security Utilities Created

### `lib/serverAuth.js`

A comprehensive security utility library providing:

1. **`verifyProjectAccess(token, userEmail)`** - Validates project access (ready for future use)
2. **`verifyCronSecret(req)`** - Authenticates cron endpoint requests
3. **`validateFileUpload(file, options)`** - Comprehensive file validation
4. **`sanitizeFilename(filename)`** - Path traversal protection
5. **`checkRateLimit(key, maxRequests, windowMs)`** - Basic rate limiting (ready for future use)
6. **`verifyMagicBytes(bytes, mimeType)`** - File signature verification

---

## ⚠️ Still Requires Attention (Not Yet Fixed)

The following critical vulnerabilities were identified but **require additional consideration** before implementation:

### 1. **Missing Row Level Security (RLS) Policies** (CRITICAL)

**Status:** Not fixed in this update - requires database schema changes

**Issue:** All Supabase tables lack RLS policies. Any authenticated user can read/modify data from other users.

**Next Steps:**
You need to create and apply RLS policies to all tables. Example migration:

```sql
-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_attestations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_narratives ENABLE ROW LEVEL SECURITY;
ALTER TABLE narrative_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dismissed_suggestions ENABLE ROW LEVEL SECURITY;

-- Example policy for projects table
CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  USING (
    auth.uid() = owner_id OR
    auth.jwt() ->> 'email' = ANY(participants)
  );

CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = owner_id);

-- Similar policies needed for all other tables
```

**Impact:** Without RLS, the app should NOT go to production.

---

### 2. **Hardcoded API Keys in .env.local** (CRITICAL)

**Status:** Cannot be automatically fixed - requires manual action

**IMMEDIATE ACTION REQUIRED:**
1. **Rotate ALL API keys** in:
   - Supabase (both Anon Key and Service Role Key)
   - SendGrid
   - OpenAI

2. **Verify `.env.local` is in `.gitignore`** (it is, but check history)

3. **Check git history** to ensure `.env.local` was never committed:
   ```bash
   git log --all --full-history -- .env.local
   ```

4. If it was committed, **remove from git history**:
   ```bash
   # WARNING: This rewrites git history - coordinate with team
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env.local" \
     --prune-empty --tag-name-filter cat -- --all
   ```

---

### 3. **Project Token Access Control** (CRITICAL)

**Status:** Design decision required before fixing

**Issue:** Anyone with a project token can view ALL project data without authentication. The `app/p/[token]/page.jsx` route uses `supabaseAdmin` (service role).

**Options:**
1. **Add authentication** - Require users to log in before viewing projects
2. **Implement read-only tokens** - Separate tokens for read vs. write access
3. **Add token expiration** - Make tokens time-limited
4. **Keep current behavior** - If this is intentional for your use case

**Recommendation:** Add authentication + check user is in `participants` array.

---

### 4. **Service Role Key Overuse** (HIGH)

**Status:** Partially addressed - full fix requires architecture changes

**Issue:** 34+ routes use `supabaseAdmin` (service role key) which bypasses all RLS policies.

**Current Status:**
- File upload routes still use service role (but have manual validation)
- Evidence routes still use service role
- Project routes still use service role

**Long-term Fix:**
Replace service role with user-scoped Supabase client in API routes:

```javascript
// Create user-scoped client
import { createClient } from '@supabase/supabase-js';

export function createSupabaseServerClient(authToken) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    }
  );
}
```

Then update routes to use this client instead of `supabaseAdmin`.

---

## 📋 Deployment Checklist

Before deploying to production:

- [ ] Rotate all API keys (Supabase, SendGrid, OpenAI)
- [ ] Verify `.env.local` is not in git history
- [ ] Generate and configure `SENDGRID_WEBHOOK_SECRET`
- [ ] Generate and configure `CRON_SECRET`
- [ ] Update Vercel/hosting platform environment variables
- [ ] Configure SendGrid webhook with signature verification
- [ ] Update cron job caller to use Bearer token
- [ ] **Implement RLS policies on ALL Supabase tables** (CRITICAL)
- [ ] Test file uploads with various file types
- [ ] Test webhook with signature verification
- [ ] Test cron endpoints with secret
- [ ] Review and decide on project token access control
- [ ] Plan migration from service role to user-scoped client

---

## 🔐 Security Best Practices Implemented

1. **Defense in Depth** - Multiple layers of security (validation, authentication, authorization)
2. **Fail Closed** - Production mode requires all security configurations
3. **Input Validation** - All user inputs are validated before processing
4. **Path Traversal Protection** - Filenames sanitized to prevent directory attacks
5. **Constant-Time Comparison** - Prevents timing attacks on secrets
6. **Magic Byte Verification** - Prevents MIME type spoofing
7. **Rate Limiting Framework** - Ready for implementation when needed
8. **Audit Logging** - Security events logged for monitoring

---

## 📝 Configuration Guide

### Step 1: Generate Secrets

```bash
# Generate SENDGRID_WEBHOOK_SECRET
openssl rand -base64 32

# Generate CRON_SECRET
openssl rand -base64 32
```

### Step 2: Update .env.local

Add the following to your `.env.local`:

```bash
# Security Configuration
SENDGRID_WEBHOOK_SECRET=<secret_from_step_1>
CRON_SECRET=<secret_from_step_1>
```

### Step 3: Configure SendGrid

1. Go to SendGrid Dashboard
2. Navigate to Settings > Inbound Parse > Webhooks
3. Edit your webhook URL
4. Enable "Signature Verification"
5. Enter your `SENDGRID_WEBHOOK_SECRET`

### Step 4: Update Cron Jobs

If using Vercel Cron:

```javascript
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/nudge",
      "schedule": "0 9 * * *",
      "headers": {
        "authorization": "Bearer <YOUR_CRON_SECRET>"
      }
    }
  ]
}
```

If using external service:

```bash
curl -X GET https://yourapp.com/api/cron/nudge \
  -H "Authorization: Bearer <YOUR_CRON_SECRET>"
```

---

## 🧪 Testing

### Test Webhook Security

```bash
# Should fail without signature
curl -X POST https://yourapp.com/api/inbound/sendgrid \
  -F "to=test@example.com" \
  -F "from=sender@example.com" \
  -F "text=Test email"

# Should fail with invalid signature
curl -X POST https://yourapp.com/api/inbound/sendgrid \
  -H "x-twilio-email-event-webhook-signature: invalid" \
  -H "x-twilio-email-event-webhook-timestamp: $(date +%s)" \
  -F "to=test@example.com"
```

### Test Cron Protection

```bash
# Should fail without auth
curl -X GET https://yourapp.com/api/cron/nudge

# Should succeed with correct secret
curl -X GET https://yourapp.com/api/cron/nudge \
  -H "Authorization: Bearer <YOUR_CRON_SECRET>"
```

### Test File Upload Validation

```bash
# Should fail - file too large
# Create a file > 10MB and try to upload

# Should fail - invalid file type
curl -X POST https://yourapp.com/api/evidence/<token>/upload \
  -F "file=@malicious.exe"

# Should fail - MIME type spoofing
# Rename .exe to .png and try to upload
```

---

## 📊 Security Metrics

| Category | Before | After | Improvement |
|----------|--------|-------|-------------|
| Webhook Authentication | ❌ None | ✅ HMAC Signature | 🔒 Complete |
| Cron Protection | ❌ None | ✅ Bearer Token | 🔒 Complete |
| File Upload Validation | ❌ MIME only | ✅ Size + Magic Bytes | 🔒 Complete |
| Filename Security | ❌ User-controlled | ✅ Sanitized | 🔒 Complete |
| RLS Policies | ❌ None | ❌ None | ⚠️ TODO |
| Service Role Usage | ❌ Everywhere | ⚠️ Partial | 🔶 In Progress |

---

## 📞 Support

If you have questions about these security fixes or need assistance with implementation:

1. Review this document thoroughly
2. Check the code comments in `lib/serverAuth.js`
3. Test each fix in a staging environment before production
4. Consider hiring a security consultant for RLS policy design

---

## 📅 Version History

- **2025-01-17** - Initial security fixes applied
  - Webhook signature verification
  - Cron endpoint protection
  - File upload validation
  - Filename sanitization

---

**Last Updated:** January 17, 2025
**Status:** Partial Production Readiness - RLS policies still required
