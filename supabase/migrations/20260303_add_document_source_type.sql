-- Add 'document' to the evidence source check constraint
-- Required for knowledge base dual-write (documents appearing on evidence timeline)

-- Drop the existing constraint (may be named differently in some environments)
DO $$
DECLARE
  cname TEXT;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'evidence'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%source%';

  IF cname IS NOT NULL THEN
    EXECUTE 'ALTER TABLE evidence DROP CONSTRAINT ' || cname;
  END IF;
END $$;

-- Re-create with 'document' included
ALTER TABLE evidence ADD CONSTRAINT evidence_source_check
  CHECK (source IN ('note', 'upload', 'github', 'document'));
