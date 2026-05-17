-- Xero integration: OAuth token storage + project connection config
-- Mirrors the Jira integration pattern (user-level tokens, project-level config)

-- User-level Xero OAuth tokens (one per user, covers all their projects)
CREATE TABLE IF NOT EXISTS user_xero_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  tenant_name TEXT,
  token_expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_xero_tokens_user ON user_xero_tokens(user_id);

-- Project-level Xero connection config (claim period, exclusions, sync status)
CREATE TABLE IF NOT EXISTS xero_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  claim_start_date DATE,
  claim_end_date DATE,
  excluded_employee_ids TEXT[] DEFAULT '{}',
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'idle',
  sync_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_xero_connections_project ON xero_connections(project_id);

-- Track Xero origin on fin_team (for duplicate detection + re-sync)
ALTER TABLE fin_team ADD COLUMN IF NOT EXISTS xero_employee_id TEXT;
ALTER TABLE fin_team ADD COLUMN IF NOT EXISTS xero_imported_at TIMESTAMPTZ;

-- Track Xero origin on fin_contractors (for duplicate detection)
ALTER TABLE fin_contractors ADD COLUMN IF NOT EXISTS xero_invoice_id TEXT;
ALTER TABLE fin_contractors ADD COLUMN IF NOT EXISTS xero_imported_at TIMESTAMPTZ;

-- Indexes for duplicate lookups
CREATE INDEX IF NOT EXISTS idx_fin_team_xero ON fin_team(xero_employee_id) WHERE xero_employee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fin_contractors_xero ON fin_contractors(xero_invoice_id) WHERE xero_invoice_id IS NOT NULL;
