-- AI features consent toggle per project
-- Default true for backward compatibility with existing projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ai_features_enabled boolean DEFAULT true;

COMMENT ON COLUMN projects.ai_features_enabled IS 'User consent for AI-powered features (auto-linking, classification, activity generation). When false, no project data is sent to external AI providers.';
