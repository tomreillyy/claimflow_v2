# Row Level Security (RLS) Implementation Guide

**Date:** January 17, 2025
**Status:** Ready to Apply
**Severity:** CRITICAL - Required for Production

---

## Overview

This guide explains how to apply Row Level Security (RLS) policies to your Supabase database to fix the most critical security vulnerability in ClaimFlow.

**Current State:** ❌ No RLS policies - any authenticated user can access all data
**Target State:** ✅ RLS enforced - users can only access their projects and related data

---

## What is RLS?

Row Level Security is a PostgreSQL feature that restricts database rows based on the current user. When enabled:

- Users can only `SELECT/INSERT/UPDATE/DELETE` rows they have permission for
- Policies define who can access what data
- Works at the database level (not just application level)
- **Service role key still bypasses RLS** (as designed)

---

## Quick Start

### Option 1: Apply via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `supabase/migrations/20250117_enable_rls_policies.sql`
5. Paste into the editor
6. Click **Run** (or press Ctrl+Enter)
7. Verify success: You should see "Success. No rows returned"

### Option 2: Apply via Supabase CLI

```bash
# Ensure you're in the project directory
cd c:\Users\tomre\OneDrive\Desktop\claimflow-app

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref <your-project-ref>

# Apply the migration
supabase db push

# Or apply specific migration
supabase migration up
```

### Option 3: Apply via psql

```bash
# Connect to your Supabase database
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Run the migration file
\i supabase/migrations/20250117_enable_rls_policies.sql

# Or copy-paste the SQL directly
```

---

## What This Migration Does

### Tables with RLS Enabled (11 total):

1. ✅ **projects** - Users can only see projects they own or participate in
2. ✅ **evidence** - Users can only access evidence for their projects
3. ✅ **core_activities** - Users can only see activities for their projects
4. ✅ **activity_narratives** - Scoped to activities user has access to
5. ✅ **narrative_jobs** - Background jobs scoped to user's projects
6. ✅ **payroll_uploads** - Sensitive payroll data scoped to projects
7. ✅ **monthly_attestations** - Time allocation data scoped to projects
8. ✅ **cost_ledger** - Cost calculations scoped to projects
9. ✅ **team_members** - Each user sees only their own team roster
10. ✅ **github_repos** - GitHub connections scoped to projects
11. ✅ **project_github_tokens** - Sensitive tokens, owner-only access

### Policies Created (40+ total):

Each table gets appropriate policies for:
- **SELECT**: Who can read rows
- **INSERT**: Who can create rows
- **UPDATE**: Who can modify rows
- **DELETE**: Who can remove rows

---

## Policy Logic

### Participant-Based Access

Most tables use this pattern:

```sql
-- User can access if they own the project OR are a participant
EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = [table].project_id
    AND (
      projects.owner_id = auth.uid() OR
      auth.jwt() ->> 'email' = ANY(projects.participants)
    )
    AND projects.deleted_at IS NULL
)
```

**Key Points:**
- `auth.uid()` = Current user's UUID from Supabase Auth
- `auth.jwt() ->> 'email'` = Current user's email from JWT
- `ANY(projects.participants)` = Checks if email is in participants array
- `deleted_at IS NULL` = Excludes soft-deleted projects

### Special Cases

**team_members:**
- Scoped to `user_id` only (not project-based)
- Each user maintains their own team roster

**project_github_tokens:**
- **Owner-only access** (most sensitive)
- Regular participants cannot view GitHub tokens
- Only project owners can add/update/delete

---

## Verification Steps

### 1. Check RLS is Enabled

Run this query in Supabase SQL Editor:

```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Expected result:
```
tablename              | rowsecurity
-----------------------|------------
projects               | true
evidence               | true
core_activities        | true
activity_narratives    | true
narrative_jobs         | true
payroll_uploads        | true
monthly_attestations   | true
cost_ledger            | true
team_members           | true
github_repos           | true
project_github_tokens  | true
```

### 2. View All Policies

```sql
SELECT tablename, policyname, cmd, permissive
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

You should see ~40 policies across all tables.

### 3. Test with User Credentials

**Important:** RLS only applies when using the **anon key**, not the service role key!

```javascript
// Create a user-scoped client (RLS enforced)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, // ← ANON key, not service role
  {
    global: {
      headers: {
        Authorization: `Bearer ${userAccessToken}` // User's JWT
      }
    }
  }
);

// This query will now only return projects the user has access to
const { data } = await supabase.from('projects').select('*');
```

**Test Cases:**

1. **User A** should only see projects where:
   - `owner_id = User A's UUID`, OR
   - `participants` array contains User A's email

2. **User A** should NOT see projects owned by User B (unless User A is a participant)

3. **Service role key** should still see all projects (bypasses RLS)

---

## Expected Behavior Changes

### Before RLS:

```sql
-- Any authenticated user could do this:
SELECT * FROM evidence; -- Returns ALL evidence from ALL projects ❌
```

### After RLS:

```sql
-- Same query now filtered automatically:
SELECT * FROM evidence; -- Returns only evidence from user's projects ✅
```

### Application Code Changes

**No changes needed for routes using `supabaseAdmin` (service role)**
- Service role bypasses RLS
- Existing application-level auth checks still work
- Routes already secured (see AUTHENTICATION_ADDED.md)

**Changes needed for routes using anon key:**
- RLS will now enforce restrictions
- Ensure user JWT is passed with all requests
- Test thoroughly with different users

---

## Troubleshooting

### Issue: "permission denied for table X"

**Cause:** User trying to access data without proper permissions

**Fix:** Check if user is:
1. Properly authenticated (has valid JWT)
2. Listed in project's `participants` array
3. Using correct project context

### Issue: "infinite recursion detected in policy"

**Cause:** Circular dependency in policies

**Fix:** This migration avoids this - if you see this, check for custom policies

### Issue: Queries return empty results

**Possible Causes:**
1. ✅ **Expected:** User has no projects - create a project first
2. ❌ **Problem:** `participants` array empty - add user to participants
3. ❌ **Problem:** Using service role when you should use anon key

**Debug:**
```sql
-- Check user's access
SELECT
  id,
  name,
  owner_id,
  participants,
  auth.uid() = owner_id AS is_owner,
  auth.jwt() ->> 'email' = ANY(participants) AS is_participant
FROM projects
WHERE auth.uid() = owner_id OR auth.jwt() ->> 'email' = ANY(participants);
```

### Issue: Service role queries still work

**This is expected!** Service role **bypasses RLS** by design.

For full security:
- Keep using service role where needed (cron jobs, admin operations)
- Migrate user-facing routes to anon key + JWT (see AUTHENTICATION_ADDED.md)

---

## Performance Considerations

### Policy Efficiency

All policies use `EXISTS` subqueries for optimal performance:

```sql
-- Efficient (uses EXISTS - stops at first match)
EXISTS (SELECT 1 FROM projects WHERE ...)

-- Less efficient (fetches all matches)
project_id IN (SELECT id FROM projects WHERE ...)
```

### Indexes Required

Ensure these indexes exist:

```sql
-- Should already exist, but verify:
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_evidence_project ON evidence(project_id);
CREATE INDEX IF NOT EXISTS idx_core_activities_project ON core_activities(project_id);

-- For GIN index on participants array:
CREATE INDEX IF NOT EXISTS idx_projects_participants ON projects USING GIN(participants);
```

### Query Planning

After enabling RLS, check query performance:

```sql
EXPLAIN ANALYZE
SELECT * FROM evidence
WHERE project_id = 'some-uuid';
```

Look for:
- Index scans (good) vs Sequential scans (bad)
- Policy overhead (should be minimal with EXISTS)

---

## Rollback Procedure

If you need to rollback (not recommended):

```sql
-- DISABLE RLS on all tables (DANGER!)
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE evidence DISABLE ROW LEVEL SECURITY;
ALTER TABLE core_activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_narratives DISABLE ROW LEVEL SECURITY;
ALTER TABLE narrative_jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_uploads DISABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_attestations DISABLE ROW LEVEL SECURITY;
ALTER TABLE cost_ledger DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE github_repos DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_github_tokens DISABLE ROW LEVEL SECURITY;

-- Drop all policies
DROP POLICY IF EXISTS "Users can view their projects" ON projects;
-- ... (drop all other policies)
```

**Better approach:** Fix the issue instead of disabling RLS!

---

## Migration to User-Scoped Client (Future Work)

Once RLS is enabled, consider migrating routes from service role to user-scoped client:

**Before (bypasses RLS):**
```javascript
// app/api/projects/route.js
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const { data } = await supabaseAdmin.from('projects').select('*');
// Returns ALL projects (service role bypasses RLS)
```

**After (RLS enforced):**
```javascript
// app/api/projects/route.js
import { createUserClient } from '@/lib/supabaseServer';

const supabase = await createUserClient(req); // Uses anon key + user JWT
const { data } = await supabase.from('projects').select('*');
// Returns only user's projects (RLS enforced)
```

**Benefits:**
- Defense in depth (database + application security)
- Harder to accidentally expose data
- Follows principle of least privilege

**When to keep service role:**
- Cron jobs (no user context)
- Admin operations
- Batch processing

---

## Security Impact

### Before RLS:

| Attack Scenario | Vulnerable? |
|----------------|-------------|
| User A queries User B's projects | ✅ YES - returns all data |
| User A modifies User B's evidence | ✅ YES - application auth only |
| Compromised service key | ❌ CRITICAL - full DB access |
| SQL injection via application | ✅ YES - can read all tables |

### After RLS:

| Attack Scenario | Vulnerable? |
|----------------|-------------|
| User A queries User B's projects | ❌ NO - RLS blocks at DB level |
| User A modifies User B's evidence | ❌ NO - RLS blocks write too |
| Compromised service key | ⚠️ STILL CRITICAL - RLS bypass |
| SQL injection via application | ⚠️ REDUCED - limited by RLS |

**Key Takeaway:** RLS adds defense in depth but doesn't replace proper auth!

---

## Compliance & Audit

### Australian R&D Tax Incentive Compliance

RLS helps meet these requirements:

✅ **Data Integrity:**
- Evidence can only be modified by authorized project participants
- Audit trail maintained (who changed what)

✅ **Confidentiality:**
- R&D data from competing projects cannot cross-contaminate
- Each company's data properly isolated

✅ **Attributable Evidence:**
- Only authorized team members can add evidence
- Clear ownership and participation tracking

### Audit Logging

Consider adding triggers for compliance:

```sql
-- Example: Log all evidence changes
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,
  user_id UUID,
  user_email TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  old_data JSONB,
  new_data JSONB
);

CREATE OR REPLACE FUNCTION audit_evidence_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (table_name, record_id, action, user_id, user_email, old_data, new_data)
    VALUES ('evidence', NEW.id, 'UPDATE', auth.uid(), auth.jwt() ->> 'email', to_jsonb(OLD), to_jsonb(NEW));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER evidence_audit_trigger
  AFTER UPDATE ON evidence
  FOR EACH ROW
  EXECUTE FUNCTION audit_evidence_changes();
```

---

## Testing Checklist

Before deploying to production:

- [ ] Run migration in **staging** environment first
- [ ] Verify RLS enabled on all 11 tables
- [ ] Count policies: should be ~40 total
- [ ] Test with User A credentials:
  - [ ] Can view own projects
  - [ ] Cannot view User B's projects
  - [ ] Can add evidence to own projects
  - [ ] Cannot add evidence to User B's projects
- [ ] Test with User B credentials:
  - [ ] Can view projects where they're participants
  - [ ] Can collaborate on shared projects
  - [ ] Cannot access unrelated projects
- [ ] Verify service role still works (for cron jobs)
- [ ] Check application logs for policy violations
- [ ] Run performance tests on key queries
- [ ] Verify frontend still works (all API calls authenticated)

---

## Production Deployment

### Pre-Deployment

1. ✅ **Backup database**
   ```bash
   # Via Supabase dashboard: Database → Backups → Create backup
   ```

2. ✅ **Test in staging** (see checklist above)

3. ✅ **Schedule maintenance window** (minimal downtime expected)

4. ✅ **Notify team** (routes may return different data after RLS)

### Deployment Steps

1. **Apply migration** (see Quick Start above)

2. **Verify immediately:**
   ```sql
   SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';
   -- Should return ~40
   ```

3. **Test critical paths:**
   - User login → project list
   - Add evidence
   - View timeline
   - Upload file

4. **Monitor errors:**
   - Check Supabase logs
   - Check application error logs
   - Watch for "permission denied" errors

### Post-Deployment

1. **Update documentation:**
   - Mark RLS as ENABLED in SECURITY_FIXES.md
   - Update production readiness status

2. **Monitor for 24 hours:**
   - Query performance
   - User complaints
   - Error rates

3. **Communicate success:**
   - Update security status page
   - Notify stakeholders

---

## FAQ

**Q: Will this break my existing application?**

A: If you're using service role key (supabaseAdmin), no. Service role bypasses RLS. If you're using anon key, ensure user JWT is passed with all requests.

**Q: Can I enable RLS on only some tables?**

A: Yes, but not recommended. Partial RLS creates security gaps. Enable on all tables for consistency.

**Q: How do I test RLS without affecting production?**

A: Use a staging database, or test with a separate Supabase project.

**Q: What happens to existing data?**

A: Nothing. RLS only affects future queries, not existing rows.

**Q: Can I customize the policies?**

A: Yes! Edit the migration file before applying. Common customizations:
- Add role-based access (admin, viewer, editor)
- Time-based access (only current year projects)
- IP-based restrictions

**Q: Does RLS slow down queries?**

A: Minimal impact with proper indexes. Policies use efficient EXISTS subqueries.

**Q: Can I see what policies blocked a query?**

A: Enable PostgreSQL query logging to see policy violations. Check Supabase logs.

---

## Next Steps

After applying RLS policies:

1. ✅ **Update SECURITY_FIXES.md** - Mark RLS as complete
2. ✅ **Test thoroughly** - Use testing checklist above
3. ⚠️ **Consider migrating to user-scoped client** - For defense in depth
4. ⚠️ **Add audit logging** - For compliance requirements
5. ⚠️ **Monitor performance** - Watch query execution times

---

## Support

**If you encounter issues:**

1. Check the Troubleshooting section above
2. Review Supabase logs for policy violations
3. Test with different user accounts
4. Verify JWT contains email claim
5. Check indexes are in place

**Still stuck?**
- Supabase Discord: https://discord.supabase.com
- Supabase Docs: https://supabase.com/docs/guides/auth/row-level-security
- PostgreSQL RLS Docs: https://www.postgresql.org/docs/current/ddl-rowsecurity.html

---

**Document Version:** 1.0
**Last Updated:** January 17, 2025
**Status:** Ready to Apply
**Priority:** CRITICAL
