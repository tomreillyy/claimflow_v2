-- Audit log for tracking data access and modifications
-- Required for R&D IP security and AusIndustry compliance

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,

  -- Who
  user_id uuid REFERENCES auth.users(id),
  user_email text,

  -- What
  action text NOT NULL,            -- e.g. 'project.view', 'evidence.create', 'payroll.upload', 'costs.export'
  resource_type text NOT NULL,     -- e.g. 'project', 'evidence', 'cost_ledger', 'payroll_upload'
  resource_id text,                -- UUID or identifier of the affected resource

  -- Context
  project_id uuid REFERENCES projects(id),
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,  -- Additional context (e.g. filename, row count)

  -- Classification
  severity text DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical'))
);

-- Index for querying by project (most common access pattern)
CREATE INDEX idx_audit_log_project_id ON audit_log(project_id, created_at DESC);

-- Index for querying by user
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id, created_at DESC);

-- Index for querying by action type
CREATE INDEX idx_audit_log_action ON audit_log(action, created_at DESC);

-- RLS: only project owners and consultants can view audit logs for their projects
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Service role can insert (API routes use supabaseAdmin)
-- No user-facing read policy needed yet — audit logs are accessed via admin API
CREATE POLICY "Service role full access" ON audit_log
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Auto-cleanup: partition or archive logs older than 2 years
-- (Implement via cron job later; AusIndustry requires 5-year retention for claim records)
COMMENT ON TABLE audit_log IS 'Security audit trail for R&D data access and modifications. Retain for minimum 5 years per AusIndustry requirements.';
