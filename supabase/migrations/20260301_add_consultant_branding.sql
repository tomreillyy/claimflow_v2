-- Consultant branding table for white-label support
CREATE TABLE consultant_branding (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consultant_user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  company_name TEXT,
  logo_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create public storage bucket for branding assets (logos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder in the branding bucket
CREATE POLICY "Consultants can upload their own branding"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'branding'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own branding files
CREATE POLICY "Consultants can update their own branding"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'branding'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to branding assets (logos are not sensitive)
CREATE POLICY "Public read access for branding"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'branding');
