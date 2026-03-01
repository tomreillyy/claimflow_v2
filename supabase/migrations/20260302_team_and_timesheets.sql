-- Extend team_members with role, department, and invite tracking
ALTER TABLE team_members ADD COLUMN role TEXT;
ALTER TABLE team_members ADD COLUMN department TEXT;
ALTER TABLE team_members ADD COLUMN invited_at TIMESTAMPTZ;

-- Weekly timesheet entries per person per project
CREATE TABLE timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  person_email TEXT NOT NULL,
  week_start DATE NOT NULL,
  mon NUMERIC(4,1) DEFAULT 0,
  tue NUMERIC(4,1) DEFAULT 0,
  wed NUMERIC(4,1) DEFAULT 0,
  thu NUMERIC(4,1) DEFAULT 0,
  fri NUMERIC(4,1) DEFAULT 0,
  sat NUMERIC(4,1) DEFAULT 0,
  sun NUMERIC(4,1) DEFAULT 0,
  note TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, person_email, week_start)
);

CREATE INDEX idx_timesheets_project_week ON timesheets(project_id, week_start DESC);
CREATE INDEX idx_timesheets_person ON timesheets(person_email);
