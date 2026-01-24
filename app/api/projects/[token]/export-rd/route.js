import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyUserAndProjectAccess } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  const token = params.token;

  // Verify user access
  const { user, project, error: accessError } = await verifyUserAndProjectAccess(req, token);

  if (accessError || !project) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    // Fetch core activities with narratives
    const { data: activities } = await supabaseAdmin
      .from('core_activities')
      .select(`
        id,
        name,
        uncertainty,
        created_at,
        activity_narratives (
          text,
          confidence,
          missing_steps
        )
      `)
      .eq('project_id', project.id)
      .order('created_at', { ascending: true });

    // Fetch evidence counts per activity
    const { data: evidence } = await supabaseAdmin
      .from('evidence')
      .select('id, linked_activity_id, source, meta')
      .eq('project_id', project.id)
      .not('linked_activity_id', 'is', null)
      .or('soft_deleted.is.null,soft_deleted.eq.false');

    const evidenceByActivity = {};
    evidence?.forEach(e => {
      if (!evidenceByActivity[e.linked_activity_id]) {
        evidenceByActivity[e.linked_activity_id] = [];
      }
      evidenceByActivity[e.linked_activity_id].push(e);
    });

    // Build export text
    let output = `R&D Tax Incentive Claim - ${project.name}\n`;
    output += `Financial Year: ${project.year}\n`;
    output += `Generated: ${new Date().toISOString().split('T')[0]}\n\n`;
    output += "=".repeat(80) + "\n\n";
    output += "CORE R&D ACTIVITIES\n\n";

    // Filter to high-confidence narratives only
    const exportable = activities?.filter(a =>
      a.activity_narratives?.text &&
      a.activity_narratives.confidence === 'high'
    ) || [];

    if (exportable.length === 0) {
      output += "No high-confidence R&D narratives available yet.\n";
      output += "Evidence is still being processed. Please check back later.\n\n";
    } else {
      exportable.forEach((activity, idx) => {
        const activityEvidence = evidenceByActivity[activity.id] || [];
        const gitEvidence = activityEvidence.filter(e =>
          e.meta?.type === 'commit' || e.meta?.type === 'pr'
        );

        output += `${idx + 1}. ${activity.name}\n`;
        output += "-".repeat(80) + "\n\n";

        output += `Technical Uncertainty:\n${activity.uncertainty}\n\n`;

        output += `R&D Narrative:\n${activity.activity_narratives.text}\n\n`;

        output += `Evidence Summary:\n`;
        output += `- Total evidence items: ${activityEvidence.length}\n`;
        output += `- Git commits/PRs: ${gitEvidence.length}\n`;
        output += `- Manual notes: ${activityEvidence.length - gitEvidence.length}\n\n`;

        if (activity.activity_narratives.missing_steps?.length > 0) {
          output += `*Note: Missing systematic steps - ${activity.activity_narratives.missing_steps.join(', ')}*\n\n`;
        }

        output += "\n";
      });
    }

    // Statutory disclaimer
    output += "=".repeat(80) + "\n\n";
    output += "CONTEMPORANEOUS EVIDENCE STATEMENT\n\n";
    output += "All evidence referenced in this document was automatically captured and ";
    output += "contemporaneously recorded in ClaimFlow at the time ";
    output += "activities were conducted. This demonstrates systematic progression of ";
    output += "R&D work in accordance with ITAA 1997 s 355-25.\n\n";
    output += "Evidence sources include:\n";
    output += "- Version control commits and pull requests\n";
    output += "- Engineering notes and documentation\n";
    output += "- Email correspondence\n";
    output += "- File uploads and attachments\n\n";
    output += "All evidence items are timestamped and traceable to their original sources.\n";

    // Return as downloadable text file
    return new NextResponse(output, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="rd-claim-${project.name.replace(/[^a-z0-9]/gi, '-')}-${project.year}.txt"`
      }
    });

  } catch (error) {
    console.error('[Export R&D] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
