-- Team Members: User-scoped team roster for evidence attribution
-- Ruthlessly minimal: just email + name, no roles/FTE/company complexity

CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Person details
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One entry per email per user
  UNIQUE(user_id, email)
);

-- Indexes for fast lookups
CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_team_members_email ON team_members(email);

-- Comments for documentation
COMMENT ON TABLE team_members IS 'User-scoped team roster for pre-populating person picker in evidence entry. Auto-populated from payroll/evidence data.';
COMMENT ON COLUMN team_members.email IS 'Unique email per user - used for matching to evidence author_email and payroll data';
COMMENT ON COLUMN team_members.full_name IS 'Display name for person picker dropdowns';
