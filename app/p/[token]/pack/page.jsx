import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import ClaimPackEditor from '@/components/ClaimPackEditor/ClaimPackEditor';
import Paywall from '@/components/Paywall';
import Link from 'next/link';
import PrintButton from './PrintButton';
import { enrichEvidenceWithActivityLinks } from '@/lib/enrichEvidence';
import { AppHeader } from '@/components/AppHeader';

async function getUser() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored in Server Components
          }
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function checkSubscription(userId) {
  if (!userId) return false;

  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('user_id', userId)
    .single();

  if (!subscription) return false;

  return subscription.status === 'active' &&
    new Date(subscription.current_period_end) > new Date();
}

export default async function PackV2Page({ params }) {
  const { token } = await params;

  // Get authenticated user
  const user = await getUser();

  // Check subscription status
  const isSubscribed = await checkSubscription(user?.id);

  // If not subscribed, show paywall
  if (!isSubscribed) {
    return <Paywall projectToken={token} />;
  }

  // Fetch project (include technical framing fields for validator and display)
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('id, name, year, current_hypothesis, project_token, project_overview, technical_uncertainty, knowledge_gap, testing_method, success_criteria')
    .eq('project_token', token)
    .is('deleted_at', null)
    .single();

  if (!project) {
    return (
      <main style={{ padding: 24 }}>
        <p>Project not found</p>
      </main>
    );
  }

  // Fetch core activities
  const { data: activities } = await supabaseAdmin
    .from('core_activities')
    .select('*')
    .eq('project_id', project.id)
    .order('created_at', { ascending: true });

  const activityIds = (activities || []).map(a => a.id);

  // Fetch evidence and activity_evidence join table in parallel
  const [{ data: rawEvidence }, { data: activityEvidenceLinks }] = await Promise.all([
    supabaseAdmin
      .from('evidence')
      .select('*')
      .eq('project_id', project.id)
      .or('soft_deleted.is.null,soft_deleted.eq.false')
      .order('created_at', { ascending: true }),

    activityIds.length > 0
      ? supabaseAdmin
          .from('activity_evidence')
          .select('activity_id, evidence_id, systematic_step')
          .in('activity_id', activityIds)
      : Promise.resolve({ data: [] })
  ]);

  // Enrich evidence with activity links from the join table
  const evidence = enrichEvidenceWithActivityLinks(rawEvidence, activityEvidenceLinks);

  // Fetch cost ledger
  const { data: costLedger } = await supabaseAdmin
    .from('cost_ledger')
    .select('*')
    .eq('project_id', project.id)
    .order('month', { ascending: true });

  // Fetch claim pack sections
  const { data: sectionsArray } = await supabaseAdmin
    .from('claim_pack_sections')
    .select('*')
    .eq('project_id', project.id);

  // Convert sections array to object keyed by section_key
  const sections = {};
  (sectionsArray || []).forEach(section => {
    sections[section.section_key] = {
      content: section.content,         // used by claimPackValidator
      initialContent: section.content,  // used by SectionEditor (Tiptap)
      aiGenerated: section.ai_generated,
      lastEditedAt: section.last_edited_at,
      lastEditedBy: section.last_edited_by,
      version: section.version
    };
  });

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#1a1a1a'
    }}>
      {/* Standard app header */}
      <AppHeader />

      {/* Sub-header: breadcrumb + print button (hidden in print) */}
      <div className="print-hide" style={{
        position: 'fixed',
        top: 56,
        left: 0,
        right: 0,
        zIndex: 40,
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '0 24px',
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280' }}>
          <Link href={`/p/${token}`} style={{ color: '#6b7280', textDecoration: 'none' }}>
            {project.name}
          </Link>
          <span>/</span>
          <span style={{ color: '#111827', fontWeight: 500 }}>Claim Pack</span>
        </div>
        <PrintButton />
      </div>

      {/* Main content — offset for fixed AppHeader (56px) + sub-header (44px) */}
      <main className="print-main" style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '24px 24px 48px',
        paddingTop: 124,
      }}>
        <ClaimPackEditor
          project={project}
          activities={activities || []}
          evidence={evidence || []}
          costLedger={costLedger || []}
          initialSections={sections}
        />
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .print-hide {
            display: none !important;
          }

          .print-main {
            max-width: 100% !important;
            padding: 0 !important;
          }

          @page {
            margin: 2cm;
          }

          h1, h2, h3 {
            page-break-after: avoid;
          }

          .section-editor {
            page-break-inside: avoid;
          }
        }
      `}} />
    </div>
  );
}
