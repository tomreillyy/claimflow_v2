import { supabaseAdmin } from '@/lib/supabaseAdmin';
import PrintButton from './PrintButton';

const SECTIONS = [
  ['project_scope','Project identification & eligibility'],
  ['hypothesis','Technical uncertainty & hypothesis'],
  ['experiment','Systematic experiments, iterations & results'],
  ['supporting','Supporting activities (direct nexus)'],
  ['people_time','Personnel & time linkage'],
  ['costs','Costs, invoices & apportionment'],
  ['risks','Constraints, risks & trade-offs'],
  ['governance','Governance, reviews & approvals'],
  ['mapping','Evidence → claim mapping'],
];

export default async function Pack({ params }) {
  const { token } = await params;

  const { data: project } = await supabaseAdmin
    .from('projects').select('id,name,year').eq('project_token', token).single();
  if (!project) return <main style={{padding:24}}>Project not found</main>;

  const { data: items } = await supabaseAdmin
    .from('evidence').select('*').eq('project_id', project.id).order('created_at');

  const byCat = {};
  for (const it of (items||[])) {
    const key = it.category || 'uncategorised';
    byCat[key] ||= [];
    byCat[key].push(it);
  }

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
          textAlign: 'center',
          marginBottom: 60,
          paddingBottom: 40,
          borderBottom: '2px solid #e5e5e5'
        }}>
          <h1 style={{
            fontSize: 36,
            fontWeight: 400,
            color: '#1a1a1a',
            margin: '0 0 16px 0',
            lineHeight: 1.2
          }}>
            R&D Evidence Pack
          </h1>
          <h2 style={{
            fontSize: 24,
            fontWeight: 600,
            color: '#555',
            margin: '0 0 16px 0'
          }}>
            {project.name}
          </h2>
          <p style={{
            fontSize: 18,
            color: '#666',
            margin: '0 0 32px 0'
          }}>
            Tax Year {project.year}
          </p>
          <div style={{
            fontSize: 14,
            color: '#999',
            padding: 16,
            backgroundColor: '#f8f8f8',
            borderRadius: 8,
            display: 'inline-block'
          }}>
            Generated: {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
        </div>

        {/* Summary */}
        <div style={{marginBottom: 48}}>
          <h2 style={{
            fontSize: 20,
            fontWeight: 600,
            color: '#1a1a1a',
            margin: '0 0 16px 0',
            borderBottom: '1px solid #ddd',
            paddingBottom: 8
          }}>
            Summary
          </h2>
          <p style={{
            fontSize: 16,
            lineHeight: 1.6,
            color: '#444',
            margin: 0
          }}>
            This document contains evidence collected for the R&D project "{project.name}" during the {project.year} tax year.
            Evidence has been organized according to standard R&D claim categories for submission to relevant tax authorities.
            Total evidence items: {(items||[]).length}
          </p>
        </div>

        {/* Evidence Sections */}
        {SECTIONS.map(([key, label]) => (
          <section key={key} style={{
            marginBottom: 40,
            pageBreakInside: 'avoid'
          }}>
            <h2 style={{
              fontSize: 18,
              fontWeight: 600,
              color: '#1a1a1a',
              margin: '0 0 20px 0',
              borderBottom: '2px solid #007acc',
              paddingBottom: 8,
              pageBreakAfter: 'avoid'
            }}>
              {label}
            </h2>

            {(byCat[key]||[]).length === 0 ? (
              <div style={{
                padding: 24,
                backgroundColor: '#f8f8f8',
                borderRadius: 8,
                textAlign: 'center',
                color: '#999',
                fontSize: 14,
                fontStyle: 'italic'
              }}>
                No evidence items in this category yet.
              </div>
            ) : (
              <div style={{marginLeft: 20}}>
                {(byCat[key]||[]).map((ev, index) => (
                  <div
                    key={ev.id}
                    style={{
                      marginBottom: 24,
                      paddingBottom: 16,
                      borderBottom: index < (byCat[key]||[]).length - 1 ? '1px solid #eee' : 'none',
                      pageBreakInside: 'avoid'
                    }}
                  >
                    <div style={{
                      fontSize: 12,
                      color: '#555',
                      marginBottom: 8,
                      fontFamily: 'system-ui'
                    }}>
                      {new Date(ev.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                      {ev.author_email && ` • ${ev.author_email}`}
                    </div>

                    {ev.content && (
                      <p style={{
                        fontSize: 15,
                        lineHeight: 1.6,
                        color: '#333',
                        margin: '0 0 8px 0',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {ev.content}
                      </p>
                    )}

                    {ev.file_url && (
                      <div style={{
                        fontSize: 13,
                        color: '#555',
                        fontStyle: 'italic'
                      }}>
                        📎 Attachment: {ev.file_url}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}

        {/* Uncategorised Section */}
        {!!(byCat['uncategorised']||[]).length && (
          <section style={{
            marginBottom: 40,
            pageBreakInside: 'avoid'
          }}>
            <h2 style={{
              fontSize: 18,
              fontWeight: 600,
              color: '#1a1a1a',
              margin: '0 0 20px 0',
              borderBottom: '2px solid #999',
              paddingBottom: 8
            }}>
              Uncategorised Evidence
            </h2>

            <div style={{marginLeft: 20}}>
              {byCat['uncategorised'].map((ev, index) => (
                <div
                  key={ev.id}
                  style={{
                    marginBottom: 24,
                    paddingBottom: 16,
                    borderBottom: index < byCat['uncategorised'].length - 1 ? '1px solid #eee' : 'none',
                    pageBreakInside: 'avoid'
                  }}
                >
                  <div style={{
                    fontSize: 12,
                    color: '#888',
                    marginBottom: 8,
                    fontFamily: 'system-ui'
                  }}>
                    {new Date(ev.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                    {ev.author_email && ` • ${ev.author_email}`}
                  </div>

                  {ev.content && (
                    <p style={{
                      fontSize: 15,
                      lineHeight: 1.6,
                      color: '#333',
                      margin: '0 0 8px 0',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {ev.content}
                    </p>
                  )}

                  {ev.file_url && (
                    <div style={{
                      fontSize: 13,
                      color: '#666',
                      fontStyle: 'italic'
                    }}>
                      📎 Attachment: {ev.file_url}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <div style={{
          marginTop: 60,
          paddingTop: 24,
          borderTop: '1px solid #ddd',
          fontSize: 12,
          color: '#999',
          textAlign: 'center'
        }}>
          Generated by ClaimFlow • {new Date().toLocaleDateString()}
        </div>
      </main>

    </div>
  );
}