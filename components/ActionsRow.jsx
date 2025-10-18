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
      backgroundColor: '#f8f9fa',
      padding: '40px 0',
      borderBottom: '1px solid #e1e4e8'
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '0 48px'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 20,
          alignItems: 'stretch'
        }}>

          {/* 1. Evidence Flow */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e1e4e8',
            borderRadius: 8,
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            transition: 'all 0.2s ease',
            minHeight: 100
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#d0d7de';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e1e4e8';
            e.currentTarget.style.transform = 'translateY(0)';
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: hasRecentEvidence ? '#22c55e' : '#cbd5e1'
              }} />
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#64748b',
                letterSpacing: '0.03em',
                textTransform: 'uppercase'
              }}>Evidence Flow</span>
            </div>
            <div style={{
              fontSize: 15,
              lineHeight: 1.4,
              color: '#0f172a',
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
            backgroundColor: 'white',
            border: '1px solid #e1e4e8',
            borderRadius: 8,
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            transition: 'all 0.2s ease',
            minHeight: 100
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#d0d7de';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e1e4e8';
            e.currentTarget.style.transform = 'translateY(0)';
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: githubConnected ? '#22c55e' : '#f59e0b'
              }} />
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#64748b',
                letterSpacing: '0.03em',
                textTransform: 'uppercase'
              }}>Automation</span>
            </div>
            <div style={{
              fontSize: 15,
              lineHeight: 1.4,
              color: '#0f172a',
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
            backgroundColor: 'white',
            border: '1px solid #e1e4e8',
            borderRadius: 8,
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            transition: 'all 0.2s ease',
            minHeight: 100
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#d0d7de';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e1e4e8';
            e.currentTarget.style.transform = 'translateY(0)';
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: isComplete ? '#22c55e' : (hasCoverage ? '#f59e0b' : '#cbd5e1')
              }} />
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#64748b',
                letterSpacing: '0.03em',
                textTransform: 'uppercase'
              }}>Coverage</span>
            </div>
            <div style={{
              fontSize: 15,
              lineHeight: 1.4,
              color: '#0f172a',
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
                marginTop: -6
              }}>
                Missing: {coverageData.missing.join(', ')}.
              </div>
            )}
          </div>

          {/* 4. Claim Pack - North Star */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #2a5af9',
            borderRadius: 8,
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            transition: 'all 0.2s ease',
            minHeight: 100,
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#1e40af';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(42, 90, 249, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#2a5af9';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#2a5af9'
              }} />
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#2a5af9',
                letterSpacing: '0.03em',
                textTransform: 'uppercase'
              }}>Claim Pack</span>
            </div>
            <div style={{
              fontSize: 15,
              lineHeight: 1.4,
              color: '#0f172a',
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
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.gap = '6px';
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
