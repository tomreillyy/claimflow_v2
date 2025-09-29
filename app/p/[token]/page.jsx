import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { AuthenticatedTimeline } from './AuthenticatedTimeline';

export default async function Timeline({ params }) {
  const { token } = await params;

  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('id,name,year,inbound_email_local')
    .eq('project_token', token)
    .single();

  if (!project) return <main style={{padding:24}}>Project not found</main>;

  const { data: items } = await supabaseAdmin
    .from('evidence')
    .select('*')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false });

  return <AuthenticatedTimeline project={project} items={items} token={token} />;
}