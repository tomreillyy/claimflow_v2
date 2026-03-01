-- Jira integration tables for Record Finder feature

-- 1. User-level Jira OAuth tokens (mirrors user_github_tokens)
-- Jira access tokens expire every hour, so we store refresh_token + expiry
CREATE TABLE user_jira_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  cloud_id TEXT NOT NULL,
  site_url TEXT,
  jira_account_id TEXT,
  jira_display_name TEXT,
  token_expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_jira_tokens_user ON user_jira_tokens(user_id);

-- 2. Project-level Jira connection config (mirrors github_repos)
CREATE TABLE jira_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  jira_project_keys TEXT[] DEFAULT '{}',
  jql_filter TEXT,
  filter_keywords TEXT[] DEFAULT '{}',
  filter_issue_types TEXT[] DEFAULT '{}',
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'idle',
  sync_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jira_connections_project ON jira_connections(project_id);

-- 3. Cached Jira issues (staging table before review)
CREATE TABLE jira_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  jira_key TEXT NOT NULL,
  jira_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  description TEXT,
  issue_type TEXT,
  status TEXT,
  priority TEXT,
  assignee_email TEXT,
  assignee_name TEXT,
  labels TEXT[] DEFAULT '{}',
  components TEXT[] DEFAULT '{}',
  sprint_name TEXT,
  story_points NUMERIC,
  jira_created_at TIMESTAMPTZ,
  jira_updated_at TIMESTAMPTZ,
  jira_resolved_at TIMESTAMPTZ,
  comments_text TEXT,
  content_hash TEXT,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, jira_key)
);

CREATE INDEX idx_jira_issues_project ON jira_issues(project_id);
CREATE INDEX idx_jira_issues_key ON jira_issues(jira_key);
CREATE INDEX idx_jira_issues_content_hash ON jira_issues(content_hash);

-- 4. AI match results with human review workflow
CREATE TABLE jira_issue_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  jira_issue_id UUID NOT NULL REFERENCES jira_issues(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES core_activities(id) ON DELETE SET NULL,
  match_score NUMERIC NOT NULL DEFAULT 0,
  match_confidence TEXT DEFAULT 'low',
  ai_summary TEXT,
  suggested_step TEXT,
  suggested_step_confidence NUMERIC DEFAULT 0,
  review_status TEXT DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  evidence_id UUID REFERENCES evidence(id),
  keyword_score NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, jira_issue_id, activity_id)
);

CREATE INDEX idx_jira_matches_project ON jira_issue_matches(project_id);
CREATE INDEX idx_jira_matches_review ON jira_issue_matches(review_status);
CREATE INDEX idx_jira_matches_activity ON jira_issue_matches(activity_id);
CREATE INDEX idx_jira_matches_evidence ON jira_issue_matches(evidence_id);
