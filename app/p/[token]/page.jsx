import { supabaseAdmin } from '@/lib/supabaseAdmin';
import QuickNoteForm from './quick-note-form';

export default async function Timeline({ params }) {
  const token = params.token;

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

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'white',
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
          <div>
            <a href="/" style={{
              fontSize: 20,
              fontWeight: 600,
              color: '#1a1a1a',
              textDecoration: 'none',
              marginRight: 12
            }}>ClaimFlow</a>
            <span style={{color: '#333'}}>→</span>
            <span style={{marginLeft: 12, color: '#333'}}>{project.name}</span>
          </div>

          <div style={{display: 'flex', gap: 8}}>
            <a
              href={`/p/${token}/upload`}
              style={{
                padding: '6px 12px',
                backgroundColor: 'white',
                color: '#007acc',
                textDecoration: 'none',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 500,
                border: '1px solid #007acc'
              }}
            >
              Upload file
            </a>
            <a
              href={`/p/${token}/pack`}
              target="_blank"
              style={{
                padding: '6px 12px',
                backgroundColor: '#007acc',
                color: 'white',
                textDecoration: 'none',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 500
              }}
            >
              View claim pack
            </a>
          </div>
        </div>
      </header>

      <main style={{
        maxWidth: 1000,
        margin: '0 auto',
        padding: '40px 24px'
      }}>
        {/* Project Header */}
        <div style={{
          backgroundColor: '#f8f9fa',
          borderRadius: 12,
          padding: 32,
          marginBottom: 32,
          border: '1px solid #e5e5e5'
        }}>
          <h1 style={{
            fontSize: 32,
            fontWeight: 600,
            color: '#1a1a1a',
            margin: '0 0 8px 0'
          }}>{project.name}</h1>

          <p style={{
            fontSize: 16,
            color: '#333',
            margin: '0 0 24px 0'
          }}>Evidence timeline for {project.year}</p>

          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: 16
          }}>
            <p style={{
              fontSize: 14,
              color: '#333',
              margin: '0 0 4px 0',
              fontWeight: 500
            }}>Send updates via email:</p>
            <code style={{
              fontSize: 14,
              backgroundColor: '#e2e8f0',
              padding: '4px 8px',
              borderRadius: 4,
              fontFamily: 'Monaco, monospace'
            }}>
              {project.inbound_email_local}@{process.env.PUBLIC_INBOUND_DOMAIN}
            </code>
          </div>
        </div>

        {/* Quick Note Form */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: 12,
          padding: 32,
          marginBottom: 32,
          border: '1px solid #e5e5e5'
        }}>
          <h2 style={{
            fontSize: 20,
            fontWeight: 600,
            color: '#1a1a1a',
            margin: '0 0 16px 0'
          }}>Add quick note</h2>
          <QuickNoteForm token={token} />
        </div>

        {/* Timeline */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: 12,
          border: '1px solid #e5e5e5',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '24px 32px',
            borderBottom: '1px solid #e5e5e5'
          }}>
            <h2 style={{
              fontSize: 20,
              fontWeight: 600,
              color: '#1a1a1a',
              margin: 0
            }}>Evidence Timeline</h2>
          </div>

          {items && items.length > 0 ? (
            <div>
              {items.map((ev, index) => (
                <div
                  key={ev.id}
                  style={{
                    padding: 24,
                    borderBottom: index < items.length - 1 ? '1px solid #f0f0f0' : 'none'
                  }}
                >
                  <div style={{
                    fontSize: 13,
                    color: '#555',
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    <span>{new Date(ev.created_at).toLocaleDateString()}</span>
                    <span style={{color: '#ddd'}}>•</span>
                    <span>{new Date(ev.created_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
                    {ev.author_email && (
                      <>
                        <span style={{color: '#ddd'}}>•</span>
                        <span>{ev.author_email}</span>
                      </>
                    )}
                  </div>

                  {ev.content && (
                    <p style={{
                      fontSize: 15,
                      color: '#333',
                      lineHeight: 1.5,
                      margin: '0 0 12px 0',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {ev.content}
                    </p>
                  )}

                  {ev.file_url && (
                    <a
                      href={ev.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        color: '#007acc',
                        textDecoration: 'none',
                        fontSize: 14,
                        fontWeight: 500,
                        padding: '6px 12px',
                        backgroundColor: '#f0f9ff',
                        borderRadius: 6,
                        border: '1px solid #e0f2fe'
                      }}
                    >
                      📎 View attachment
                    </a>
                  )}

                  {ev.category && (
                    <span style={{
                      display: 'inline-block',
                      fontSize: 12,
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      padding: '4px 8px',
                      borderRadius: 4,
                      marginTop: 8,
                      fontWeight: 500
                    }}>
                      {ev.category}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              padding: 60,
              textAlign: 'center',
              color: '#555'
            }}>
              <p style={{
                fontSize: 16,
                margin: '0 0 8px 0'
              }}>No evidence yet</p>
              <p style={{
                fontSize: 14,
                margin: 0
              }}>Add your first note above or email updates to get started</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}