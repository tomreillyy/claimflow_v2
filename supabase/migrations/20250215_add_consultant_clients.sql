-- Consultant-client linking table
-- Allows an R&D advisor (consultant) to link to client users and access their projects

CREATE TABLE consultant_clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consultant_user_id UUID NOT NULL REFERENCES auth.users(id),
  client_user_id UUID REFERENCES auth.users(id),
  client_email TEXT NOT NULL,
  client_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(consultant_user_id, client_email)
);
