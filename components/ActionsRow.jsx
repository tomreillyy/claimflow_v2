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
        margin: '0 auto'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 32,
          alignItems: 'stretch'
        }}>

          {/* 1. Evidence */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div style={{
              fontSize: 13,
              color: '#374151',
              lineHeight: 1.5,
              marginBottom: 12
            }}>
              {weeklyCount > 0
                ? `${weeklyCount} new piece${weeklyCount !== 1 ? 's' : ''} captured this week. Add more to strengthen your claim.`
                : 'No evidence captured this week. Add more to strengthen your claim.'}
            </div>
            <button
              onClick={onAddNote}
              style={{
                padding: '8px 12px',
                backgroundColor: '#4b5563',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.15s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#374151';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#4b5563';
              }}
            >
              Add note
            </button>
          </div>

          {/* 2. Automation */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div style={{
              fontSize: 13,
              color: '#374151',
              lineHeight: 1.5,
              marginBottom: 12
            }}>
              {githubConnected ? (
                'GitHub capturing automatically. Every commit adds to your record.'
              ) : (
                'Connect GitHub to capture commits automatically. Every commit adds to your record.'
              )}
            </div>
            <button
              onClick={onConnectGitHub}
              style={{
                padding: '8px 12px',
                backgroundColor: '#4b5563',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.15s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#374151';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#4b5563';
              }}
            >
              {githubConnected ? 'Manage sources' : 'Connect GitHub'}
            </button>
          </div>

          {/* 3. Coverage */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div style={{
              fontSize: 13,
              color: '#374151',
              lineHeight: 1.5,
              marginBottom: 12
            }}>
              {coverageData.covered} of {coverageData.total} R&D steps captured. {coverageData.covered < coverageData.total && coverageData.missing.length > 0 && `Add a ${coverageData.missing[0].toLowerCase()} to strengthen your story.`}
            </div>
            <button
              onClick={onAddNote}
              style={{
                padding: '8px 12px',
                backgroundColor: '#4b5563',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.15s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#374151';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#4b5563';
              }}
            >
              {coverageData.missing.length > 0 ? `Add ${coverageData.missing[0].toLowerCase()}` : 'Add note'}
            </button>
          </div>

          {/* 4. Claim Pack */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div style={{
              fontSize: 13,
              color: '#374151',
              lineHeight: 1.5,
              marginBottom: 12
            }}>
              Your claim pack updates as you work. Preview what you've built.
            </div>
            <a
              href={`/p/${token}/pack`}
              target="_blank"
              style={{
                padding: '8px 12px',
                backgroundColor: '#4b5563',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.15s',
                textDecoration: 'none',
                textAlign: 'center',
                display: 'block'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#374151';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#4b5563';
              }}
            >
              Preview
            </a>
          </div>

        </div>

        {/* Centered divider text */}
        <div style={{
          textAlign: 'center',
          marginTop: 24,
          paddingTop: 20,
          borderTop: '1px solid #e5e7eb',
          fontSize: 13,
          color: '#6b7280'
        }}>
          Every update you add here flows straight into your claim pack.
        </div>
      </div>
    </div>
  );
}
