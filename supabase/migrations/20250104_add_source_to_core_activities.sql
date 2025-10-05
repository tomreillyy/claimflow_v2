-- Add source column to core_activities table
ALTER TABLE core_activities ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'human';

-- Update existing rows to have 'human' source
UPDATE core_activities SET source = 'human' WHERE source IS NULL;
