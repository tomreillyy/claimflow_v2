-- Add meta column to core_activities for storing structured metadata
ALTER TABLE core_activities ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT NULL;

-- Create GIN index for efficient JSONB queries (optional, for future features)
CREATE INDEX IF NOT EXISTS idx_core_activities_meta ON core_activities USING GIN (meta);

-- Example meta structure:
-- {
--   "success_criteria": "Recall ≥60% @ FPR ≤2% on holdout; PR-AUC ≥0.45",
--   "evidence_links": [123, 456, 789],
--   "category": "Anomaly Detection"
-- }
