import { supabaseAdmin } from '@/lib/supabaseAdmin';
import PrintButton from './PrintButton';

// Australian RDTI systematic progression steps
const SYSTEMATIC_STEPS = [
  'Hypothesis',
  'Experiment',
  'Observation',
  'Evaluation',
  'Conclusion'
];

export default async function Pack({ params }) {
  const { token } = await params;

  const { data: project } = await supabaseAdmin
    .from('projects').select('id,name,year,current_hypothesis').eq('project_token', token).is('deleted_at', null).single();
  if (!project) return <main style={{padding:24}}>Project not found</main>;

  const { data: items } = await supabaseAdmin
    .from('evidence').select('*').eq('project_id', project.id).or('soft_deleted.is.null,soft_deleted.eq.false').order('created_at');

  // Group evidence by systematic step (exclude Unknown)
  const byStep = {};
  const supporting = [];
  const governance = [];

  for (const it of (items||[])) {
    const step = it.systematic_step_primary;

    // Skip Unknown/null items
    if (!step || step === 'Unknown') continue;

    // Group by systematic step
    if (SYSTEMATIC_STEPS.includes(step)) {
      byStep[step] ||= [];
      byStep[step].push(it);
    }

    // Legacy category support for special sections
    if (it.category === 'supporting') supporting.push(it);
    if (it.category === 'governance') governance.push(it);
  }

  // Calculate coverage
  const presentSteps = SYSTEMATIC_STEPS.filter(s => (byStep[s]||[]).length > 0);
  const missingSteps = SYSTEMATIC_STEPS.filter(s => (byStep[s]||[]).length === 0);

  // Get key evidence snippets (max 3 across all steps)
  const keySnippets = [];
  for (const step of SYSTEMATIC_STEPS) {
    const stepItems = byStep[step] || [];
    for (const item of stepItems.slice(0, 1)) { // Take first from each step
      if (keySnippets.length >= 3) break;
      if (item.content) {
        keySnippets.push({
          content: item.content.substring(0, 300),
          date: item.created_at,
          source: item.source || 'note'
        });
      }
    }
    if (keySnippets.length >= 3) break;
  }

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
              fontSize: 18,
              fontWeight: 600,
              color: '#1a1a1a',
              textDecoration: 'none',
              marginRight: 12,
              fontFamily: 'system-ui'
            }}>ClaimFlow</a>
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
        padding: '40px 24px'
      }}>
        {/* Title Page */}
        <div style={{
          marginBottom: 40,
          paddingBottom: 24,
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

        {/* Core Activity Overview */}
        <section style={{marginBottom: 40}}>
          <h2 style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#1a1a1a',
            margin: '0 0 12px 0',
            borderBottom: '1px solid #333',
            paddingBottom: 4
          }}>
            Core Activity Overview
          </h2>
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
            {keySnippets.length > 0 && (
              <>
                <p style={{margin: '12px 0 8px 0', fontWeight: 600}}>Key Evidence Snippets:</p>
                {keySnippets.map((snippet, i) => (
                  <div key={i} style={{
                    margin: '0 0 12px 0',
                    paddingLeft: 16,
                    borderLeft: '2px solid #ddd'
                  }}>
                    <div style={{fontSize: 12, color: '#666', marginBottom: 4}}>
                      {new Date(snippet.date).toLocaleDateString('en-AU')} • via {snippet.source.charAt(0).toUpperCase() + snippet.source.slice(1)}
                    </div>
                    <div style={{fontSize: 13, color: '#555'}}>
                      "{snippet.content}{snippet.content.length >= 300 ? '...' : ''}"
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </section>

        {/* Evidence by Step */}
        <section style={{marginBottom: 40}}>
          <h2 style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#1a1a1a',
            margin: '0 0 12px 0',
            borderBottom: '1px solid #333',
            paddingBottom: 4
          }}>
            Evidence by Step
          </h2>

          {SYSTEMATIC_STEPS.map(step => (
            <div key={step} style={{marginBottom: 24}}>
              <h3 style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#1a1a1a',
                margin: '0 0 8px 0'
              }}>
                {step}
              </h3>

              {(byStep[step]||[]).length === 0 ? (
                <p style={{
                  fontSize: 13,
                  color: '#999',
                  fontStyle: 'italic',
                  margin: '0 0 0 16px'
                }}>
                  No artefacts present for this step.
                </p>
              ) : (
                <div style={{fontSize: 13, lineHeight: 1.8, marginLeft: 16}}>
                  {(byStep[step]||[]).map((ev) => {
                    const source = ev.source || 'note';
                    return (
                      <div key={ev.id} style={{marginBottom: 6}}>
                        {new Date(ev.created_at).toLocaleDateString('en-AU')} • via {source.charAt(0).toUpperCase() + source.slice(1)} • {getEvidenceType(ev)} • {getShortTitle(ev)} • ({ev.id.substring(0, 8)})
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
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

        {/* Footer */}
        <div style={{
          marginTop: 40,
          paddingTop: 16,
          borderTop: '1px solid #ddd',
          fontSize: 11,
          color: '#999',
          textAlign: 'center'
        }}>
          Generated by ClaimFlow • {new Date().toLocaleDateString('en-AU')} • This document contains contemporaneous evidence only and makes no eligibility determinations
        </div>
      </main>

    </div>
  );
}