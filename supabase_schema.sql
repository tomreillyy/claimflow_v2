-- ClaimFlow Database Schema
-- Run this SQL in your Supabase SQL editor

-- 1. Create projects table
create table projects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  year integer not null,
  project_token text not null unique,
  inbound_email_local text not null unique,
  participants text[] default '{}',
  created_at timestamp with time zone default now()
);

-- 2. Create evidence table
create table evidence (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  author_email text,
  content text,
  file_url text,
  category text,
  created_at timestamp with time zone default now()
);

-- 3. Create storage bucket for evidence files
insert into storage.buckets (id, name, public) values ('evidence', 'evidence', true);

-- 4. Set up Row Level Security (RLS) policies
alter table projects enable row level security;
alter table evidence enable row level security;

-- Allow public read access to projects (for timeline viewing)
create policy "Public can read projects" on projects
  for select using (true);

-- Allow public insert/update to projects (for admin creation)
create policy "Public can insert projects" on projects
  for insert with check (true);

-- Allow public read access to evidence (for timeline viewing)
create policy "Public can read evidence" on evidence
  for select using (true);

-- Allow public insert to evidence (for adding notes/uploads)
create policy "Public can insert evidence" on evidence
  for insert with check (true);

-- 5. Storage policies for evidence bucket
create policy "Public can upload evidence files"
  on storage.objects for insert
  with check (bucket_id = 'evidence');

create policy "Public can view evidence files"
  on storage.objects for select
  using (bucket_id = 'evidence');

-- 6. Create indexes for better performance
create index evidence_project_id_idx on evidence(project_id);
create index evidence_created_at_idx on evidence(created_at);
create index projects_token_idx on projects(project_token);