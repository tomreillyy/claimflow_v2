-- GitHub commit matches table for Record Finder feature
-- Mirrors jira_issue_matches for GitHub commits/PRs with human review workflow

CREATE TABLE github_commit_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  commit_sha TEXT NOT NULL,
  commit_message TEXT NOT NULL,
  commit_url TEXT,
  commit_meta JSONB DEFAULT '{}',
  activity_id UUID REFERENCES core_activities(id) ON DELETE SET NULL,
  match_score NUMERIC NOT NULL DEFAULT 0,
  match_confidence TEXT DEFAULT 'low',
  ai_summary TEXT,
  suggested_step TEXT,
  review_status TEXT DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  evidence_id UUID REFERENCES evidence(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, commit_sha)
);

CREATE INDEX idx_github_matches_project ON github_commit_matches(project_id);
CREATE INDEX idx_github_matches_review ON github_commit_matches(review_status);
CREATE INDEX idx_github_matches_activity ON github_commit_matches(activity_id);
CREATE INDEX idx_github_matches_evidence ON github_commit_matches(evidence_id);
