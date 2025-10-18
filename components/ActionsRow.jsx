'use client';

export default function ActionsRow({
  evidenceCount = 0,
  weeklyCount = 0,
  githubConnected = false,
  coverageData = { covered: 0, total: 5, missing: [] },
  token,
  onConnectGitHub,
  onAddNote
}) {
  const hasRecentEvidence = weeklyCount > 0;
  const coveragePercent = Math.round((coverageData.covered / coverageData.total) * 100);

  return (
    <div style={{
      width: '100%',
      backgroundColor: '#f8f9fa',
      padding: '32px 0',
      borderBottom: '1px solid #e1e4e8'
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '0 48px'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          alignItems: 'stretch'
        }}>

          {/* 1. Evidence This Week */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            <div>
              <div style={{
                fontSize: 13,
                color: '#6b7280',
                marginBottom: 8,
                fontWeight: 500
              }}>This week</div>
              <div style={{
                fontSize: 32,
                fontWeight: 700,
                color: '#111827',
                lineHeight: 1
              }}>{weeklyCount}</div>
              <div style={{
                fontSize: 13,
                color: '#6b7280',
                marginTop: 4
              }}>evidence items</div>
            </div>
            <button
              onClick={onAddNote}
              style={{
                padding: '10px 16px',
                backgroundColor: '#111827',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1f2937';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#111827';
              }}
            >
              + Add note
            </button>
          </div>

          {/* 2. GitHub */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            <div>
              <div style={{
                fontSize: 13,
                color: '#6b7280',
                marginBottom: 8,
                fontWeight: 500
              }}>GitHub</div>
              <div style={{
                fontSize: 15,
                fontWeight: 600,
                color: '#111827',
                marginTop: 12
              }}>
                {githubConnected ? (
                  <span style={{ color: '#059669' }}>✓ Connected</span>
                ) : (
                  'Not connected'
                )}
              </div>
            </div>
            {!githubConnected && (
              <button
                onClick={onConnectGitHub}
                style={{
                  padding: '10px 16px',
                  backgroundColor: 'white',
                  color: '#111827',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#9ca3af';
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                Connect
              </button>
            )}
          </div>

          {/* 3. Coverage */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            <div>
              <div style={{
                fontSize: 13,
                color: '#6b7280',
                marginBottom: 8,
                fontWeight: 500
              }}>Coverage</div>
              <div style={{
                fontSize: 32,
                fontWeight: 700,
                color: '#111827',
                lineHeight: 1
              }}>{coveragePercent}%</div>
              <div style={{
                fontSize: 13,
                color: '#6b7280',
                marginTop: 4
              }}>{coverageData.covered}/{coverageData.total} steps</div>
            </div>
            {/* Simple progress bar */}
            <div style={{
              width: '100%',
              height: 4,
              backgroundColor: '#e5e7eb',
              borderRadius: 2,
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${coveragePercent}%`,
                height: '100%',
                backgroundColor: '#111827',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>

          {/* 4. Claim Pack */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            <div>
              <div style={{
                fontSize: 13,
                color: '#6b7280',
                marginBottom: 8,
                fontWeight: 500
              }}>Claim pack</div>
              <div style={{
                fontSize: 15,
                fontWeight: 600,
                color: '#111827',
                marginTop: 12
              }}>
                {evidenceCount} items ready
              </div>
            </div>
            <a
              href={`/p/${token}/pack`}
              target="_blank"
              style={{
                padding: '10px 16px',
                backgroundColor: 'white',
                color: '#111827',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
                textDecoration: 'none',
                textAlign: 'center',
                display: 'block'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#9ca3af';
                e.currentTarget.style.backgroundColor = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              Preview →
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
