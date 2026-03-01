-- Link evidence records to knowledge base documents
-- Enables dual-write: each uploaded document creates a corresponding evidence record

ALTER TABLE evidence ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES project_documents(id);

CREATE INDEX idx_evidence_document_id ON evidence(document_id) WHERE document_id IS NOT NULL;

COMMENT ON COLUMN evidence.document_id IS 'FK to project_documents for evidence created from knowledge base uploads';
