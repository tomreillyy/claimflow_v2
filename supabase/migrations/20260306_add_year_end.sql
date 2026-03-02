-- Add year_end to support multi-year projects
-- Existing `year` column serves as the start year

ALTER TABLE projects ADD COLUMN IF NOT EXISTS year_end INTEGER;
