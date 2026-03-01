-- Knowledge Base: per-project document storage with full-text search
-- Stores uploaded documents (PDF, DOCX, TXT, etc.) with extracted text for search

CREATE TABLE project_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  extracted_text TEXT,
  text_search_vector TSVECTOR,
  extraction_status TEXT DEFAULT 'pending'
    CHECK (extraction_status IN ('pending', 'completed', 'failed', 'skipped')),
  extraction_error TEXT,
  soft_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for project lookups (most common query)
CREATE INDEX idx_project_documents_project_id
  ON project_documents(project_id) WHERE soft_deleted = false;

-- GIN index for full-text search
CREATE INDEX idx_project_documents_text_search
  ON project_documents USING GIN(text_search_vector);

-- Auto-update tsvector when extracted_text or file_name changes
CREATE OR REPLACE FUNCTION project_documents_tsvector_trigger() RETURNS trigger AS $$
BEGIN
  NEW.text_search_vector := to_tsvector('english',
    coalesce(NEW.file_name, '') || ' ' || coalesce(NEW.extracted_text, '')
  );
  NEW.updated_at := now();
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER tsvector_update
  BEFORE INSERT OR UPDATE OF extracted_text, file_name
  ON project_documents
  FOR EACH ROW
  EXECUTE FUNCTION project_documents_tsvector_trigger();

-- RPC function for full-text search with ranking and highlighted snippets
CREATE OR REPLACE FUNCTION search_project_documents(
  p_project_id UUID,
  p_query TEXT,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  file_name TEXT,
  file_type TEXT,
  file_size INTEGER,
  extraction_status TEXT,
  created_at TIMESTAMPTZ,
  headline TEXT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pd.id,
    pd.file_name,
    pd.file_type,
    pd.file_size,
    pd.extraction_status,
    pd.created_at,
    ts_headline('english', coalesce(pd.extracted_text, ''), plainto_tsquery('english', p_query),
      'MaxFragments=3, MaxWords=30, MinWords=15, StartSel=<mark>, StopSel=</mark>') AS headline,
    ts_rank(pd.text_search_vector, plainto_tsquery('english', p_query)) AS rank
  FROM project_documents pd
  WHERE pd.project_id = p_project_id
    AND pd.soft_deleted = false
    AND pd.text_search_vector @@ plainto_tsquery('english', p_query)
  ORDER BY rank DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Private storage bucket for knowledge base documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge', 'knowledge', false)
ON CONFLICT (id) DO NOTHING;
