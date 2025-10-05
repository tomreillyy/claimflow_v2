-- Per-Activity R&D Narratives
-- Auto-generated summaries of work progression (H→E→O→Ev→C) with dated quotes

-- Activity narratives storage (cache table)
CREATE TABLE activity_narratives (
  activity_id UUID PRIMARY KEY REFERENCES core_activities(id) ON DELETE CASCADE,
  text TEXT, -- The generated paragraph (5-8 sentences, ~180 words)
  confidence TEXT CHECK (confidence IN ('high', 'low')), -- AI confidence in summary quality
  missing_steps TEXT[], -- List of missing systematic steps (e.g., ["Observation", "Conclusion"])
  generated_at TIMESTAMPTZ, -- When this narrative was generated
  input_hash VARCHAR(64), -- SHA-256 hash of inputs (for staleness detection)
  version SMALLINT DEFAULT 1 -- Schema version for future migrations
);

-- Index for housekeeping queries
CREATE INDEX idx_activity_narratives_generated ON activity_narratives(generated_at DESC);

-- Background job queue for narrative generation
CREATE TABLE narrative_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES core_activities(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  priority SMALLINT DEFAULT 0, -- Higher = process first (for user-triggered refreshes)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(activity_id) -- One job per activity (prevents duplicate queue entries)
);

-- Index for efficient FIFO queue processing (priority DESC, then oldest first)
CREATE INDEX idx_narrative_jobs_priority ON narrative_jobs(priority DESC, created_at ASC);

-- Index for project-level budget queries
CREATE INDEX idx_narrative_jobs_project ON narrative_jobs(project_id);

-- Comments for documentation
COMMENT ON TABLE activity_narratives IS 'Cached auto-generated narratives for core activities. Input hash tracks staleness.';
COMMENT ON COLUMN activity_narratives.text IS 'Generated paragraph (5-8 sentences) following H→E→O→Ev→C progression';
COMMENT ON COLUMN activity_narratives.confidence IS 'AI confidence: high (sufficient evidence) or low (thin/contradictory evidence)';
COMMENT ON COLUMN activity_narratives.missing_steps IS 'Array of missing systematic steps to display at end of narrative';
COMMENT ON COLUMN activity_narratives.input_hash IS 'SHA-256 hash of: hypothesis + activity + evidence IDs + content_hashes (for cache invalidation)';

COMMENT ON TABLE narrative_jobs IS 'Background job queue for narrative generation. Processed by cron worker with daily budget enforcement.';
COMMENT ON COLUMN narrative_jobs.priority IS 'Processing priority: 0=auto-enqueued, 1=user-triggered refresh';
