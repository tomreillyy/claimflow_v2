-- Enable RLS on all tables that were missing policies
-- Date: 2026-03-25
-- Purpose: Defense-in-depth — ensure every table has RLS even though
--          API routes use supabaseAdmin (service role) with manual access checks.
--
-- IDEMPOTENT: Uses DROP POLICY IF EXISTS before creating policies.
-- SERVICE ROLE: supabaseAdmin bypasses all RLS (by design).
--              These policies protect against direct anon-key access.


-- ============================================================================
-- 1. USER_GITHUB_TOKENS — user-scoped credentials (SENSITIVE)
-- ============================================================================

ALTER TABLE user_github_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own GitHub token" ON user_github_tokens;
DROP POLICY IF EXISTS "Users can insert their own GitHub token" ON user_github_tokens;
DROP POLICY IF EXISTS "Users can update their own GitHub token" ON user_github_tokens;
DROP POLICY IF EXISTS "Users can delete their own GitHub token" ON user_github_tokens;

CREATE POLICY "Users can view their own GitHub token"
  ON user_github_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own GitHub token"
  ON user_github_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own GitHub token"
  ON user_github_tokens FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own GitHub token"
  ON user_github_tokens FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================================
-- 2. USER_JIRA_TOKENS — user-scoped credentials (SENSITIVE)
-- ============================================================================

ALTER TABLE user_jira_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own Jira token" ON user_jira_tokens;
DROP POLICY IF EXISTS "Users can insert their own Jira token" ON user_jira_tokens;
DROP POLICY IF EXISTS "Users can update their own Jira token" ON user_jira_tokens;
DROP POLICY IF EXISTS "Users can delete their own Jira token" ON user_jira_tokens;

CREATE POLICY "Users can view their own Jira token"
  ON user_jira_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Jira token"
  ON user_jira_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Jira token"
  ON user_jira_tokens FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Jira token"
  ON user_jira_tokens FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================================
-- 3. PROJECT_DOCUMENTS — project-scoped knowledge base
-- ============================================================================

ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view documents in their projects" ON project_documents;
DROP POLICY IF EXISTS "Participants can upload documents" ON project_documents;
DROP POLICY IF EXISTS "Participants can update documents" ON project_documents;
DROP POLICY IF EXISTS "Participants can delete documents" ON project_documents;

CREATE POLICY "Users can view documents in their projects"
  ON project_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_documents.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );

CREATE POLICY "Participants can upload documents"
  ON project_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_documents.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );

CREATE POLICY "Participants can update documents"
  ON project_documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_documents.project_id
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
      WHERE projects.id = project_documents.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );

CREATE POLICY "Participants can delete documents"
  ON project_documents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_documents.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );


-- ============================================================================
-- 4. TIMESHEETS — project-scoped personnel hours
-- ============================================================================

ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view timesheets in their projects" ON timesheets;
DROP POLICY IF EXISTS "Participants can create timesheets" ON timesheets;
DROP POLICY IF EXISTS "Participants can update timesheets" ON timesheets;
DROP POLICY IF EXISTS "Participants can delete timesheets" ON timesheets;

CREATE POLICY "Users can view timesheets in their projects"
  ON timesheets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = timesheets.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );

CREATE POLICY "Participants can create timesheets"
  ON timesheets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = timesheets.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );

CREATE POLICY "Participants can update timesheets"
  ON timesheets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = timesheets.project_id
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
      WHERE projects.id = timesheets.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );

CREATE POLICY "Participants can delete timesheets"
  ON timesheets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = timesheets.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );


-- ============================================================================
-- 5. COMPANIES — user-scoped entity settings
-- ============================================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Users can create their own company" ON companies;
DROP POLICY IF EXISTS "Users can update their own company" ON companies;
DROP POLICY IF EXISTS "Users can delete their own company" ON companies;

CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create their own company"
  ON companies FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own company"
  ON companies FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own company"
  ON companies FOR DELETE
  USING (auth.uid() = owner_id);


-- ============================================================================
-- 6. JIRA_CONNECTIONS — project-scoped sync config
-- ============================================================================

ALTER TABLE jira_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view Jira connections for their projects" ON jira_connections;
DROP POLICY IF EXISTS "Participants can manage Jira connections" ON jira_connections;

CREATE POLICY "Users can view Jira connections for their projects"
  ON jira_connections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = jira_connections.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );

CREATE POLICY "Participants can manage Jira connections"
  ON jira_connections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = jira_connections.project_id
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
      WHERE projects.id = jira_connections.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );


-- ============================================================================
-- 7. JIRA_ISSUES — project-scoped cached issues
-- ============================================================================

ALTER TABLE jira_issues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view Jira issues for their projects" ON jira_issues;
DROP POLICY IF EXISTS "Participants can manage Jira issues" ON jira_issues;

CREATE POLICY "Users can view Jira issues for their projects"
  ON jira_issues FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = jira_issues.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );

CREATE POLICY "Participants can manage Jira issues"
  ON jira_issues FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = jira_issues.project_id
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
      WHERE projects.id = jira_issues.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );


-- ============================================================================
-- 8. JIRA_ISSUE_MATCHES — project-scoped AI match results
-- ============================================================================

ALTER TABLE jira_issue_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view Jira matches for their projects" ON jira_issue_matches;
DROP POLICY IF EXISTS "Participants can manage Jira matches" ON jira_issue_matches;

CREATE POLICY "Users can view Jira matches for their projects"
  ON jira_issue_matches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = jira_issue_matches.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );

CREATE POLICY "Participants can manage Jira matches"
  ON jira_issue_matches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = jira_issue_matches.project_id
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
      WHERE projects.id = jira_issue_matches.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );


-- ============================================================================
-- 9. GITHUB_COMMIT_MATCHES — project-scoped commit analysis
-- ============================================================================

ALTER TABLE github_commit_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view GitHub matches for their projects" ON github_commit_matches;
DROP POLICY IF EXISTS "Participants can manage GitHub matches" ON github_commit_matches;

CREATE POLICY "Users can view GitHub matches for their projects"
  ON github_commit_matches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = github_commit_matches.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );

CREATE POLICY "Participants can manage GitHub matches"
  ON github_commit_matches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = github_commit_matches.project_id
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
      WHERE projects.id = github_commit_matches.project_id
        AND (
          projects.owner_id = auth.uid() OR
          auth.jwt() ->> 'email' = ANY(projects.participants)
        )
        AND projects.deleted_at IS NULL
    )
  );


-- ============================================================================
-- 10. CONSULTANT_CLIENTS — consultant can only see their own links
-- ============================================================================

ALTER TABLE consultant_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Consultants can view their own clients" ON consultant_clients;
DROP POLICY IF EXISTS "Consultants can insert their own clients" ON consultant_clients;
DROP POLICY IF EXISTS "Consultants can update their own clients" ON consultant_clients;
DROP POLICY IF EXISTS "Consultants can delete their own clients" ON consultant_clients;

CREATE POLICY "Consultants can view their own clients"
  ON consultant_clients FOR SELECT
  USING (auth.uid() = consultant_user_id);

CREATE POLICY "Consultants can insert their own clients"
  ON consultant_clients FOR INSERT
  WITH CHECK (auth.uid() = consultant_user_id);

CREATE POLICY "Consultants can update their own clients"
  ON consultant_clients FOR UPDATE
  USING (auth.uid() = consultant_user_id)
  WITH CHECK (auth.uid() = consultant_user_id);

CREATE POLICY "Consultants can delete their own clients"
  ON consultant_clients FOR DELETE
  USING (auth.uid() = consultant_user_id);


-- ============================================================================
-- 11. CONSULTANT_BRANDING — user-scoped branding
-- ============================================================================

ALTER TABLE consultant_branding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Consultants can view their own branding" ON consultant_branding;
DROP POLICY IF EXISTS "Consultants can insert their own branding" ON consultant_branding;
DROP POLICY IF EXISTS "Consultants can update their own branding" ON consultant_branding;
DROP POLICY IF EXISTS "Consultants can delete their own branding" ON consultant_branding;
-- Allow anyone to read branding (used in shared claim pack views)
DROP POLICY IF EXISTS "Anyone can view consultant branding" ON consultant_branding;

CREATE POLICY "Anyone can view consultant branding"
  ON consultant_branding FOR SELECT
  USING (true);

CREATE POLICY "Consultants can insert their own branding"
  ON consultant_branding FOR INSERT
  WITH CHECK (auth.uid() = consultant_user_id);

CREATE POLICY "Consultants can update their own branding"
  ON consultant_branding FOR UPDATE
  USING (auth.uid() = consultant_user_id)
  WITH CHECK (auth.uid() = consultant_user_id);

CREATE POLICY "Consultants can delete their own branding"
  ON consultant_branding FOR DELETE
  USING (auth.uid() = consultant_user_id);


-- ============================================================================
-- 12. CONSULTANT_TEAM_MEMBERS — lead consultant manages their team
-- (Table may not exist yet — wrapped in DO block)
-- ============================================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'consultant_team_members') THEN
    ALTER TABLE consultant_team_members ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Lead consultants can view their team" ON consultant_team_members;
    DROP POLICY IF EXISTS "Lead consultants can manage their team" ON consultant_team_members;
    DROP POLICY IF EXISTS "Team members can view their own record" ON consultant_team_members;

    CREATE POLICY "Lead consultants can view their team"
      ON consultant_team_members FOR SELECT
      USING (auth.uid() = lead_consultant_id);

    CREATE POLICY "Team members can view their own record"
      ON consultant_team_members FOR SELECT
      USING (auth.uid() = member_user_id);

    CREATE POLICY "Lead consultants can manage their team"
      ON consultant_team_members FOR ALL
      USING (auth.uid() = lead_consultant_id)
      WITH CHECK (auth.uid() = lead_consultant_id);
  END IF;
END $$;


-- ============================================================================
-- 13. CONSULTANT_TEAM_ASSIGNMENTS — lead consultant manages assignments
-- (Table may not exist yet — wrapped in DO block)
-- ============================================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'consultant_team_assignments') THEN
    ALTER TABLE consultant_team_assignments ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Lead consultants can view their assignments" ON consultant_team_assignments;
    DROP POLICY IF EXISTS "Lead consultants can manage their assignments" ON consultant_team_assignments;

    CREATE POLICY "Lead consultants can view their assignments"
      ON consultant_team_assignments FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM consultant_team_members
          WHERE consultant_team_members.id = consultant_team_assignments.team_member_id
            AND consultant_team_members.lead_consultant_id = auth.uid()
        )
      );

    CREATE POLICY "Lead consultants can manage their assignments"
      ON consultant_team_assignments FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM consultant_team_members
          WHERE consultant_team_members.id = consultant_team_assignments.team_member_id
            AND consultant_team_members.lead_consultant_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM consultant_team_members
          WHERE consultant_team_members.id = consultant_team_assignments.team_member_id
            AND consultant_team_members.lead_consultant_id = auth.uid()
        )
      );
  END IF;
END $$;


-- ============================================================================
-- 14. CONSULTANT_PROFILES — public listing with owner-only writes
-- (Table may not exist yet — wrapped in DO block)
-- ============================================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'consultant_profiles') THEN
    ALTER TABLE consultant_profiles ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Anyone can view listed consultant profiles" ON consultant_profiles;
    DROP POLICY IF EXISTS "Users can view their own profile" ON consultant_profiles;
    DROP POLICY IF EXISTS "Users can insert their own profile" ON consultant_profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON consultant_profiles;
    DROP POLICY IF EXISTS "Users can delete their own profile" ON consultant_profiles;

    -- Public can see listed profiles (marketplace)
    CREATE POLICY "Anyone can view listed consultant profiles"
      ON consultant_profiles FOR SELECT
      USING (is_listed = true);

    -- Users can always see their own profile (even if unlisted)
    CREATE POLICY "Users can view their own profile"
      ON consultant_profiles FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own profile"
      ON consultant_profiles FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own profile"
      ON consultant_profiles FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can delete their own profile"
      ON consultant_profiles FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;


-- ============================================================================
-- 15. MARKETPLACE_INQUIRIES — visible to consultant or client
-- (Table may not exist yet — wrapped in DO block)
-- ============================================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'marketplace_inquiries') THEN
    ALTER TABLE marketplace_inquiries ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view their own inquiries" ON marketplace_inquiries;
    DROP POLICY IF EXISTS "Clients can create inquiries" ON marketplace_inquiries;
    DROP POLICY IF EXISTS "Users can update their own inquiries" ON marketplace_inquiries;

    -- Both the consultant and the client can see the inquiry
    CREATE POLICY "Users can view their own inquiries"
      ON marketplace_inquiries FOR SELECT
      USING (
        auth.uid() = consultant_user_id OR
        auth.uid() = client_user_id
      );

    -- Only the client creates an inquiry
    CREATE POLICY "Clients can create inquiries"
      ON marketplace_inquiries FOR INSERT
      WITH CHECK (auth.uid() = client_user_id);

    -- Either party can update (consultant responds, client edits)
    CREATE POLICY "Users can update their own inquiries"
      ON marketplace_inquiries FOR UPDATE
      USING (
        auth.uid() = consultant_user_id OR
        auth.uid() = client_user_id
      )
      WITH CHECK (
        auth.uid() = consultant_user_id OR
        auth.uid() = client_user_id
      );
  END IF;
END $$;


-- ============================================================================
-- FIX: Audit log policy is too permissive (allows anon read of all logs)
-- Replace with owner/participant-scoped SELECT + service-role INSERT
-- ============================================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_log') THEN
    DROP POLICY IF EXISTS "Service role full access" ON audit_log;

    -- No anon-key SELECT — audit logs are read via supabaseAdmin in API routes
    -- Service role bypasses RLS anyway, so no explicit policy needed for inserts.
    -- Add a restrictive SELECT for defense-in-depth:
    CREATE POLICY "Users can view audit logs for their projects"
      ON audit_log FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM projects
          WHERE projects.id = audit_log.project_id
            AND (
              projects.owner_id = auth.uid() OR
              auth.jwt() ->> 'email' = ANY(projects.participants)
            )
            AND projects.deleted_at IS NULL
        )
      );
  END IF;
END $$;


-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this query to verify all public tables have RLS enabled:
--
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
--
-- Every row should show rowsecurity = true.
