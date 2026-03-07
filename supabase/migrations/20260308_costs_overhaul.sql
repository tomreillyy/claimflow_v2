-- Costs Overhaul: AI-first cost capture with non-labour costs and auto-calculations

-- Company state/territory for payroll tax calculation
ALTER TABLE companies ADD COLUMN IF NOT EXISTS state_territory TEXT;

-- Audit flags on cost_ledger for auto-calculations
ALTER TABLE cost_ledger ADD COLUMN IF NOT EXISTS super_auto_calculated BOOLEAN DEFAULT false;
ALTER TABLE cost_ledger ADD COLUMN IF NOT EXISTS oncosts_auto_calculated BOOLEAN DEFAULT false;
ALTER TABLE cost_ledger ADD COLUMN IF NOT EXISTS cost_source TEXT DEFAULT 'csv';
-- cost_source: 'csv' | 'ai_interview' | 'manual' | 'xero'

-- Non-labour costs (contractors + cloud/software)
CREATE TABLE IF NOT EXISTS non_labour_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  cost_category TEXT NOT NULL CHECK (cost_category IN ('contractor', 'cloud_software')),
  description TEXT NOT NULL,
  vendor_name TEXT,
  month TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  rd_percent NUMERIC(5,2) DEFAULT 100,
  rd_amount NUMERIC(12,2) GENERATED ALWAYS AS (amount * rd_percent / 100) STORED,
  activity_id UUID REFERENCES core_activities(id) ON DELETE SET NULL,
  basis_text TEXT NOT NULL,
  ai_suggested BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_non_labour_costs_project ON non_labour_costs(project_id);

-- Project cost settings (configurable rates)
CREATE TABLE IF NOT EXISTS project_cost_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  sgc_rate NUMERIC(5,2) DEFAULT 11.5,
  workers_comp_rate NUMERIC(5,2) DEFAULT 2.0,
  leave_provision_rate NUMERIC(5,2) DEFAULT 8.33,
  payroll_tax_rate NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies for non_labour_costs
ALTER TABLE non_labour_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view non_labour_costs for their projects" ON non_labour_costs
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT id FROM projects WHERE participants @> ARRAY[(SELECT email::text FROM auth.users WHERE id = auth.uid())]
    )
  );

CREATE POLICY "Users can insert non_labour_costs for their projects" ON non_labour_costs
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update non_labour_costs for their projects" ON non_labour_costs
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete non_labour_costs for their projects" ON non_labour_costs
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- RLS policies for project_cost_settings
ALTER TABLE project_cost_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cost settings for their projects" ON project_cost_settings
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT id FROM projects WHERE participants @> ARRAY[(SELECT email::text FROM auth.users WHERE id = auth.uid())]
    )
  );

CREATE POLICY "Users can manage cost settings for their projects" ON project_cost_settings
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );
