-- Add companies table for RDTI entity-level settings
-- Each user has one company (owner_id UNIQUE). Created lazily on first save.

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Mandatory fields
  company_name TEXT NOT NULL DEFAULT '',
  entity_type TEXT,                            -- 'australian_company', 'foreign_company_au_pe', 'not_eligible'
  aggregated_turnover_band TEXT,               -- 'under_20m', 'over_20m', 'not_sure'
  financial_year_end TEXT DEFAULT '06-30',      -- MM-DD format, default 30 June

  -- Recommended fields
  abn TEXT,                                    -- 11-digit Australian Business Number
  industry TEXT,                               -- 'software', 'engineering', 'manufacturing', 'biotech', 'other'
  overseas_rd BOOLEAN DEFAULT false,
  rd_for_another_entity BOOLEAN DEFAULT false,
  part_of_group BOOLEAN DEFAULT false,

  -- Conditional fields (shown based on other answers)
  estimated_rd_spend NUMERIC,                  -- only if turnover >= $20m
  rd_above_150m BOOLEAN DEFAULT false,         -- only for large entities
  government_grants BOOLEAN DEFAULT false,
  feedstock_involvement BOOLEAN DEFAULT false,  -- only if industry = manufacturing

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Link projects to companies
ALTER TABLE projects ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
