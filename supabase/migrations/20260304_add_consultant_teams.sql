-- Consultant team members: allows a lead consultant to invite junior staff
CREATE TABLE consultant_team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_consultant_id UUID NOT NULL REFERENCES auth.users(id),
  member_user_id UUID REFERENCES auth.users(id),
  member_email TEXT NOT NULL,
  member_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lead_consultant_id, member_email)
);

-- Assignments: links a team member to specific clients they can access
CREATE TABLE consultant_team_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_member_id UUID NOT NULL REFERENCES consultant_team_members(id) ON DELETE CASCADE,
  consultant_client_id UUID NOT NULL REFERENCES consultant_clients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_member_id, consultant_client_id)
);
