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
          gap: 24,
          alignItems: 'stretch'
        }}>

          {/* 1. Evidence This Week */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            <div>
              <div style={{
                fontSize: 12,
                color: '#6b7280',
                marginBottom: 6,
                fontWeight: 500
              }}>This week's progress</div>
              <div style={{
                fontSize: 13,
                color: '#111827',
                lineHeight: 1.4,
                marginTop: 8
              }}>
                {weeklyCount > 0
                  ? `${weeklyCount} new piece${weeklyCount !== 1 ? 's' : ''} captured this week.`
                  : 'No evidence captured yet this week.'}
              </div>
            </div>
            <button
              onClick={onAddNote}
              style={{
                padding: '10px 14px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'center',
                width: '100%'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1d4ed8';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Add more →
            </button>
          </div>

          {/* 2. Automation */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            <div>
              <div style={{
                fontSize: 12,
                color: '#6b7280',
                marginBottom: 6,
                fontWeight: 500
              }}>Automation</div>
              <div style={{
                fontSize: 13,
                color: '#111827',
                lineHeight: 1.4,
                marginTop: 8
              }}>
                {githubConnected ? (
                  'GitHub capturing automatically.'
                ) : (
                  'Connect GitHub to capture commits automatically.'
                )}
              </div>
            </div>
            {!githubConnected && (
              <button
                onClick={onConnectGitHub}
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'center',
                  width: '100%'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#059669';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#10b981';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Connect GitHub →
              </button>
            )}
          </div>

          {/* 3. R&D Coverage */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            <div>
              <div style={{
                fontSize: 12,
                color: '#6b7280',
                marginBottom: 6,
                fontWeight: 500
              }}>R&D coverage</div>
              <div style={{
                fontSize: 13,
                color: '#111827',
                lineHeight: 1.4,
                marginTop: 8
              }}>
                {coverageData.covered} of {coverageData.total} R&D steps captured.
              </div>
            </div>
            {/* Simple progress bar */}
            <div style={{
              width: '100%',
              height: 3,
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
            {coverageData.covered < coverageData.total && coverageData.missing.length > 0 && (
              <div style={{
                fontSize: 11,
                color: '#6b7280',
                marginTop: -2
              }}>
                Add a {coverageData.missing[0].toLowerCase()} to strengthen your story →
              </div>
            )}
          </div>

          {/* 4. Claim Pack */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            <div>
              <div style={{
                fontSize: 12,
                color: '#6b7280',
                marginBottom: 6,
                fontWeight: 500
              }}>Claim pack in progress</div>
              <div style={{
                fontSize: 13,
                color: '#111827',
                lineHeight: 1.4,
                marginTop: 8
              }}>
                Your claim pack updates as you work.
              </div>
            </div>
            <a
              href={`/p/${token}/pack`}
              target="_blank"
              style={{
                padding: '10px 14px',
                backgroundColor: '#7c3aed',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                textDecoration: 'none',
                textAlign: 'center',
                display: 'block'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#6d28d9';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(124, 58, 237, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#7c3aed';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
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
