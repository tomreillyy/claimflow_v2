-- GitHub Integration Migration
-- Add tables and columns for GitHub repository sync functionality

-- Store GitHub repository connections per project
CREATE TABLE github_repos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  repo_owner TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ,
  last_synced_sha TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, repo_owner, repo_name)
);

-- Store GitHub access tokens (one per project)
CREATE TABLE project_github_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  access_token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add meta column to evidence table for storing commit metadata
-- Format: {"sha": "abc123", "commit_url": "https://...", "repo": "owner/name", "files_changed": 5, "additions": 42, "deletions": 8}
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS meta JSONB;

-- Create indexes for performance
CREATE INDEX idx_github_repos_project ON github_repos(project_id);
CREATE INDEX idx_project_github_tokens_project ON project_github_tokens(project_id);
CREATE INDEX idx_evidence_meta ON evidence USING GIN(meta) WHERE meta IS NOT NULL;

-- Comments for documentation
COMMENT ON TABLE github_repos IS 'Stores GitHub repository connections for each project';
COMMENT ON TABLE project_github_tokens IS 'Stores encrypted GitHub OAuth access tokens per project';
COMMENT ON COLUMN evidence.meta IS 'JSONB metadata for source-specific data (e.g., commit SHA, PR number, etc.)';
