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
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10
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
                padding: '8px 12px',
                backgroundColor: '#111827',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1f2937';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#111827';
              }}
            >
              Add more to strengthen your claim →
            </button>
          </div>

          {/* 2. Automation */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10
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
                  padding: '8px 12px',
                  backgroundColor: 'white',
                  color: '#111827',
                  border: '1px solid #d1d5db',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  textAlign: 'left'
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
                Connect GitHub to capture commits →
              </button>
            )}
          </div>

          {/* 3. R&D Coverage */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10
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
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10
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
                padding: '8px 12px',
                backgroundColor: 'white',
                color: '#111827',
                border: '1px solid #d1d5db',
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
                textDecoration: 'none',
                textAlign: 'left',
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
              Preview what you've built →
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
