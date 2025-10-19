-- Create claim_pack_sections table for editable claim pack content
-- Purpose: Store AI-generated and user-edited claim pack sections per project
-- Each project has 11 predefined sections following AIRD Master Context Pack structure

CREATE TABLE IF NOT EXISTS claim_pack_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  content TEXT,
  ai_generated BOOLEAN DEFAULT true,
  last_edited_at TIMESTAMPTZ DEFAULT now(),
  last_edited_by TEXT,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, section_key)
);

-- Create index for fast lookups by project
CREATE INDEX IF NOT EXISTS idx_claim_pack_sections_project_id
  ON claim_pack_sections(project_id);

-- Create index for section key lookups
CREATE INDEX IF NOT EXISTS idx_claim_pack_sections_section_key
  ON claim_pack_sections(project_id, section_key);

-- Add RLS policies
ALTER TABLE claim_pack_sections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read claim pack sections for projects they own or participate in
CREATE POLICY "Users can read claim pack sections for their projects"
  ON claim_pack_sections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = claim_pack_sections.project_id
      AND (
        p.owner_id = auth.uid()
        OR auth.email() = ANY(p.participants)
      )
    )
  );

-- Policy: Users can insert claim pack sections for projects they own or participate in
CREATE POLICY "Users can insert claim pack sections for their projects"
  ON claim_pack_sections
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = claim_pack_sections.project_id
      AND (
        p.owner_id = auth.uid()
        OR auth.email() = ANY(p.participants)
      )
    )
  );

-- Policy: Users can update claim pack sections for projects they own or participate in
CREATE POLICY "Users can update claim pack sections for their projects"
  ON claim_pack_sections
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = claim_pack_sections.project_id
      AND (
        p.owner_id = auth.uid()
        OR auth.email() = ANY(p.participants)
      )
    )
  );

-- Policy: Users can delete claim pack sections for projects they own or participate in
CREATE POLICY "Users can delete claim pack sections for their projects"
  ON claim_pack_sections
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = claim_pack_sections.project_id
      AND (
        p.owner_id = auth.uid()
        OR auth.email() = ANY(p.participants)
      )
    )
  );

-- Add comment explaining the section_key values
COMMENT ON COLUMN claim_pack_sections.section_key IS
  'Predefined section keys: rdti_overview, eligible_rd, project_overview, core_activities, supporting_activities, evidence_index, financials, rd_boundary, overseas_contracted, registration_tieout, attestations';

COMMENT ON COLUMN claim_pack_sections.ai_generated IS
  'TRUE if content was AI-generated, FALSE if manually edited by user';

COMMENT ON COLUMN claim_pack_sections.version IS
  'Increments on each update, allows tracking of content changes';
