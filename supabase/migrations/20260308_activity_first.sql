-- Activity-First Architecture Migration
-- Elevates activities to first-class objects with structured progression
-- Adds status lifecycle (draft/adopted/archived) and activity_evidence join table

-- 1. Add new columns to core_activities
ALTER TABLE core_activities
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'adopted', 'archived')),
  ADD COLUMN IF NOT EXISTS adopted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS adopted_by UUID,
  ADD COLUMN IF NOT EXISTS hypothesis_text TEXT,
  ADD COLUMN IF NOT EXISTS conclusion_text TEXT,
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- 2. Create activity_evidence join table
CREATE TABLE IF NOT EXISTS activity_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES core_activities(id) ON DELETE CASCADE,
  evidence_id UUID NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
  systematic_step TEXT NOT NULL CHECK (systematic_step IN (
    'Hypothesis', 'Experiment', 'Observation', 'Evaluation', 'Conclusion'
  )),
  link_source TEXT NOT NULL DEFAULT 'auto' CHECK (link_source IN ('auto', 'manual')),
  link_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(activity_id, evidence_id, systematic_step)
);

CREATE INDEX IF NOT EXISTS idx_ae_activity ON activity_evidence(activity_id);
CREATE INDEX IF NOT EXISTS idx_ae_evidence ON activity_evidence(evidence_id);
CREATE INDEX IF NOT EXISTS idx_ae_activity_step ON activity_evidence(activity_id, systematic_step);

-- 3. Migrate existing evidence links into activity_evidence
INSERT INTO activity_evidence (activity_id, evidence_id, systematic_step, link_source)
SELECT
  e.linked_activity_id,
  e.id,
  COALESCE(
    CASE WHEN e.systematic_step_primary IN ('Hypothesis','Experiment','Observation','Evaluation','Conclusion')
         THEN e.systematic_step_primary
         ELSE NULL
    END,
    'Observation'
  ),
  COALESCE(e.link_source, 'auto')
FROM evidence e
WHERE e.linked_activity_id IS NOT NULL
  AND (e.soft_deleted IS NULL OR e.soft_deleted = false)
ON CONFLICT (activity_id, evidence_id, systematic_step) DO NOTHING;

-- 4. RLS policies for activity_evidence
ALTER TABLE activity_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activity_evidence in their projects"
  ON activity_evidence FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM core_activities ca
      JOIN projects p ON p.id = ca.project_id
      WHERE ca.id = activity_evidence.activity_id
        AND (p.owner_id = auth.uid() OR p.participants @> ARRAY[(SELECT email FROM auth.users WHERE id = auth.uid())])
    )
  );

CREATE POLICY "Users can insert activity_evidence in their projects"
  ON activity_evidence FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM core_activities ca
      JOIN projects p ON p.id = ca.project_id
      WHERE ca.id = activity_evidence.activity_id
        AND (p.owner_id = auth.uid() OR p.participants @> ARRAY[(SELECT email FROM auth.users WHERE id = auth.uid())])
    )
  );

CREATE POLICY "Users can delete activity_evidence in their projects"
  ON activity_evidence FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM core_activities ca
      JOIN projects p ON p.id = ca.project_id
      WHERE ca.id = activity_evidence.activity_id
        AND (p.owner_id = auth.uid() OR p.participants @> ARRAY[(SELECT email FROM auth.users WHERE id = auth.uid())])
    )
  );
