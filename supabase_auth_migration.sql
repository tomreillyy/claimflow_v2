-- ClaimFlow Auth Migration
-- Run this SQL in your Supabase SQL editor AFTER configuring auth settings

-- 1. Add auth columns to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS participant_ids uuid[] DEFAULT '{}';

-- 2. Create new RLS policies for authenticated access
-- First, create policies that work alongside existing public ones
CREATE POLICY "Authenticated users can read their projects" ON projects
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      auth.uid() = owner_id OR
      auth.uid() = ANY(participant_ids)
    )
  );

CREATE POLICY "Authenticated users can create projects" ON projects
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    auth.uid() = owner_id
  );

-- 3. Update evidence policies for authenticated access
CREATE POLICY "Authenticated users can read evidence for their projects" ON evidence
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = evidence.project_id
      AND (projects.owner_id = auth.uid() OR auth.uid() = ANY(projects.participant_ids))
    )
  );

CREATE POLICY "Authenticated users can add evidence to their projects" ON evidence
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = evidence.project_id
      AND (projects.owner_id = auth.uid() OR auth.uid() = ANY(projects.participant_ids))
    )
  );

-- 4. Create a function to migrate existing projects to authenticated users
-- This will be called manually after users start signing up
CREATE OR REPLACE FUNCTION migrate_project_to_user(
  project_token_param text,
  user_email text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id_var uuid;
  project_id_var uuid;
BEGIN
  -- Find user by email
  SELECT id INTO user_id_var
  FROM auth.users
  WHERE email = user_email;

  IF user_id_var IS NULL THEN
    RETURN false;
  END IF;

  -- Update project
  UPDATE projects
  SET owner_id = user_id_var
  WHERE project_token = project_token_param
  AND owner_id IS NULL;

  RETURN FOUND;
END;
$$;

-- 5. Create a function to add participant to project
CREATE OR REPLACE FUNCTION add_participant_to_project(
  project_token_param text,
  user_email text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id_var uuid;
  project_participants uuid[];
BEGIN
  -- Find user by email
  SELECT id INTO user_id_var
  FROM auth.users
  WHERE email = user_email;

  IF user_id_var IS NULL THEN
    RETURN false;
  END IF;

  -- Get current participants
  SELECT participant_ids INTO project_participants
  FROM projects
  WHERE project_token = project_token_param;

  -- Add user if not already a participant
  IF NOT (user_id_var = ANY(project_participants)) THEN
    UPDATE projects
    SET participant_ids = array_append(participant_ids, user_id_var)
    WHERE project_token = project_token_param;
  END IF;

  RETURN true;
END;
$$;

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS projects_owner_id_idx ON projects(owner_id);
CREATE INDEX IF NOT EXISTS projects_participant_ids_idx ON projects USING GIN(participant_ids);

-- NOTE: Keep existing public policies active during migration
-- Once all projects are migrated and users are authenticated,
-- you can drop the public policies with these commands:
--
-- DROP POLICY "Public can read projects" ON projects;
-- DROP POLICY "Public can insert projects" ON projects;
-- DROP POLICY "Public can read evidence" ON evidence;
-- DROP POLICY "Public can insert evidence" ON evidence;