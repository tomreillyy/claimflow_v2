'use client';

export default function ActionsRow({
  evidenceCount = 0,
  weeklyCount = 0,
  githubConnected = false,
  coverageData = { covered: 0, total: 5, missing: [] },
  token
}) {
  // Determine states
  const hasRecentEvidence = weeklyCount > 0;
  const hasCoverage = coverageData.covered > 0;
  const isComplete = coverageData.covered === coverageData.total;

  return (
    <div style={{
      width: '100%',
      backgroundColor: '#fafbfc',
      borderTop: '1px solid #e1e4e8',
      borderBottom: '1px solid #e1e4e8',
      padding: '32px 0',
      marginBottom: 40
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '0 48px'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 24,
          alignItems: 'stretch'
        }}>

          {/* 1. Evidence Flow */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <div style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: hasRecentEvidence ? '#22c55e' : '#94a3b8'
              }} />
              <span style={{
                fontSize: 13,
                fontWeight: 500,
                color: '#64748b',
                letterSpacing: '0.01em'
              }}>Evidence Flow</span>
            </div>
            <div style={{
              fontSize: 15,
              lineHeight: 1.5,
              color: '#1e293b',
              fontWeight: 400
            }}>
              {hasRecentEvidence ? (
                <>{weeklyCount} new evidence item{weeklyCount !== 1 ? 's' : ''} added this week.</>
              ) : (
                <>No recent evidence — add one now.</>
              )}
            </div>
          </div>

          {/* 2. Connection Status */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <div style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: githubConnected ? '#22c55e' : '#f59e0b'
              }} />
              <span style={{
                fontSize: 13,
                fontWeight: 500,
                color: '#64748b',
                letterSpacing: '0.01em'
              }}>Automation</span>
            </div>
            <div style={{
              fontSize: 15,
              lineHeight: 1.5,
              color: '#1e293b',
              fontWeight: 400
            }}>
              {githubConnected ? (
                <>GitHub connected.</>
              ) : (
                <>Inbox quiet. Connect to capture automatically.</>
              )}
            </div>
          </div>

          {/* 3. Coverage */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <div style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: isComplete ? '#22c55e' : (hasCoverage ? '#f59e0b' : '#94a3b8')
              }} />
              <span style={{
                fontSize: 13,
                fontWeight: 500,
                color: '#64748b',
                letterSpacing: '0.01em'
              }}>Coverage</span>
            </div>
            <div style={{
              fontSize: 15,
              lineHeight: 1.5,
              color: '#1e293b',
              fontWeight: 400
            }}>
              {isComplete ? (
                <>All activity types covered.</>
              ) : hasCoverage ? (
                <>{coverageData.covered} of {coverageData.total} activity types covered.</>
              ) : (
                <>No coverage yet. Start adding evidence.</>
              )}
            </div>
            {!isComplete && coverageData.missing.length > 0 && (
              <div style={{
                fontSize: 13,
                color: '#64748b',
                marginTop: -4
              }}>
                Missing: {coverageData.missing.join(', ')}.
              </div>
            )}
          </div>

          {/* 4. Claim Pack - North Star */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            position: 'relative'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <div style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: evidenceCount > 0 ? '#2a5af9' : '#94a3b8'
              }} />
              <span style={{
                fontSize: 13,
                fontWeight: 500,
                color: '#64748b',
                letterSpacing: '0.01em'
              }}>Claim Pack</span>
            </div>
            <div style={{
              fontSize: 15,
              lineHeight: 1.5,
              color: '#1e293b',
              fontWeight: 400,
              marginBottom: 4
            }}>
              {evidenceCount > 0 ? (
                <>Claim pack building in real time.</>
              ) : (
                <>Ready to build. Add your first evidence.</>
              )}
            </div>
            <a
              href={`/p/${token}/pack`}
              target="_blank"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 14,
                fontWeight: 500,
                color: '#2a5af9',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
                width: 'fit-content'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.gap = '8px';
                e.currentTarget.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.gap = '6px';
                e.currentTarget.style.textDecoration = 'none';
              }}
            >
              Preview
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M6 12l4-4-4-4" />
              </svg>
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
