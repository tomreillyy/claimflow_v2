# Security Enhancements v2.0 - Implementation Summary

**Date**: 2025-01-17
**Status**: ✅ Complete
**Breaking Changes**: Yes - Private evidence bucket, rate limiting headers

---

## Overview

This document details three major security enhancements implemented for production readiness:

1. **Idempotent RLS Migration** - SQL can be run multiple times safely
2. **Private Evidence Bucket with Signed URLs** - Prevents unauthorized file access
3. **Rate Limiting with Token Bucket** - Prevents abuse of API endpoints

---

## 1. Idempotent RLS Migration

### Changes Made

Updated [supabase/migrations/20250117_enable_rls_policies.sql](supabase/migrations/20250117_enable_rls_policies.sql) to be idempotent:

- Changed `ALTER TABLE` to `ALTER TABLE IF EXISTS`
- Added `DROP POLICY IF EXISTS` before creating policies
- Migration can now be run multiple times without errors

### Example Pattern

```sql
ALTER TABLE IF EXISTS projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their projects" ON projects;

CREATE POLICY "Users can view their projects"
  ON projects FOR SELECT
  USING (
    auth.uid() = owner_id OR
    auth.jwt() ->> 'email' = ANY(participants)
  );
```

### Deployment

```bash
# Safe to run multiple times
psql -h db.xxx.supabase.co -U postgres -d postgres -f supabase/migrations/20250117_enable_rls_policies.sql
```

---

## 2. Private Evidence Bucket with Signed URLs

### Problem

Evidence bucket was public, allowing anyone with a URL to access files without authentication.

### Solution

Made evidence bucket private and implemented signed URL generation for authorized access only.

### Changes Made

#### 1. New Signed URL Helper ([lib/serverAuth.js](lib/serverAuth.js))

```javascript
/**
 * Generate a signed URL for private storage bucket access
 * @param {string} storagePath - Path in storage (e.g., "project-id/file.pdf")
 * @param {string} bucket - Bucket name (default: "evidence")
 * @param {number} expiresIn - URL expiry in seconds (default: 3600)
 */
export async function getSignedStorageUrl(storagePath, bucket = 'evidence', expiresIn = 3600)

/**
 * Extract storage path from URL or return as-is if already a path
 * @param {string} urlOrPath - Full URL or storage path
 * @returns {string} - Storage path
 */
export function extractStoragePath(urlOrPath)
```

#### 2. New Signed URL API Endpoint ([app/api/evidence/[token]/signed-url/route.js](app/api/evidence/[token]/signed-url/route.js))

```javascript
// Batch request for multiple evidence files
POST /api/evidence/{token}/signed-url
Body: { evidence_ids: [1, 2, 3] }
Response: { signedUrls: { 1: "https://...", 2: "https://..." } }

// Single request for one storage path
POST /api/evidence/{token}/signed-url
Body: { storage_path: "project-id/file.pdf" }
Response: { signedUrl: "https://..." }
```

**Features**:
- Validates project access
- Generates 1-hour expiring signed URLs
- Batch support (max 50 files)
- Returns error for unauthorized access

#### 3. Updated Upload Routes

**[app/api/evidence/[token]/upload/route.js:60-70](app/api/evidence/[token]/upload/route.js#L60-L70)**:
```javascript
// OLD: Store public URL
const { data: publicUrl } = supabaseAdmin.storage.from('evidence').getPublicUrl(uploaded.path);
file_url: publicUrl.publicUrl

// NEW: Store storage path
file_url: uploaded.path  // e.g., "project-id/timestamp_file.pdf"
```

**[app/api/inbound/sendgrid/route.js:125-130](app/api/inbound/sendgrid/route.js#L125-L130)**: Same change for email attachments

#### 4. Updated Frontend ([app/p/[token]/AuthenticatedTimeline.jsx](app/p/[token]/AuthenticatedTimeline.jsx))

**New Hook**:
```javascript
// Hook to fetch signed URLs for private evidence files
function useSignedUrls(token, evidenceItems) {
  // Fetches signed URLs in batch when component loads
  // Returns: { signedUrls: {}, loading: boolean }
}
```

**Updated Timeline Component**:
```javascript
const { signedUrls, loading: signedUrlsLoading } = useSignedUrls(token, items);

// Render attachment with signed URL
{signedUrls[ev.id] ? (
  <a href={signedUrls[ev.id]}>📎 attachment</a>
) : signedUrlsLoading ? (
  <span>📎 loading...</span>
) : (
  <span>📎 unavailable</span>
)}
```

### Supabase Bucket Configuration

**IMPORTANT**: You must configure the evidence bucket as private in Supabase Dashboard:

1. Go to Storage → evidence bucket
2. Click Settings
3. Set **Public bucket**: OFF
4. Save

### Migration Path for Existing Data

Existing evidence records may have full URLs stored in `file_url`. The system handles both:

```javascript
// Works with both formats:
file_url: "project-id/file.pdf"                                    // New format
file_url: "https://xxx.supabase.co/.../evidence/project-id/file.pdf" // Old format

// extractStoragePath() helper extracts path from either format
```

**Optional**: Clean up existing URLs in database:
```sql
-- Extract path from existing URLs
UPDATE evidence
SET file_url = regexp_replace(
  file_url,
  'https?://.*?/storage/v1/object/[^/]+/evidence/',
  ''
)
WHERE file_url LIKE 'http%'
  AND file_url LIKE '%/evidence/%';
```

---

## 3. Rate Limiting with Token Bucket Algorithm

### Problem

No rate limiting on API endpoints allowed potential abuse of:
- File uploads
- Evidence creation
- AI classification

### Solution

Implemented distributed rate limiting using Upstash Redis or Vercel KV with token bucket algorithm.

### Architecture

#### Token Bucket Algorithm

```
┌─────────────────────────────┐
│     Token Bucket            │
│                             │
│  Capacity: 100 tokens       │
│  Current:  87 tokens        │
│  Refill:   100 tokens/hour  │
│                             │
│  Request → Consume 1 token  │
│  Denied if tokens < 1       │
└─────────────────────────────┘
```

**Benefits**:
- Allows bursts of requests
- Smooth refill over time
- Per-IP and per-project limits

#### Rate Limit Configurations

Defined in [lib/rateLimit.js](lib/rateLimit.js):

```javascript
export const RATE_LIMITS = {
  EVIDENCE_PER_IP: {
    maxTokens: 100,
    refillRate: 100,
    refillInterval: 3600  // 100 requests per hour per IP
  },
  EVIDENCE_PER_PROJECT: {
    maxTokens: 500,
    refillRate: 500,
    refillInterval: 3600  // 500 requests per hour per project
  },
  CLASSIFY_PER_IP: {
    maxTokens: 50,
    refillRate: 50,
    refillInterval: 3600  // 50 requests per hour per IP
  },
  CLASSIFY_PER_PROJECT: {
    maxTokens: 200,
    refillRate: 200,
    refillInterval: 3600  // 200 requests per hour per project
  }
};
```

### Implementation

#### 1. Rate Limiting Library ([lib/rateLimit.js](lib/rateLimit.js))

**Core Functions**:

```javascript
/**
 * Check if request is within rate limit
 * @returns {allowed, remaining, resetTime, error}
 */
export async function checkRateLimit(identifier, config)

/**
 * Check multiple rate limits (per-IP + per-project)
 * Returns most restrictive result
 */
export async function checkMultipleRateLimits(limits)

/**
 * Middleware helper - returns 429 response if rate limited
 */
export async function rateLimitMiddleware(req, limits)

/**
 * Extract client IP from request headers
 * Supports Vercel, Cloudflare, Nginx proxies
 */
export function getClientIp(req)
```

**Features**:
- Graceful degradation (allows requests if Redis unavailable)
- Fail-open design for better UX
- Automatic cleanup of expired entries
- Works with both Upstash Redis and Vercel KV

#### 2. Applied to Evidence Routes

**[app/api/evidence/[token]/add/route.js](app/api/evidence/[token]/add/route.js)**:
```javascript
// Apply rate limiting (per-IP + per-project)
const clientIp = getClientIp(req);
const rateLimitResponse = await rateLimitMiddleware(req, [
  { identifier: clientIp, config: RATE_LIMITS.EVIDENCE_PER_IP, name: 'per-ip' },
  { identifier: token, config: RATE_LIMITS.EVIDENCE_PER_PROJECT, name: 'per-project' }
]);

if (rateLimitResponse) {
  return rateLimitResponse; // 429 Too Many Requests
}
```

Also applied to:
- [app/api/evidence/[token]/upload/route.js](app/api/evidence/[token]/upload/route.js)
- [app/api/evidence/[token]/delete/route.js](app/api/evidence/[token]/delete/route.js)

#### 3. Applied to Classify Route

**[app/api/classify/route.js](app/api/classify/route.js)**:
```javascript
// Fetch evidence to get project info for rate limiting
const { data: evidence } = await supabaseAdmin
  .from('evidence')
  .select('id, content, project_id, projects(project_token)')
  .eq('id', id)
  .single();

const projectToken = evidence.projects?.project_token;

// Apply rate limiting
const clientIp = getClientIp(req);
const rateLimitResponse = await rateLimitMiddleware(req, [
  { identifier: clientIp, config: RATE_LIMITS.CLASSIFY_PER_IP, name: 'per-ip' },
  { identifier: projectToken, config: RATE_LIMITS.CLASSIFY_PER_PROJECT, name: 'per-project' }
]);
```

### Rate Limit Response Format

**429 Too Many Requests**:
```json
{
  "error": "Rate limit exceeded",
  "limitedBy": "per-ip",
  "remaining": 0,
  "resetTime": 1737123456789,
  "resetDate": "2025-01-17T12:30:56.789Z",
  "message": "Too many requests. Please try again after 2025-01-17T12:30:56.789Z"
}
```

**Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1737123456
Retry-After: 3456
```

### Configuration

#### Option 1: Upstash Redis

1. Sign up at https://upstash.com/
2. Create a Redis database
3. Add to `.env`:

```env
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXXXxxx
```

#### Option 2: Vercel KV

1. Go to Vercel Project → Storage → Create KV Database
2. Connect to project (auto-adds environment variables)

```env
KV_REST_API_URL=https://xxx.kv.vercel-storage.com
KV_REST_API_TOKEN=AXXXxxx
```

#### Graceful Degradation

If Redis is not configured:
- Rate limiting is **disabled**
- All requests are allowed
- Console warning logged
- System continues to function normally

**Production Best Practice**: Always configure Redis for rate limiting in production.

---

## Environment Variables

### Updated [.env.example](.env.example)

```env
# Rate Limiting Configuration
# Uses Upstash Redis or Vercel KV for distributed rate limiting
# If not configured, rate limiting will be gracefully disabled

# Option 1: Upstash Redis (https://upstash.com/)
UPSTASH_REDIS_REST_URL=your_upstash_redis_url_here
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token_here

# Option 2: Vercel KV (https://vercel.com/storage/kv)
# KV_REST_API_URL=your_vercel_kv_url_here
# KV_REST_API_TOKEN=your_vercel_kv_token_here
```

---

## Dependencies

### Updated [package.json](package.json)

```json
{
  "dependencies": {
    "@upstash/redis": "^1.36.0"
  }
}
```

Install:
```bash
npm install
```

---

## Testing

### 1. Test Private Bucket & Signed URLs

```bash
# Upload a file (requires authentication)
curl -X POST "http://localhost:3000/api/evidence/{token}/upload" \
  -H "Authorization: Bearer {jwt_token}" \
  -F "file=@test.pdf"

# Response: { "ok": true, "path": "project-id/timestamp_test.pdf" }

# Try to access directly (should fail - bucket is private)
curl "https://xxx.supabase.co/storage/v1/object/public/evidence/project-id/timestamp_test.pdf"
# Response: 400 Bad Request (bucket is private)

# Get signed URL (requires project access)
curl -X POST "http://localhost:3000/api/evidence/{token}/signed-url" \
  -H "Content-Type: application/json" \
  -d '{"storage_path": "project-id/timestamp_test.pdf"}'

# Response: { "signedUrl": "https://...?token=xxx" }

# Access via signed URL (should succeed)
curl "https://...?token=xxx"
# Response: PDF file contents
```

### 2. Test Rate Limiting

```bash
# Make 101 requests to trigger rate limit
for i in {1..101}; do
  curl -X POST "http://localhost:3000/api/evidence/{token}/add" \
    -H "Authorization: Bearer {jwt_token}" \
    -H "Content-Type: application/json" \
    -d '{"content": "Test '$i'"}'
done

# Request 101 should return 429:
# {
#   "error": "Rate limit exceeded",
#   "limitedBy": "per-ip",
#   "remaining": 0,
#   "resetTime": 1737123456789
# }
```

### 3. Test RLS Migration Idempotency

```bash
# Run migration twice - should succeed both times
psql -h db.xxx.supabase.co -U postgres -d postgres \
  -f supabase/migrations/20250117_enable_rls_policies.sql

psql -h db.xxx.supabase.co -U postgres -d postgres \
  -f supabase/migrations/20250117_enable_rls_policies.sql

# No errors should occur
```

---

## Deployment Checklist

### 1. Database Migration

- [ ] Run RLS migration: `psql -f supabase/migrations/20250117_enable_rls_policies.sql`
- [ ] Verify RLS enabled: See [RLS_IMPLEMENTATION_GUIDE.md](RLS_IMPLEMENTATION_GUIDE.md)

### 2. Storage Configuration

- [ ] Go to Supabase Dashboard → Storage → evidence bucket
- [ ] Set **Public bucket**: OFF
- [ ] Save changes
- [ ] (Optional) Migrate existing URLs in database to paths

### 3. Rate Limiting Setup

- [ ] Sign up for Upstash Redis OR enable Vercel KV
- [ ] Add Redis credentials to Vercel environment variables
- [ ] Redeploy application

### 4. Code Deployment

- [ ] Install dependencies: `npm install`
- [ ] Build application: `npm run build`
- [ ] Deploy to Vercel
- [ ] Verify environment variables are set

### 5. Testing

- [ ] Test file upload and signed URL generation
- [ ] Test rate limiting with multiple requests
- [ ] Test private bucket (direct access should fail)
- [ ] Monitor logs for any Redis connection errors

---

## Breaking Changes

### Frontend

**File URLs are now storage paths instead of public URLs**:

If you have custom code accessing `evidence.file_url`, you must:

1. Call `/api/evidence/{token}/signed-url` to get signed URLs
2. Use the signed URLs for download/display
3. Signed URLs expire after 1 hour

**Example**:
```javascript
// OLD (will not work with private bucket):
<a href={evidence.file_url}>Download</a>

// NEW (works with private bucket):
const { signedUrls } = useSignedUrls(token, items);
<a href={signedUrls[evidence.id]}>Download</a>
```

### API Responses

**Rate limit headers added to all responses**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1737123456
```

**New 429 error response**:
```json
{
  "error": "Rate limit exceeded",
  "limitedBy": "per-ip",
  "remaining": 0,
  "resetTime": 1737123456789,
  "resetDate": "2025-01-17T12:30:56.789Z",
  "message": "Too many requests. Please try again after 2025-01-17T12:30:56.789Z"
}
```

### Database

**Existing URLs in `evidence.file_url` still work**:

The `extractStoragePath()` helper handles both formats:
- New format: `"project-id/file.pdf"`
- Old format: `"https://xxx.supabase.co/.../evidence/project-id/file.pdf"`

**Recommendation**: Run optional migration SQL to clean up URLs (see section 2).

---

## Performance Considerations

### Signed URLs

- **Cost**: 1 Redis read per signed URL request
- **Caching**: Frontend should cache signed URLs until near expiry
- **Batch**: Use batch endpoint for multiple files (max 50)

### Rate Limiting

- **Cost**: 2 Redis operations per request (read + write)
- **Latency**: ~10-50ms added per request (Redis network call)
- **Optimization**: Batch requests where possible

### Recommendations

1. **Frontend caching**: Cache signed URLs for 50 minutes (10-minute buffer before expiry)
2. **Batch fetching**: Use batch signed URL endpoint when loading multiple files
3. **Redis region**: Use same region as Vercel deployment for lower latency

---

## Monitoring

### Key Metrics to Track

1. **Rate Limit Hit Rate**: % of requests returning 429
2. **Redis Latency**: Time to check rate limit
3. **Signed URL Generation Time**: Time to generate signed URLs
4. **Redis Errors**: Failed Redis connections (graceful degradation)

### Logs to Monitor

```bash
# Rate limit exceeded
[RateLimit] Rate limit exceeded for {ip/project}

# Redis connection error
[RateLimit] Error checking rate limit: {error}

# Signed URL generation error
[Storage] Failed to create signed URL for {path}: {error}

# Redis not configured (warning)
[RateLimit] Redis credentials not configured. Rate limiting disabled.
```

---

## Security Impact

### Improvements

| Issue | Before | After |
|-------|--------|-------|
| **Unauthorized file access** | Anyone with URL can access files | Only authenticated project participants can access files |
| **API abuse** | Unlimited requests | Limited to 100-500 requests/hour |
| **DoS attacks** | No protection | Per-IP rate limiting prevents abuse |
| **File enumeration** | Public URLs can be guessed | Private bucket + signed URLs prevent enumeration |

### Threat Model

**Mitigated Threats**:
- ✅ Unauthorized evidence file access
- ✅ API abuse / DoS attacks
- ✅ File enumeration attacks
- ✅ Excessive AI classification costs

**Remaining Risks**:
- ⚠️ Signed URL sharing (expires after 1 hour)
- ⚠️ Rate limit bypass via multiple IPs (requires distributed attack)

---

## Rollback Plan

If issues occur:

### 1. Revert Private Bucket

```bash
# In Supabase Dashboard:
# Storage → evidence bucket → Settings → Public bucket: ON
```

### 2. Disable Rate Limiting

```bash
# Remove from Vercel environment variables:
unset UPSTASH_REDIS_REST_URL
unset UPSTASH_REDIS_REST_TOKEN

# Redeploy
```

### 3. Revert Code

```bash
git revert HEAD
git push
```

**Note**: RLS migration does not need to be reverted (it's backward compatible).

---

## Support

For issues or questions:
- Check logs in Vercel Dashboard
- Verify Redis connection in Upstash/Vercel KV Dashboard
- Review [SECURITY_FIXES.md](SECURITY_FIXES.md) for related security documentation
- Review [RLS_IMPLEMENTATION_GUIDE.md](RLS_IMPLEMENTATION_GUIDE.md) for RLS setup

---

## Related Documentation

- [SECURITY_FIXES.md](SECURITY_FIXES.md) - Initial security audit and fixes
- [RLS_IMPLEMENTATION_GUIDE.md](RLS_IMPLEMENTATION_GUIDE.md) - Row Level Security implementation
- [AUTHENTICATION_ADDED.md](AUTHENTICATION_ADDED.md) - Authentication implementation guide
- [SYSTEM_DOCUMENTATION.md](SYSTEM_DOCUMENTATION.md) - Complete system documentation
