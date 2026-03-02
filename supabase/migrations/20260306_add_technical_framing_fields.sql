-- Add technical framing fields to projects table
-- These support the structured R&D uncertainty documentation workflow

ALTER TABLE projects ADD COLUMN IF NOT EXISTS technical_uncertainty TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS knowledge_gap TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS testing_method TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS success_criteria TEXT;
