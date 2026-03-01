-- GitHub Integration Enhancement: Per-User Tokens + Keyword/Branch Filters
-- Moves OAuth tokens from per-project to per-user, and adds optional filters to repo connections

-- 1. New user-level GitHub token table
CREATE TABLE user_github_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  access_token TEXT NOT NULL,
  github_username TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_github_tokens_user ON user_github_tokens(user_id);

COMMENT ON TABLE user_github_tokens IS 'Stores GitHub OAuth tokens at the user level (one auth covers all projects)';

-- 2. Add filter columns to github_repos
ALTER TABLE github_repos
  ADD COLUMN IF NOT EXISTS filter_branches TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS filter_keywords TEXT[] DEFAULT '{}';

COMMENT ON COLUMN github_repos.filter_branches IS 'Optional branch names to filter commits. Empty = all branches.';
COMMENT ON COLUMN github_repos.filter_keywords IS 'Optional keywords matched against commit messages/PR titles. Empty = no keyword filter.';

-- Note: project_github_tokens is kept for backward compatibility.
-- Existing projects with per-project tokens will continue to work.
