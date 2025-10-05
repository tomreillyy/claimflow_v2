import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { AuthenticatedTimeline } from './AuthenticatedTimeline';

export default async function Timeline({ params }) {
  const { token } = await params;

  const { data: project, error: projectError } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('project_token', token)
    .is('deleted_at', null)
    .single();

  if (projectError) {
    console.error('Project fetch error:', projectError);
  }

  if (!project) return <main style={{padding:24}}>Project not found</main>;

  const { data: items } = await supabaseAdmin
    .from('evidence')
    .select('*')
    .eq('project_id', project.id)
    .or('soft_deleted.is.null,soft_deleted.eq.false')
    .order('created_at', { ascending: false });

  return <AuthenticatedTimeline project={project} items={items} token={token} />;
}