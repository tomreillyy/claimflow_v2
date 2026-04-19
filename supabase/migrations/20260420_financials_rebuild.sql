-- Financials workspace rebuild: purpose-built RDTI calculator tables
-- Replaces the old cost_ledger/monthly_attestations model with
-- per-person annual salary + hours-based activity splits

-- Add numeric turnover to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS aggregated_turnover NUMERIC(14,2);

-- Team roster (one row per person per project)
CREATE TABLE IF NOT EXISTS fin_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  person_name TEXT NOT NULL,
  person_email TEXT,
  base_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  super_amount NUMERIC(12,2) DEFAULT 0,
  payroll_tax_amount NUMERIC(12,2) DEFAULT 0,
  workers_comp_amount NUMERIC(12,2) DEFAULT 0,
  leave_accrual_amount NUMERIC(12,2) DEFAULT 0,
  is_associate BOOLEAN DEFAULT false,
  paid_in_cash NUMERIC(12,2) DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fin_team_project ON fin_team(project_id);

-- Activity splits: hours per person per activity (out of 1720 FY standard)
CREATE TABLE IF NOT EXISTS fin_activity_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL REFERENCES fin_team(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES core_activities(id) ON DELETE CASCADE,
  hours NUMERIC(8,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_member_id, activity_id)
);

CREATE INDEX IF NOT EXISTS idx_fin_splits_member ON fin_activity_splits(team_member_id);

-- Contractor invoices
CREATE TABLE IF NOT EXISTS fin_contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL DEFAULT '',
  activity_id UUID REFERENCES core_activities(id) ON DELETE SET NULL,
  invoice_date DATE,
  invoice_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  rd_portion NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fin_contractors_project ON fin_contractors(project_id);

-- Materials & consumables
CREATE TABLE IF NOT EXISTS fin_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL DEFAULT '',
  activity_id UUID REFERENCES core_activities(id) ON DELETE SET NULL,
  invoice_date DATE,
  cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  rd_portion NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fin_materials_project ON fin_materials(project_id);

-- Overheads (apportioned)
CREATE TABLE IF NOT EXISTS fin_overheads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL DEFAULT '',
  apportionment_basis TEXT DEFAULT 'labour_ratio'
    CHECK (apportionment_basis IN ('labour_ratio', 'floor_area', 'direct_measure', 'custom')),
  annual_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  rd_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fin_overheads_project ON fin_overheads(project_id);

-- Decline in value (depreciation on R&D assets)
CREATE TABLE IF NOT EXISTS fin_depreciation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL DEFAULT '',
  purchase_date DATE,
  purchase_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  effective_life_years NUMERIC(4,1) NOT NULL DEFAULT 1,
  method TEXT DEFAULT 'prime_cost'
    CHECK (method IN ('prime_cost', 'diminishing_value')),
  rd_use_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fin_depreciation_project ON fin_depreciation(project_id);

-- Adjustments (feedstock, recoupment, balancing) — 3 fixed rows per project
CREATE TABLE IF NOT EXISTS fin_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  adjustment_type TEXT NOT NULL
    CHECK (adjustment_type IN ('feedstock', 'recoupment', 'balancing')),
  applies BOOLEAN DEFAULT false,
  amount NUMERIC(12,2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, adjustment_type)
);

CREATE INDEX IF NOT EXISTS idx_fin_adjustments_project ON fin_adjustments(project_id);

-- RLS policies (service role bypasses, matching existing pattern)
ALTER TABLE fin_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin_activity_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin_contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin_overheads ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin_depreciation ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin_adjustments ENABLE ROW LEVEL SECURITY;

-- Grant service role full access (API routes use supabaseAdmin)
CREATE POLICY "Service role full access" ON fin_team FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON fin_activity_splits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON fin_contractors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON fin_materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON fin_overheads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON fin_depreciation FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON fin_adjustments FOR ALL USING (true) WITH CHECK (true);
