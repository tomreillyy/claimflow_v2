-- Add activity type classification to evidence table
-- Purpose: Classify evidence as CORE R&D (s.355-25) or SUPPORTING R&D (s.355-30)
-- Date: 2025-01-20
-- Context: Required for Australian RDTI compliance and claim pack generation

-- Add activity type columns to evidence table
ALTER TABLE evidence
  ADD COLUMN activity_type TEXT DEFAULT 'core' CHECK (activity_type IN ('core', 'supporting')),
  ADD COLUMN activity_type_source TEXT DEFAULT 'auto' CHECK (activity_type_source IN ('auto', 'manual')),
  ADD COLUMN activity_type_classified_at TIMESTAMPTZ;

-- Create index for efficient filtering by activity type
CREATE INDEX idx_evidence_activity_type ON evidence(project_id, activity_type)
  WHERE activity_type IS NOT NULL AND (soft_deleted IS NULL OR soft_deleted = false);

-- Add comments for documentation
COMMENT ON COLUMN evidence.activity_type IS
  'RDTI classification: "core" (s.355-25 - experimental R&D) or "supporting" (s.355-30 - activities with dominant purpose of supporting core R&D)';

COMMENT ON COLUMN evidence.activity_type_source IS
  'Classification source: "auto" (AI-classified using project context) or "manual" (user override via UI)';

COMMENT ON COLUMN evidence.activity_type_classified_at IS
  'Timestamp when activity type was classified (NULL if not yet classified)';

-- Update existing evidence to default values
-- Conservative approach: assume all existing evidence is core R&D until classified
UPDATE evidence
SET
  activity_type = 'core',
  activity_type_source = 'auto',
  activity_type_classified_at = NULL
WHERE activity_type IS NULL;

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration complete: Added activity_type classification to evidence table';
  RAISE NOTICE 'Default: All existing evidence set to "core" (can be reclassified via API)';
END $$;
