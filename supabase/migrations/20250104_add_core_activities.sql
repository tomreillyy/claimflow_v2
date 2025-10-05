-- Create core_activities table
CREATE TABLE IF NOT EXISTS core_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  uncertainty TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_core_activities_project ON core_activities(project_id);

-- Create dismissed_suggestions table
CREATE TABLE IF NOT EXISTS dismissed_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  suggestion_fingerprint TEXT NOT NULL,
  dismissed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, suggestion_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_dismissed_suggestions_project ON dismissed_suggestions(project_id);

-- Create suggestion_log table
CREATE TABLE IF NOT EXISTS suggestion_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  suggestion_fingerprint TEXT NOT NULL,
  shown_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suggestion_log_project_shown ON suggestion_log(project_id, shown_at DESC);
