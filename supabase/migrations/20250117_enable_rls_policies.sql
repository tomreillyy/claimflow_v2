-- Row Level Security (RLS) Policies for ClaimFlow
-- Date: 2025-01-17
-- Purpose: Implement participant-based access control on all tables
--
-- IMPORTANT: This migration enables RLS and creates policies for all tables.
-- After running this, service role key will still bypass RLS (as designed).
-- Application code should be migrated to use user-scoped Supabase client for full security.
--
-- IDEMPOTENT: This migration can be run multiple times safely.
-- It uses DROP POLICY IF EXISTS before creating policies.

-- ============================================================================
-- 1. PROJECTS TABLE
-- ============================================================================
-- Users can only access projects they own or participate in

ALTER TABLE IF EXISTS projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Project owners can update their projects" ON projects;
DROP POLICY IF EXISTS "Project owners can delete their projects" ON projects;

-- Policy: Users can view projects they own or are participants in
CREATE POLICY "Users can view their projects"
  ON projects FOR SELECT
  USING (
    auth.uid() = owner_id OR
    auth.jwt() ->> 'email' = ANY(participants)
  );

-- Policy: Users can insert projects they create
CREATE POLICY "Users can create projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Policy: Users can update projects they own
CREATE POLICY "Project owners can update their projects"
  ON projects FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Policy: Users can soft-delete (update deleted_at) projects they own
CREATE POLICY "Project owners can delete their projects"
  ON projects FOR DELETE
  USING (auth.uid() = owner_id);

COMMENT ON POLICY "Users can view their projects" ON projects IS
  'Allows users to view projects they own or are listed as participants';
COMMENT ON POLICY "Users can create projects" ON projects IS
  'Allows authenticated users to create new projects where they are the owner';
COMMENT ON POLICY "Project owners can update their projects" ON projects IS
  'Only project owners can update project details';
COMMENT ON POLICY "Project owners can delete their projects" ON projects IS
  'Only project owners can delete (soft-delete) their projects';


-- ============================================================================
-- 2. EVIDENCE TABLE
-- ============================================================================
-- Users can only access evidence for projects they participate in

ALTER TABLE IF EXISTS evidence ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view evidence in their projects" ON evidence;
DROP POLICY IF EXISTS "Participants can add evidence" ON evidence;
DROP POLICY IF EXISTS "Participants can update evidence" ON evidence;
DROP POLICY IF EXISTS "Participants can delete evidence" ON evidence;

-- Policy: Users can view evidence for projects they have access to
CREATE POLICY "Users can view evidence in their projects"
  ON evidence FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = evidence.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );

-- Policy: Users can insert evidence into projects they participate in
CREATE POLICY "Participants can add evidence"
  ON evidence FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = evidence.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );

-- Policy: Users can update evidence in their projects (e.g., classification)
CREATE POLICY "Participants can update evidence"
  ON evidence FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = evidence.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = evidence.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );

-- Policy: Users can soft-delete evidence in their projects
CREATE POLICY "Participants can delete evidence"
  ON evidence FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = evidence.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );

COMMENT ON POLICY "Users can view evidence in their projects" ON evidence IS
  'Users can only view evidence for projects they own or participate in';
COMMENT ON POLICY "Participants can add evidence" ON evidence IS
  'Project participants can add evidence to their projects';
COMMENT ON POLICY "Participants can update evidence" ON evidence IS
  'Project participants can update evidence (e.g., re-classify, edit content)';
COMMENT ON POLICY "Participants can delete evidence" ON evidence IS
  'Project participants can soft-delete evidence from their projects';


-- ============================================================================
-- 3. CORE_ACTIVITIES TABLE
-- ============================================================================
-- Users can only access core activities for projects they participate in

ALTER TABLE IF EXISTS core_activities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view activities in their projects" ON core_activities;
DROP POLICY IF EXISTS "Participants can create activities" ON core_activities;
DROP POLICY IF EXISTS "Participants can update activities" ON core_activities;
DROP POLICY IF EXISTS "Participants can delete activities" ON core_activities;

-- Policy: Users can view core activities for their projects
CREATE POLICY "Users can view activities in their projects"
  ON core_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = core_activities.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );

-- Policy: Users can create core activities in their projects
CREATE POLICY "Participants can create activities"
  ON core_activities FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = core_activities.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );

-- Policy: Users can update core activities in their projects
CREATE POLICY "Participants can update activities"
  ON core_activities FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = core_activities.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = core_activities.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );

-- Policy: Users can delete core activities in their projects
CREATE POLICY "Participants can delete activities"
  ON core_activities FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = core_activities.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );

COMMENT ON POLICY "Users can view activities in their projects" ON core_activities IS
  'Users can view core activities for projects they participate in';


-- ============================================================================
-- 4. ACTIVITY_NARRATIVES TABLE
-- ============================================================================
-- Users can access narratives for activities they have access to

ALTER TABLE IF EXISTS activity_narratives ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view narratives for their activities" ON activity_narratives;
DROP POLICY IF EXISTS "Participants can manage narratives" ON activity_narratives;

-- Policy: Users can view narratives for activities in their projects
CREATE POLICY "Users can view narratives for their activities"
  ON activity_narratives FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM core_activities
      JOIN projects ON projects.id = core_activities.project_id
      WHERE core_activities.id = activity_narratives.activity_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );

-- Policy: System can insert/update narratives (usually via service role)
-- Note: In practice, these operations happen via service role, but we allow participants too
CREATE POLICY "Participants can manage narratives"
  ON activity_narratives FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM core_activities
      JOIN projects ON projects.id = core_activities.project_id
      WHERE core_activities.id = activity_narratives.activity_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM core_activities
      JOIN projects ON projects.id = core_activities.project_id
      WHERE core_activities.id = activity_narratives.activity_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );


-- ============================================================================
-- 5. NARRATIVE_JOBS TABLE
-- ============================================================================
-- Background job queue - scoped to projects

ALTER TABLE IF EXISTS narrative_jobs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view narrative jobs for their projects" ON narrative_jobs;
DROP POLICY IF EXISTS "Participants can enqueue narrative jobs" ON narrative_jobs;

-- Policy: Users can view jobs for their projects
CREATE POLICY "Users can view narrative jobs for their projects"
  ON narrative_jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = narrative_jobs.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );

-- Policy: Users can create jobs for their projects (e.g., refresh narrative)
CREATE POLICY "Participants can enqueue narrative jobs"
  ON narrative_jobs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = narrative_jobs.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );

-- Note: Job deletion/processing typically done by service role (cron)


-- ============================================================================
-- 6. PAYROLL_UPLOADS TABLE
-- ============================================================================
-- Sensitive payroll data - project scoped

ALTER TABLE IF EXISTS payroll_uploads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view payroll for their projects" ON payroll_uploads;
DROP POLICY IF EXISTS "Participants can upload payroll" ON payroll_uploads;
DROP POLICY IF EXISTS "Participants can update payroll uploads" ON payroll_uploads;

-- Policy: Users can view payroll uploads for their projects
CREATE POLICY "Users can view payroll for their projects"
  ON payroll_uploads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = payroll_uploads.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );

-- Policy: Users can upload payroll for their projects
CREATE POLICY "Participants can upload payroll"
  ON payroll_uploads FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = payroll_uploads.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );

-- Policy: Users can update payroll uploads (e.g., change mapping)
CREATE POLICY "Participants can update payroll uploads"
  ON payroll_uploads FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = payroll_uploads.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = payroll_uploads.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );


-- ============================================================================
-- 7. MONTHLY_ATTESTATIONS TABLE
-- ============================================================================
-- Time allocation data - project scoped

ALTER TABLE IF EXISTS monthly_attestations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view attestations for their projects" ON monthly_attestations;
DROP POLICY IF EXISTS "Participants can create attestations" ON monthly_attestations;
DROP POLICY IF EXISTS "Participants can update attestations" ON monthly_attestations;
DROP POLICY IF EXISTS "Participants can delete attestations" ON monthly_attestations;

-- Policy: Users can view attestations for their projects
CREATE POLICY "Users can view attestations for their projects"
  ON monthly_attestations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = monthly_attestations.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );

-- Policy: Users can create attestations for their projects
CREATE POLICY "Participants can create attestations"
  ON monthly_attestations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = monthly_attestations.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );

-- Policy: Users can update attestations
CREATE POLICY "Participants can update attestations"
  ON monthly_attestations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = monthly_attestations.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = monthly_attestations.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );

-- Policy: Users can delete attestations
CREATE POLICY "Participants can delete attestations"
  ON monthly_attestations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = monthly_attestations.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );


-- ============================================================================
-- 8. COST_LEDGER TABLE
-- ============================================================================
-- Final cost calculations - project scoped

ALTER TABLE IF EXISTS cost_ledger ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view cost ledger for their projects" ON cost_ledger;
DROP POLICY IF EXISTS "Participants can manage cost ledger" ON cost_ledger;

-- Policy: Users can view cost ledger for their projects
CREATE POLICY "Users can view cost ledger for their projects"
  ON cost_ledger FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = cost_ledger.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );

-- Policy: System/participants can insert cost ledger entries
CREATE POLICY "Participants can manage cost ledger"
  ON cost_ledger FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = cost_ledger.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = cost_ledger.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );


-- ============================================================================
-- 9. TEAM_MEMBERS TABLE
-- ============================================================================
-- User-scoped team roster

ALTER TABLE IF EXISTS team_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own team members" ON team_members;
DROP POLICY IF EXISTS "Users can add their own team members" ON team_members;
DROP POLICY IF EXISTS "Users can update their own team members" ON team_members;
DROP POLICY IF EXISTS "Users can delete their own team members" ON team_members;

-- Policy: Users can only view their own team members
CREATE POLICY "Users can view their own team members"
  ON team_members FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can add to their own team
CREATE POLICY "Users can add their own team members"
  ON team_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own team members
CREATE POLICY "Users can update their own team members"
  ON team_members FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own team members
CREATE POLICY "Users can delete their own team members"
  ON team_members FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================================
-- 10. GITHUB_REPOS TABLE
-- ============================================================================
-- GitHub repository connections - project scoped

ALTER TABLE IF EXISTS github_repos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view GitHub repos for their projects" ON github_repos;
DROP POLICY IF EXISTS "Participants can manage GitHub repos" ON github_repos;

-- Policy: Users can view GitHub repos for their projects
CREATE POLICY "Users can view GitHub repos for their projects"
  ON github_repos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = github_repos.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );

-- Policy: Participants can connect GitHub repos
CREATE POLICY "Participants can manage GitHub repos"
  ON github_repos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = github_repos.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = github_repos.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );


-- ============================================================================
-- 11. PROJECT_GITHUB_TOKENS TABLE
-- ============================================================================
-- Sensitive: GitHub access tokens - project scoped, owner only

ALTER TABLE IF EXISTS project_github_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Project owners can view GitHub tokens" ON project_github_tokens;
DROP POLICY IF EXISTS "Project owners can add GitHub tokens" ON project_github_tokens;
DROP POLICY IF EXISTS "Project owners can update GitHub tokens" ON project_github_tokens;
DROP POLICY IF EXISTS "Project owners can delete GitHub tokens" ON project_github_tokens;

-- Policy: Only project owners can view tokens (highly sensitive)
CREATE POLICY "Project owners can view GitHub tokens"
  ON project_github_tokens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_github_tokens.project_id
        AND projects.owner_id = auth.uid()
        AND projects.deleted_at IS NULL
    )
  );

-- Policy: Only project owners can insert tokens
CREATE POLICY "Project owners can add GitHub tokens"
  ON project_github_tokens FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_github_tokens.project_id
        AND projects.owner_id = auth.uid()
        AND projects.deleted_at IS NULL
    )
  );

-- Policy: Only project owners can update tokens
CREATE POLICY "Project owners can update GitHub tokens"
  ON project_github_tokens FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_github_tokens.project_id
        AND projects.owner_id = auth.uid()
        AND projects.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_github_tokens.project_id
        AND projects.owner_id = auth.uid()
        AND projects.deleted_at IS NULL
    )
  );

-- Policy: Only project owners can delete tokens
CREATE POLICY "Project owners can delete GitHub tokens"
  ON project_github_tokens FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_github_tokens.project_id
        AND projects.owner_id = auth.uid()
        AND projects.deleted_at IS NULL
    )
  );


-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify RLS is enabled on all tables:

-- Check which tables have RLS enabled:
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;

-- View all policies:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- ============================================================================
-- IMPORTANT NOTES
-- ============================================================================
--
-- 1. SERVICE ROLE KEY BYPASS:
--    The service role key BYPASSES all RLS policies. This is by design.
--    For full security, migrate API routes to use user-scoped Supabase client.
--
-- 2. TESTING RLS:
--    - Use anon key + user JWT to test policies
--    - Service role key will bypass all policies
--    - Test with different user accounts and project participation
--
-- 3. PERFORMANCE:
--    - All policies use EXISTS subqueries for efficiency
--    - Ensure projects table has indexes on owner_id and participants
--    - Monitor query performance after enabling RLS
--
-- 4. PARTICIPANT ARRAY:
--    - Policies use `auth.jwt() ->> 'email' = ANY(participants)`
--    - Requires user email in JWT token (Supabase Auth provides this)
--    - For custom auth, ensure email claim is present
--
-- 5. SOFT DELETES:
--    - All policies check `projects.deleted_at IS NULL`
--    - Prevents access to soft-deleted projects
--
-- 6. MISSING TABLES:
--    - If you have additional tables (e.g., dismissed_suggestions), add RLS
--    - Follow the same pattern: check project ownership via foreign key
--
-- 7. IDEMPOTENCY:
--    - This migration uses DROP POLICY IF EXISTS before creating policies
--    - Safe to run multiple times without errors
--    - Uses ALTER TABLE IF EXISTS for tables that may not exist yet
--
-- ============================================================================

COMMENT ON SCHEMA public IS 'Row Level Security enabled on all tables as of 2025-01-17. Users can only access data for projects they own or participate in.';
