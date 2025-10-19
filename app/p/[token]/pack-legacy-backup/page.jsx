import { supabaseAdmin } from '@/lib/supabaseAdmin';
import PrintButton from './PrintButton';
import ActivityNarrative from './ActivityNarrative';
import crypto from 'crypto';

// Australian RDTI systematic progression steps
const SYSTEMATIC_STEPS = [
  'Hypothesis',
  'Experiment',
  'Observation',
  'Evaluation',
  'Conclusion'
];

// Calculate input hash for staleness detection
function calculateInputHash(hypothesis, activity, evidenceData) {
  const input = JSON.stringify({
    hypothesis: hypothesis?.substring(0, 200) || '',
    activity: { name: activity.name, uncertainty: activity.uncertainty },
    evidence: evidenceData.map(e => ({ id: e.id, hash: e.content_hash })).sort((a, b) => a.id.localeCompare(b.id))
  });
  return crypto.createHash('sha256').update(input).digest('hex').substring(0, 64);
}

// Enqueue narrative job (non-blocking)
async function enqueueNarrativeJob(activityId, projectId) {
  try {
    await supabaseAdmin
      .from('narrative_jobs')
      .upsert({
        activity_id: activityId,
        project_id: projectId,
        priority: 0,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'activity_id'
      });
  } catch (error) {
    console.error('[Pack] Failed to enqueue narrative job:', error);
  }
}

export default async function Pack({ params }) {
  const { token } = await params;

  const { data: project } = await supabaseAdmin
    .from('projects').select('id,name,year,current_hypothesis').eq('project_token', token).is('deleted_at', null).single();
  if (!project) return <main style={{padding:24}}>Project not found</main>;

  const { data: items } = await supabaseAdmin
    .from('evidence').select('*').eq('project_id', project.id).or('soft_deleted.is.null,soft_deleted.eq.false').order('created_at');

  // Fetch core activities
  const { data: coreActivities } = await supabaseAdmin
    .from('core_activities').select('*').eq('project_id', project.id).order('created_at', { ascending: true });

  // Fetch all narratives for activities in this project
  const activityIds = (coreActivities || []).map(a => a.id);
  const { data: narratives } = activityIds.length > 0
    ? await supabaseAdmin
        .from('activity_narratives')
        .select('*')
        .in('activity_id', activityIds)
    : { data: [] };

  // Fetch cost ledger data
  const { data: costLedger } = await supabaseAdmin
    .from('cost_ledger')
    .select(`
      *,
      activity:core_activities(name)
    `)
    .eq('project_id', project.id)
    .order('month', { ascending: true })
    .order('person_identifier', { ascending: true });

  // Create narrative lookup map
  const narrativeMap = new Map((narratives || []).map(n => [n.activity_id, n]));

  // Group evidence by systematic step (exclude Unknown)
  const byStep = {};
  const byActivity = {};
  const supporting = [];
  const governance = [];
  const unlinkedEvidence = [];

  // Create activity lookup
  const activityMap = new Map((coreActivities || []).map(a => [a.id, a]));

  for (const it of (items||[])) {
    const step = it.systematic_step_primary;

    // Skip Unknown/null items
    if (!step || step === 'Unknown') continue;

    // Group by systematic step
    if (SYSTEMATIC_STEPS.includes(step)) {
      byStep[step] ||= [];
      byStep[step].push(it);
    }

    // Group by linked activity
    if (it.linked_activity_id && activityMap.has(it.linked_activity_id)) {
      byActivity[it.linked_activity_id] ||= [];
      byActivity[it.linked_activity_id].push(it);
    } else if (SYSTEMATIC_STEPS.includes(step)) {
      // Track unlinked evidence (has a valid step but no linked activity)
      unlinkedEvidence.push(it);
    }

    // Legacy category support for special sections
    if (it.category === 'supporting') supporting.push(it);
    if (it.category === 'governance') governance.push(it);
  }

  // Calculate coverage
  const presentSteps = SYSTEMATIC_STEPS.filter(s => (byStep[s]||[]).length > 0);
  const missingSteps = SYSTEMATIC_STEPS.filter(s => (byStep[s]||[]).length === 0);

  // Helper to format evidence type
  const getEvidenceType = (item) => {
    if (item.file_url) return 'Attachment';
    if (item.source === 'email') return 'Email';
    return 'Note';
  };

  // Helper to get short title
  const getShortTitle = (item) => {
    if (item.file_url) {
      const parts = item.file_url.split('/');
      const filename = parts[parts.length - 1];
      return filename.substring(filename.indexOf('_') + 1) || filename;
    }
    if (item.content) {
      return item.content.substring(0, 80).replace(/\n/g, ' ') + (item.content.length > 80 ? '...' : '');
    }
    return 'Evidence item';
  };

  const totalEvidence = Object.values(byStep).reduce((sum, arr) => sum + arr.length, 0);

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
          maxWidth: 800,
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <a href="/" style={{
              display: 'inline-flex',
              alignItems: 'center',
              textDecoration: 'none',
              marginRight: 12
            }}>
              <img
                src="/Aird Logo.png"
                alt="Aird"
                style={{
                  height: 24,
                  width: 'auto'
                }}
              />
            </a>
            <span style={{color: '#333'}}>→</span>
            <a href={`/p/${token}`} style={{
              marginLeft: 12,
              color: '#333',
              textDecoration: 'none',
              fontFamily: 'system-ui'
            }}>Back to timeline</a>
          </div>

          <PrintButton />
        </div>
      </header>

      <main className="print-main" style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: '0 24px 24px 24px'
      }}>
        {/* Title Page */}
        <div style={{
          marginBottom: 24,
          paddingBottom: 16,
          borderBottom: '1px solid #ddd'
        }}>
          <h1 style={{
            fontSize: 28,
            fontWeight: 400,
            color: '#1a1a1a',
            margin: '0 0 8px 0',
            lineHeight: 1.3
          }}>
            R&D Evidence Pack
          </h1>
          <h2 style={{
            fontSize: 20,
            fontWeight: 600,
            color: '#333',
            margin: '0 0 4px 0'
          }}>
            {project.name}
          </h2>
          <p style={{
            fontSize: 14,
            color: '#666',
            margin: '0'
          }}>
            Tax Year {project.year} • Generated {new Date().toLocaleDateString('en-AU', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
          {project.current_hypothesis && (
            <p style={{
              fontSize: 14,
              color: '#666',
              marginTop: 12,
              paddingTop: 12,
              borderTop: '1px solid #e5e5e5'
            }}>
              <strong>Hypothesis:</strong> {project.current_hypothesis}
            </p>
          )}
        </div>

        {/* Project Summary */}
        <section style={{marginBottom: 40}}>
          <h2 style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#1a1a1a',
            margin: '0 0 12px 0',
            borderBottom: '1px solid #333',
            paddingBottom: 4
          }}>
            Project Summary
          </h2>
          <div style={{fontSize: 14, lineHeight: 1.7, color: '#333'}}>
            <p style={{margin: '0 0 8px 0'}}>
              <strong>Project:</strong> {project.name}
            </p>
            <p style={{margin: '0 0 8px 0'}}>
              <strong>Tax Year:</strong> {project.year}
            </p>
            <p style={{margin: '0 0 8px 0'}}>
              <strong>Technical Uncertainty:</strong> This project involved technical challenges where the outcome could not be known or determined in advance based on current knowledge, requiring systematic experimentation and evaluation.
            </p>
            <p style={{margin: '0 0 8px 0'}}>
              <strong>Records:</strong> All evidence items are contemporaneous records captured at the time of activity, with timestamps and source attribution (Email/Note/Upload).
            </p>
            <p style={{margin: '0'}}>
              <strong>Total Evidence Items:</strong> {totalEvidence}
            </p>
          </div>
        </section>

        {/* Core Activities */}
        <section style={{marginBottom: 40}}>
          <h2 style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#1a1a1a',
            margin: '0 0 12px 0',
            borderBottom: '1px solid #333',
            paddingBottom: 4
          }}>
            Core Activities
          </h2>

          {(!coreActivities || coreActivities.length === 0) ? (
            <div style={{fontSize: 14, lineHeight: 1.7, color: '#333'}}>
              <p style={{margin: '0 0 8px 0'}}>
                <strong>Uncertainty:</strong> The project addresses technical challenges that could not be resolved using existing knowledge or standard approaches.
              </p>
              <p style={{margin: '0 0 8px 0'}}>
                <strong>Hypothesis:</strong> The work proceeded from defined hypotheses tested through systematic experimentation.
              </p>
              <p style={{margin: '0 0 12px 0'}}>
                <strong>Progression Coverage:</strong> {presentSteps.length > 0 ? presentSteps.join(' / ') : 'No steps present'}
              </p>
              {missingSteps.length > 0 && (
                <p style={{margin: '0 0 12px 0', color: '#999', fontStyle: 'italic'}}>
                  <strong>What's Missing:</strong> {missingSteps.join(', ')}
                </p>
              )}
              <p style={{fontSize: 13, color: '#999', fontStyle: 'italic', marginTop: 16}}>
                No core activities defined yet. Add evidence to auto-generate, or add manually via the timeline.
              </p>
            </div>
          ) : (
            <div>
              {coreActivities.map((activity, index) => {
                const meta = activity.meta || {};
                const evidenceLinks = meta.evidence_links || [];

                // Get linked evidence for this activity
                const activityEvidence = byActivity[activity.id] || [];

                // Check for cached narrative and staleness
                const cachedNarrative = narrativeMap.get(activity.id);
                const currentHash = calculateInputHash(
                  project.current_hypothesis,
                  activity,
                  activityEvidence
                );

                // Detect staleness: hash mismatch means inputs changed
                const isStale = cachedNarrative && cachedNarrative.input_hash !== currentHash;

                // Auto-enqueue refresh if stale or missing (non-blocking)
                if ((isStale || !cachedNarrative) && activityEvidence.length > 0) {
                  enqueueNarrativeJob(activity.id, project.id);
                }

                return (
                  <div key={activity.id} style={{
                    marginBottom: 24,
                    paddingBottom: 20,
                    borderBottom: index < coreActivities.length - 1 ? '1px solid #e5e5e5' : 'none'
                  }}>
                    <h3 style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#1a1a1a',
                      margin: '0 0 8px 0'
                    }}>
                      {activity.name}
                      {meta.category && (
                        <span style={{
                          marginLeft: 8,
                          fontSize: 11,
                          fontWeight: 400,
                          color: '#999',
                          fontFamily: 'ui-monospace, Monaco, monospace'
                        }}>
                          [{meta.category}]
                        </span>
                      )}
                    </h3>

                    <div style={{fontSize: 13, lineHeight: 1.7, color: '#333'}}>
                      <p style={{margin: '0 0 8px 0'}}>
                        <strong>Technical Uncertainty:</strong> {activity.uncertainty}
                      </p>

                      {meta.success_criteria && (
                        <p style={{margin: '0 0 8px 0'}}>
                          <strong>Success Criteria:</strong> {meta.success_criteria}
                        </p>
                      )}

                      {/* Narrative Section */}
                      {cachedNarrative && cachedNarrative.text && (
                        <div style={{margin: '12px 0'}}>
                          <p style={{fontSize: 12, fontWeight: 600, color: '#666', margin: '0 0 4px 0'}}>
                            Narrative (auto-generated)
                          </p>
                          <p style={{fontSize: 13, lineHeight: 1.7, color: '#333', margin: '0 0 4px 0'}}>
                            {cachedNarrative.text}
                          </p>
                          {cachedNarrative.missing_steps && cachedNarrative.missing_steps.length > 0 && (
                            <p style={{fontSize: 12, color: '#999', fontStyle: 'italic', margin: '4px 0 0 0'}}>
                              Missing: {cachedNarrative.missing_steps.join(', ')}.
                            </p>
                          )}
                          <ActivityNarrative
                            activityId={activity.id}
                            generatedAt={cachedNarrative.generated_at}
                            projectToken={token}
                          />
                        </div>
                      )}

                      {/* Show placeholder if no narrative yet but evidence exists */}
                      {!cachedNarrative && activityEvidence.length > 0 && (
                        <div style={{margin: '12px 0'}}>
                          <p style={{fontSize: 12, fontWeight: 600, color: '#666', margin: '0 0 4px 0'}}>
                            Narrative (auto-generated)
                          </p>
                          <p style={{fontSize: 13, lineHeight: 1.7, color: '#999', fontStyle: 'italic', margin: '0'}}>
                            Updating in background...
                          </p>
                        </div>
                      )}

                      {/* Show nothing if no evidence at all */}
                      {!cachedNarrative && activityEvidence.length === 0 && (
                        <div style={{margin: '12px 0'}}>
                          <p style={{fontSize: 12, color: '#999', fontStyle: 'italic', margin: '0'}}>
                            Not enough evidence to summarize yet.
                          </p>
                        </div>
                      )}

                      {evidenceLinks.length > 0 && (
                        <p style={{margin: '0 0 8px 0', fontSize: 12, color: '#666'}}>
                          <strong>AI-Suggested Evidence Links:</strong> {evidenceLinks.map(id => {
                            const shortId = String(id).substring(0, 8);
                            return shortId;
                          }).join(', ')}
                        </p>
                      )}

                      {byActivity[activity.id] && byActivity[activity.id].length > 0 && (
                        <p style={{margin: '0 0 8px 0', fontSize: 12, color: '#333'}}>
                          <strong>Linked Evidence:</strong> {byActivity[activity.id].length} item{byActivity[activity.id].length !== 1 ? 's' : ''}
                          {' '}({byActivity[activity.id].filter(e => e.link_source === 'auto').length} auto, {byActivity[activity.id].filter(e => e.link_source === 'manual').length} manual)
                        </p>
                      )}

                      <p style={{
                        margin: '8px 0 0 0',
                        fontSize: 11,
                        color: '#999',
                        fontFamily: 'ui-monospace, Monaco, monospace'
                      }}>
                        Source: {activity.source === 'ai' ? 'Auto-generated' : 'Manual'}
                      </p>
                    </div>
                  </div>
                );
              })}

              <div style={{
                marginTop: 16,
                padding: 12,
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 4,
                fontSize: 13,
                lineHeight: 1.6,
                color: '#555'
              }}>
                <strong>Systematic Progression Coverage:</strong> {presentSteps.length > 0 ? presentSteps.join(' → ') : 'No steps present'}
                {missingSteps.length > 0 && (
                  <span style={{color: '#999', fontStyle: 'italic'}}>
                    {' '}(Missing: {missingSteps.join(', ')})
                  </span>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Evidence by Core Activity */}
        <section style={{marginBottom: 40}}>
          <h2 style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#1a1a1a',
            margin: '0 0 12px 0',
            borderBottom: '1px solid #333',
            paddingBottom: 4
          }}>
            Evidence by Core Activity
          </h2>

          {(!coreActivities || coreActivities.length === 0) ? (
            <p style={{fontSize: 13, color: '#999', fontStyle: 'italic', margin: 0}}>
              No core activities defined. Evidence will be organized by activity once core activities are created.
            </p>
          ) : (
            <>
              {coreActivities.map((activity, index) => {
                const activityEvidence = byActivity[activity.id] || [];

                // Group activity evidence by systematic step
                const activityByStep = {};
                activityEvidence.forEach(ev => {
                  const step = ev.systematic_step_primary;
                  if (SYSTEMATIC_STEPS.includes(step)) {
                    activityByStep[step] ||= [];
                    activityByStep[step].push(ev);
                  }
                });

                return (
                  <div key={activity.id} style={{
                    marginBottom: 32,
                    pageBreakInside: 'avoid'
                  }}>
                    <h3 style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#1a1a1a',
                      margin: '0 0 12px 0'
                    }}>
                      {activity.name}
                    </h3>

                    {activityEvidence.length === 0 ? (
                      <p style={{
                        fontSize: 13,
                        color: '#999',
                        fontStyle: 'italic',
                        margin: '0 0 0 16px'
                      }}>
                        No evidence linked to this activity yet.
                      </p>
                    ) : (
                      <>
                        {SYSTEMATIC_STEPS.map(step => {
                          const stepEvidence = activityByStep[step] || [];
                          if (stepEvidence.length === 0) return null;

                          return (
                            <div key={step} style={{marginBottom: 16}}>
                              <h4 style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: '#666',
                                margin: '0 0 6px 16px'
                              }}>
                                {step}
                              </h4>

                              <table style={{
                                width: '100%',
                                fontSize: 12,
                                borderCollapse: 'collapse',
                                marginLeft: 16,
                                maxWidth: 'calc(100% - 16px)'
                              }}>
                                <thead>
                                  <tr style={{borderBottom: '1px solid #ddd'}}>
                                    <th style={{textAlign: 'left', padding: '4px 6px', fontWeight: 600, color: '#666', width: 90}}>Date</th>
                                    <th style={{textAlign: 'left', padding: '4px 6px', fontWeight: 600, color: '#666', width: 70}}>Source</th>
                                    <th style={{textAlign: 'left', padding: '4px 6px', fontWeight: 600, color: '#666', width: 80}}>Type</th>
                                    <th style={{textAlign: 'left', padding: '4px 6px', fontWeight: 600, color: '#666'}}>Content</th>
                                    <th style={{textAlign: 'left', padding: '4px 6px', fontWeight: 600, color: '#666', width: 60}}>Link</th>
                                    <th style={{textAlign: 'left', padding: '4px 6px', fontWeight: 600, color: '#666', width: 80}}>ID</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {stepEvidence.map((ev) => {
                                    const source = ev.source || 'note';
                                    const evidenceType = getEvidenceType(ev);

                                    // Get full content/description
                                    let contentDisplay = '';
                                    if (ev.file_url) {
                                      const parts = ev.file_url.split('/');
                                      const filename = parts[parts.length - 1];
                                      contentDisplay = filename.substring(filename.indexOf('_') + 1) || filename;
                                    } else if (ev.content) {
                                      contentDisplay = ev.content;
                                    } else {
                                      contentDisplay = 'Evidence item';
                                    }

                                    return (
                                      <tr key={ev.id} style={{borderBottom: '1px solid #f0f0f0'}}>
                                        <td style={{
                                          padding: '6px 6px',
                                          fontFamily: 'ui-monospace, Monaco, monospace',
                                          fontSize: 11,
                                          color: '#666',
                                          verticalAlign: 'top'
                                        }}>
                                          {new Date(ev.created_at).toLocaleDateString('en-AU')}
                                        </td>
                                        <td style={{
                                          padding: '6px 6px',
                                          fontSize: 12,
                                          color: '#666',
                                          verticalAlign: 'top'
                                        }}>
                                          {source.charAt(0).toUpperCase() + source.slice(1)}
                                        </td>
                                        <td style={{
                                          padding: '6px 6px',
                                          fontSize: 12,
                                          color: '#666',
                                          verticalAlign: 'top'
                                        }}>
                                          {evidenceType}
                                        </td>
                                        <td style={{
                                          padding: '6px 6px',
                                          fontSize: 12,
                                          color: '#333',
                                          lineHeight: 1.5,
                                          whiteSpace: 'pre-wrap',
                                          verticalAlign: 'top',
                                          wordBreak: 'break-word'
                                        }}>
                                          {contentDisplay}
                                        </td>
                                        <td style={{
                                          padding: '6px 6px',
                                          fontSize: 11,
                                          color: '#666',
                                          verticalAlign: 'top',
                                          textAlign: 'center'
                                        }}>
                                          <span style={{
                                            fontSize: 14,
                                            color: '#999'
                                          }}>
                                            {ev.link_source === 'manual' ? '👤' : '🤖'}
                                          </span>
                                        </td>
                                        <td style={{
                                          padding: '6px 6px',
                                          fontFamily: 'ui-monospace, Monaco, monospace',
                                          fontSize: 10,
                                          color: '#999',
                                          verticalAlign: 'top'
                                        }}>
                                          {ev.id.substring(0, 8)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                );
              })}

              {/* Other Evidence Section - unlinked items */}
              {unlinkedEvidence.length > 0 && (
                <div style={{
                  marginTop: 32,
                  paddingTop: 24,
                  borderTop: '2px solid #ddd'
                }}>
                  <h3 style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#1a1a1a',
                    margin: '0 0 12px 0'
                  }}>
                    Other Evidence
                  </h3>
                  <p style={{
                    fontSize: 12,
                    color: '#666',
                    margin: '0 0 16px 0',
                    fontStyle: 'italic'
                  }}>
                    Evidence not yet linked to a core activity
                  </p>

                  {SYSTEMATIC_STEPS.map(step => {
                    const stepEvidence = unlinkedEvidence.filter(ev => ev.systematic_step_primary === step);
                    if (stepEvidence.length === 0) return null;

                    return (
                      <div key={step} style={{marginBottom: 16}}>
                        <h4 style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#666',
                          margin: '0 0 6px 16px'
                        }}>
                          {step}
                        </h4>

                        <table style={{
                          width: '100%',
                          fontSize: 12,
                          borderCollapse: 'collapse',
                          marginLeft: 16,
                          maxWidth: 'calc(100% - 16px)'
                        }}>
                          <thead>
                            <tr style={{borderBottom: '1px solid #ddd'}}>
                              <th style={{textAlign: 'left', padding: '4px 6px', fontWeight: 600, color: '#666', width: 90}}>Date</th>
                              <th style={{textAlign: 'left', padding: '4px 6px', fontWeight: 600, color: '#666', width: 70}}>Source</th>
                              <th style={{textAlign: 'left', padding: '4px 6px', fontWeight: 600, color: '#666', width: 80}}>Type</th>
                              <th style={{textAlign: 'left', padding: '4px 6px', fontWeight: 600, color: '#666'}}>Content</th>
                              <th style={{textAlign: 'left', padding: '4px 6px', fontWeight: 600, color: '#666', width: 80}}>ID</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stepEvidence.map((ev) => {
                              const source = ev.source || 'note';
                              const evidenceType = getEvidenceType(ev);

                              // Get full content/description
                              let contentDisplay = '';
                              if (ev.file_url) {
                                const parts = ev.file_url.split('/');
                                const filename = parts[parts.length - 1];
                                contentDisplay = filename.substring(filename.indexOf('_') + 1) || filename;
                              } else if (ev.content) {
                                contentDisplay = ev.content;
                              } else {
                                contentDisplay = 'Evidence item';
                              }

                              return (
                                <tr key={ev.id} style={{borderBottom: '1px solid #f0f0f0'}}>
                                  <td style={{
                                    padding: '6px 6px',
                                    fontFamily: 'ui-monospace, Monaco, monospace',
                                    fontSize: 11,
                                    color: '#666',
                                    verticalAlign: 'top'
                                  }}>
                                    {new Date(ev.created_at).toLocaleDateString('en-AU')}
                                  </td>
                                  <td style={{
                                    padding: '6px 6px',
                                    fontSize: 12,
                                    color: '#666',
                                    verticalAlign: 'top'
                                  }}>
                                    {source.charAt(0).toUpperCase() + source.slice(1)}
                                  </td>
                                  <td style={{
                                    padding: '6px 6px',
                                    fontSize: 12,
                                    color: '#666',
                                    verticalAlign: 'top'
                                  }}>
                                    {evidenceType}
                                  </td>
                                  <td style={{
                                    padding: '6px 6px',
                                    fontSize: 12,
                                    color: '#333',
                                    lineHeight: 1.5,
                                    whiteSpace: 'pre-wrap',
                                    verticalAlign: 'top',
                                    wordBreak: 'break-word'
                                  }}>
                                    {contentDisplay}
                                  </td>
                                  <td style={{
                                    padding: '6px 6px',
                                    fontFamily: 'ui-monospace, Monaco, monospace',
                                    fontSize: 10,
                                    color: '#999',
                                    verticalAlign: 'top'
                                  }}>
                                    {ev.id.substring(0, 8)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>

        {/* Supporting Activities */}
        <section style={{marginBottom: 40}}>
          <h2 style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#1a1a1a',
            margin: '0 0 12px 0',
            borderBottom: '1px solid #333',
            paddingBottom: 4
          }}>
            Supporting Activities
          </h2>

          {supporting.length === 0 ? (
            <p style={{fontSize: 13, color: '#999', fontStyle: 'italic', margin: 0}}>
              No supporting activities recorded.
            </p>
          ) : (
            <div style={{fontSize: 13, lineHeight: 1.8}}>
              {supporting.map((ev) => (
                <div key={ev.id} style={{marginBottom: 12}}>
                  <div style={{fontWeight: 600, marginBottom: 4}}>
                    {new Date(ev.created_at).toLocaleDateString('en-AU')} • {getEvidenceType(ev)}
                  </div>
                  <div style={{marginLeft: 16, color: '#555'}}>
                    Direct relation to Core Activity: This supporting activity directly enabled the systematic experimentation or analysis described above.
                  </div>
                  {ev.content && (
                    <div style={{marginLeft: 16, marginTop: 4, fontSize: 12, color: '#666'}}>
                      {getShortTitle(ev)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Costs & Time */}
        <section style={{marginBottom: 40}}>
          <h2 style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#1a1a1a',
            margin: '0 0 12px 0',
            borderBottom: '1px solid #333',
            paddingBottom: 4
          }}>
            Costs & Time
          </h2>

          <table style={{
            width: '100%',
            fontSize: 12,
            borderCollapse: 'collapse',
            marginBottom: 12
          }}>
            <thead>
              <tr style={{borderBottom: '1px solid #333'}}>
                <th style={{textAlign: 'left', padding: '6px 8px', fontWeight: 600}}>Name</th>
                <th style={{textAlign: 'left', padding: '6px 8px', fontWeight: 600}}>Role</th>
                <th style={{textAlign: 'left', padding: '6px 8px', fontWeight: 600}}>Hours / % Time</th>
                <th style={{textAlign: 'left', padding: '6px 8px', fontWeight: 600}}>Cost</th>
                <th style={{textAlign: 'left', padding: '6px 8px', fontWeight: 600}}>Linked Core Activity</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} style={{
                  padding: '16px 8px',
                  textAlign: 'center',
                  color: '#999',
                  fontStyle: 'italic'
                }}>
                  [To be completed with personnel and cost details]
                </td>
              </tr>
            </tbody>
          </table>

          <p style={{fontSize: 13, color: '#555', margin: 0}}>
            <strong>Basis of apportionment:</strong> [To be completed with description of how costs are allocated to R&D activities]
          </p>
        </section>

        {/* Governance & Approvals */}
        <section style={{marginBottom: 40}}>
          <h2 style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#1a1a1a',
            margin: '0 0 12px 0',
            borderBottom: '1px solid #333',
            paddingBottom: 4
          }}>
            Governance & Approvals
          </h2>

          {governance.length === 0 ? (
            <p style={{fontSize: 13, color: '#999', fontStyle: 'italic', margin: 0}}>
              No governance or approval records present.
            </p>
          ) : (
            <div style={{fontSize: 13, lineHeight: 1.8}}>
              {governance.map((ev) => {
                const source = ev.source || 'note';
                return (
                  <div key={ev.id} style={{marginBottom: 8}}>
                    {new Date(ev.created_at).toLocaleDateString('en-AU')} • via {source.charAt(0).toUpperCase() + source.slice(1)} • {getShortTitle(ev)}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Costs Section */}
        <section style={{marginBottom: 40}}>
          <h2 style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#1a1a1a',
            margin: '0 0 12px 0',
            borderBottom: '1px solid #333',
            paddingBottom: 4
          }}>
            Costs & Apportionment
          </h2>

          {(!costLedger || costLedger.length === 0) ? (
            <p style={{fontSize: 13, color: '#999', fontStyle: 'italic', margin: 0}}>
              No payroll data uploaded yet. Visit the Costs tab to upload payroll reports and allocate time/effort across activities.
            </p>
          ) : (
            <>
              <p style={{fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 1.6}}>
                Payroll amounts reflect uploaded payroll reports; apportionment uses monthly attestations where provided.
              </p>

              {/* Group costs by month */}
              {(() => {
                const byMonth = {};
                for (const entry of costLedger) {
                  if (!byMonth[entry.month]) {
                    byMonth[entry.month] = [];
                  }
                  byMonth[entry.month].push(entry);
                }

                const months = Object.keys(byMonth).sort();
                const grandTotal = costLedger.reduce((sum, e) => sum + parseFloat(e.total_amount || 0), 0);

                return months.map(month => {
                  const entries = byMonth[month];
                  const monthTotal = entries.reduce((sum, e) => sum + parseFloat(e.total_amount || 0), 0);

                  return (
                    <div key={month} style={{marginBottom: 24, pageBreakInside: 'avoid'}}>
                      <h3 style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#333',
                        margin: '0 0 12px 0',
                        paddingBottom: 4,
                        borderBottom: '1px solid #e5e5e5'
                      }}>
                        {new Date(month).toLocaleDateString('en-AU', { year: 'numeric', month: 'long' })}
                      </h3>

                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: 11,
                        marginBottom: 8
                      }}>
                        <thead>
                          <tr style={{backgroundColor: '#f5f5f5'}}>
                            <th style={{padding: 6, textAlign: 'left', borderBottom: '1px solid #ddd'}}>Person</th>
                            <th style={{padding: 6, textAlign: 'left', borderBottom: '1px solid #ddd'}}>Activity</th>
                            <th style={{padding: 6, textAlign: 'right', borderBottom: '1px solid #ddd'}}>%/Hrs</th>
                            <th style={{padding: 6, textAlign: 'right', borderBottom: '1px solid #ddd'}}>Gross</th>
                            <th style={{padding: 6, textAlign: 'right', borderBottom: '1px solid #ddd'}}>Super</th>
                            <th style={{padding: 6, textAlign: 'right', borderBottom: '1px solid #ddd'}}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entries.map((entry, idx) => (
                            <tr key={idx} style={{borderBottom: '1px solid #eee'}}>
                              <td style={{padding: 6}}>
                                {entry.person_name || entry.person_email || entry.person_identifier}
                              </td>
                              <td style={{padding: 6, color: entry.activity?.name ? '#333' : '#999'}}>
                                {entry.activity?.name || 'Unapportioned'}
                              </td>
                              <td style={{padding: 6, textAlign: 'right', fontSize: 10, color: '#666'}}>
                                {entry.apportionment_percent
                                  ? `${parseFloat(entry.apportionment_percent).toFixed(1)}%`
                                  : entry.apportionment_hours
                                    ? `${parseFloat(entry.apportionment_hours).toFixed(1)}h`
                                    : '-'}
                              </td>
                              <td style={{padding: 6, textAlign: 'right'}}>
                                ${parseFloat(entry.gross_wages || 0).toLocaleString('en-AU', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                              </td>
                              <td style={{padding: 6, textAlign: 'right'}}>
                                ${parseFloat(entry.superannuation || 0).toLocaleString('en-AU', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                              </td>
                              <td style={{padding: 6, textAlign: 'right', fontWeight: 500}}>
                                ${parseFloat(entry.total_amount || 0).toLocaleString('en-AU', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                              </td>
                            </tr>
                          ))}
                          <tr style={{backgroundColor: '#f9f9f9', fontWeight: 600}}>
                            <td colSpan="5" style={{padding: 6, textAlign: 'right'}}>Month Subtotal</td>
                            <td style={{padding: 6, textAlign: 'right'}}>
                              ${monthTotal.toLocaleString('en-AU', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      <p style={{fontSize: 10, color: '#999', margin: '4px 0 0 0', fontStyle: 'italic'}}>
                        {entries[0]?.basis_text}
                      </p>
                    </div>
                  );
                });
              })()}

              {/* Grand Total */}
              {(() => {
                const grandTotal = costLedger.reduce((sum, e) => sum + parseFloat(e.total_amount || 0), 0);
                return (
                  <div style={{
                    marginTop: 16,
                    padding: 12,
                    backgroundColor: '#e3f2fd',
                    borderRadius: 4,
                    fontSize: 13,
                    fontWeight: 600,
                    textAlign: 'right'
                  }}>
                    Grand Total: ${grandTotal.toLocaleString('en-AU', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </div>
                );
              })()}
            </>
          )}
        </section>

        {/* Footer */}
        <div style={{
          marginTop: 40,
          paddingTop: 16,
          borderTop: '1px solid #ddd',
          fontSize: 11,
          color: '#999',
          textAlign: 'center'
        }}>
          Generated by Aird • {new Date().toLocaleDateString('en-AU')} • This document contains contemporaneous evidence only and makes no eligibility determinations
        </div>
      </main>

    </div>
  );
}