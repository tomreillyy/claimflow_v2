-- Consultant marketplace profiles
CREATE TABLE consultant_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  headline TEXT,
  bio TEXT,
  avatar_path TEXT,
  specializations TEXT[] DEFAULT '{}',
  years_experience INTEGER,
  location_state TEXT,
  location_city TEXT,
  website_url TEXT,
  is_listed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_consultant_profiles_listed ON consultant_profiles (is_listed) WHERE is_listed = true;

-- Marketplace inquiries from clients to consultants
CREATE TABLE marketplace_inquiries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consultant_user_id UUID NOT NULL REFERENCES auth.users(id),
  client_user_id UUID NOT NULL REFERENCES auth.users(id),
  client_email TEXT NOT NULL,
  client_name TEXT,
  company_name TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'responded', 'declined')),
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE(consultant_user_id, client_user_id)
);
