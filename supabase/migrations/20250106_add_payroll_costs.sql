-- Payroll Upload → Smart Mapper → Cost Ledger
-- Lean MVP for AU R&D tax compliance cost tracking

-- 1. Payroll Uploads (store file metadata + mapping config)
CREATE TABLE payroll_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mime_type TEXT,
  storage_path TEXT NOT NULL, -- Path in Supabase Storage (private bucket)
  uploaded_by TEXT, -- Email of uploader
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),

  -- Mapping configuration
  header_row_json JSONB, -- Detected headers: ["Name", "Email", "Gross Pay", ...]
  mapping_json JSONB, -- Final mapping: {"employee_email": "Email", "gross_wages": "Gross Pay", ...}
  preset_used TEXT, -- Which preset was used: "xero", "myob", "qbo", "employment_hero", "custom"

  -- Processing status
  rows_count INTEGER, -- Total rows processed
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'mapped', 'processing', 'completed', 'error')),
  error_message TEXT,

  -- Replacement tracking (when re-uploading for same month)
  replaced_upload_id UUID REFERENCES payroll_uploads(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payroll_uploads_project ON payroll_uploads(project_id, uploaded_at DESC);
CREATE INDEX idx_payroll_uploads_status ON payroll_uploads(status);

COMMENT ON TABLE payroll_uploads IS 'Payroll file uploads with column mapping configuration. Private storage with signed URLs.';
COMMENT ON COLUMN payroll_uploads.mapping_json IS 'Final user-confirmed mapping: {system_field: csv_column_name}';
COMMENT ON COLUMN payroll_uploads.preset_used IS 'Preset used: xero|myob|qbo|employment_hero|custom';


-- 2. Monthly Attestations (Person × Month × Activity allocation)
CREATE TABLE monthly_attestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Who and when
  person_identifier TEXT NOT NULL, -- email OR employee_id (whatever we have)
  person_email TEXT, -- Actual email (if available)
  month DATE NOT NULL, -- First day of month (e.g., 2024-10-01)

  -- Which activity (can be NULL for "Unallocated" bucket)
  activity_id UUID REFERENCES core_activities(id) ON DELETE SET NULL,

  -- Allocation amount
  amount_type TEXT NOT NULL CHECK (amount_type IN ('percent', 'hours')),
  amount_value NUMERIC(10, 2) NOT NULL CHECK (amount_value >= 0 AND amount_value <= 100), -- 0-100 for percent, 0+ for hours

  -- Metadata
  note TEXT, -- Optional note (e.g., "50% on ML pipeline, 50% on API refactor")
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT, -- Email of who created this attestation

  -- Prevent duplicates (one allocation per person/month/activity)
  UNIQUE(project_id, person_identifier, month, activity_id)
);

CREATE INDEX idx_monthly_attestations_project_month ON monthly_attestations(project_id, month DESC);
CREATE INDEX idx_monthly_attestations_activity ON monthly_attestations(activity_id);

COMMENT ON TABLE monthly_attestations IS 'Person × Month × Activity time/effort allocation for cost apportionment';
COMMENT ON COLUMN monthly_attestations.amount_type IS 'percent (0-100) or hours (actual hours worked)';
COMMENT ON COLUMN monthly_attestations.person_identifier IS 'Email or employee ID — matches payroll data';


-- 3. Cost Ledger (Final calculated costs per Person × Month × Activity)
CREATE TABLE cost_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Cost line details
  month DATE NOT NULL, -- First day of month (2024-10-01)
  person_email TEXT, -- Email if available
  person_identifier TEXT NOT NULL, -- Fallback to ID if email missing
  person_name TEXT, -- Display name

  -- Activity breakdown (NULL = unapportioned total)
  activity_id UUID REFERENCES core_activities(id) ON DELETE SET NULL,

  -- Amounts
  gross_wages NUMERIC(12, 2) DEFAULT 0,
  superannuation NUMERIC(12, 2) DEFAULT 0,
  on_costs NUMERIC(12, 2) DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL, -- Sum of above

  -- Apportionment tracking
  apportionment_percent NUMERIC(5, 2), -- If apportioned via attestations (0-100)
  apportionment_hours NUMERIC(8, 2), -- If apportioned via hours

  -- Basis (audit trail)
  basis_text TEXT NOT NULL, -- e.g., "Payroll report payroll_jan2025.xlsx (uploaded 2025-01-06)"
  source_upload_id UUID REFERENCES payroll_uploads(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cost_ledger_project_month ON cost_ledger(project_id, month DESC);
CREATE INDEX idx_cost_ledger_activity ON cost_ledger(activity_id);
CREATE INDEX idx_cost_ledger_source ON cost_ledger(source_upload_id);

-- Unique constraint: one ledger line per person/month/activity/upload
CREATE UNIQUE INDEX idx_cost_ledger_unique ON cost_ledger(project_id, month, person_identifier, COALESCE(activity_id::text, 'null'), source_upload_id);

COMMENT ON TABLE cost_ledger IS 'Final cost ledger with apportioned amounts per Person × Month × Activity';
COMMENT ON COLUMN cost_ledger.basis_text IS 'Audit trail: source file + assumptions (e.g., "super defaulted to 0")';
COMMENT ON COLUMN cost_ledger.apportionment_percent IS 'Percent of person-month allocated to this activity (if using attestations)';


-- Storage bucket for private payroll uploads (create via Supabase dashboard or CLI)
-- Bucket name: 'payroll'
-- Public: false (require signed URLs with 15min expiry)
-- Allowed MIME types: text/csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
