-- Add activity_type (core/supporting) to core_activities table
-- This is the RDTI-required classification at the activity level
ALTER TABLE core_activities
  ADD COLUMN IF NOT EXISTS activity_type TEXT NOT NULL DEFAULT 'core'
    CHECK (activity_type IN ('core', 'supporting'));
