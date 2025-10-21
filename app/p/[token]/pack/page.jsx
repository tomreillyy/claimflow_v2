import { supabaseAdmin } from '@/lib/supabaseAdmin';
import ClaimPackEditor from '@/components/ClaimPackEditor/ClaimPackEditor';
import Link from 'next/link';
import PrintButton from './PrintButton';

export default async function PackV2Page({ params }) {
  const { token } = await params;

  // Fetch project
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('id, name, year, current_hypothesis, project_token')
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

  // Fetch all evidence
  const { data: evidence } = await supabaseAdmin
    .from('evidence')
    .select('*')
    .eq('project_id', project.id)
    .or('soft_deleted.is.null,soft_deleted.eq.false')
    .order('created_at', { ascending: true });

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
      initialContent: section.content,
      aiGenerated: section.ai_generated,
      lastEditedAt: section.last_edited_at,
      lastEditedBy: section.last_edited_by,
      version: section.version
    };
  });

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'white',
      fontFamily: 'Georgia, "Times New Roman", serif',
      color: '#1a1a1a'
    }}>
      {/* Header (hidden in print) */}
      <header className="print-hide" style={{
        backgroundColor: '#fafafa',
        borderBottom: '1px solid #e5e5e5',
        padding: '16px 0'
      }}>
        <div style={{
          maxWidth: 1000,
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/" style={{
              display: 'inline-flex',
              alignItems: 'center',
              textDecoration: 'none'
            }}>
              <img
                src="/Aird__3_-removebg-preview.png"
                alt="Aird"
                style={{
                  height: 24,
                  width: 'auto'
                }}
              />
            </Link>
            <span style={{ color: '#333' }}>→</span>
            <Link href={`/p/${token}`} style={{
              color: '#333',
              textDecoration: 'none',
              fontFamily: 'system-ui',
              fontSize: 14
            }}>
              Timeline
            </Link>
            <span style={{ color: '#333' }}>→</span>
            <Link href={`/p/${token}/pack-legacy-backup`} style={{
              color: '#333',
              textDecoration: 'none',
              fontFamily: 'system-ui',
              fontSize: 14
            }}>
              Pack (Legacy)
            </Link>
          </div>

          <PrintButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="print-main" style={{
        maxWidth: 1000,
        margin: '0 auto',
        padding: '24px'
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
