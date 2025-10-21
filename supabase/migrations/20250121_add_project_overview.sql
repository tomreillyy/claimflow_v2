-- Add project_overview column to projects table
-- This stores a longer description/overview of the project (separate from hypothesis)

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS project_overview TEXT;

COMMENT ON COLUMN projects.project_overview IS 'Longer project description/overview for context and claim pack generation';
