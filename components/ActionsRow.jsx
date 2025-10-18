'use client';

export default function ActionsRow({
  evidenceCount = 0,
  weeklyCount = 0,
  githubConnected = false,
  coverageData = { covered: 0, total: 5, missing: [] },
  token,
  onConnectGitHub
}) {
  // Determine states
  const hasRecentEvidence = weeklyCount > 0;
  const hasCoverage = coverageData.covered > 0;
  const isComplete = coverageData.covered === coverageData.total;
  const coveragePercent = Math.round((coverageData.covered / coverageData.total) * 100);

  return (
    <div style={{
      width: '100%',
      background: 'linear-gradient(to bottom, #fafbfc 0%, #f3f4f6 100%)',
      padding: '48px 0 56px',
      borderBottom: '1px solid #d1d9e0'
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

          {/* 1. Evidence Flow - Active State */}
          <div style={{
            background: hasRecentEvidence
              ? 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)'
              : 'linear-gradient(135deg, #fef3c7 0%, #ffffff 100%)',
            border: hasRecentEvidence ? '2px solid #22c55e' : '2px solid #f59e0b',
            borderRadius: 12,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 16,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            minHeight: 160,
            boxShadow: hasRecentEvidence
              ? '0 4px 20px rgba(34, 197, 94, 0.15), 0 0 0 1px rgba(34, 197, 94, 0.1) inset'
              : '0 4px 16px rgba(245, 158, 11, 0.12)',
            position: 'relative',
            overflow: 'hidden',
            cursor: 'pointer'
          }}
          onClick={() => {
            // Scroll to add note section
            const addNoteBtn = document.querySelector('[data-action="add-note"]');
            addNoteBtn?.click();
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-6px)';
            e.currentTarget.style.boxShadow = hasRecentEvidence
              ? '0 12px 32px rgba(34, 197, 94, 0.25)'
              : '0 12px 28px rgba(245, 158, 11, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = hasRecentEvidence
              ? '0 4px 20px rgba(34, 197, 94, 0.15)'
              : '0 4px 16px rgba(245, 158, 11, 0.12)';
          }}>
            {hasRecentEvidence && (
              <div style={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: 100,
                height: 100,
                background: 'radial-gradient(circle at center, rgba(34, 197, 94, 0.2) 0%, transparent 70%)',
                borderRadius: '50%',
                pointerEvents: 'none'
              }} />
            )}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 12
              }}>
                <div style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: hasRecentEvidence ? '#22c55e' : '#f59e0b',
                  boxShadow: hasRecentEvidence
                    ? '0 0 16px rgba(34, 197, 94, 0.8), 0 0 4px rgba(34, 197, 94, 1)'
                    : '0 0 12px rgba(245, 158, 11, 0.6)',
                  animation: hasRecentEvidence ? 'pulse 2s ease-in-out infinite' : 'none'
                }} />
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: hasRecentEvidence ? '#16a34a' : '#d97706',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase'
                }}>Evidence Flow</span>
              </div>
              <div style={{
                fontSize: 15,
                lineHeight: 1.5,
                color: '#0f172a',
                fontWeight: 500,
                marginBottom: 6
              }}>
                {hasRecentEvidence ? (
                  <>
                    <span style={{
                      fontSize: 28,
                      fontWeight: 800,
                      color: '#16a34a',
                      letterSpacing: '-0.02em'
                    }}>{weeklyCount}</span>
                    <span style={{ fontSize: 14, color: '#64748b', marginLeft: 6 }}>
                      {weeklyCount === 1 ? 'item' : 'items'} this week
                    </span>
                  </>
                ) : (
                  <span style={{ color: '#92400e' }}>Quiet this week</span>
                )}
              </div>
            </div>
            <div style={{
              padding: '10px 16px',
              backgroundColor: hasRecentEvidence ? '#dcfce7' : '#fef3c7',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              color: hasRecentEvidence ? '#166534' : '#92400e',
              textAlign: 'center',
              border: hasRecentEvidence ? '1px solid #bbf7d0' : '1px solid #fde68a'
            }}>
              {hasRecentEvidence ? '✓ Keep going!' : '+ Add evidence now'}
            </div>
            <style jsx>{`
              @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
              }
            `}</style>
          </div>

          {/* 2. Automation - Connection */}
          <div style={{
            background: githubConnected
              ? 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)'
              : 'white',
            border: githubConnected ? '2px solid #3b82f6' : '2px dashed #cbd5e1',
            borderRadius: 12,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 16,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            minHeight: 160,
            boxShadow: githubConnected
              ? '0 4px 16px rgba(59, 130, 246, 0.15)'
              : '0 2px 8px rgba(0, 0, 0, 0.04)',
            cursor: githubConnected ? 'default' : 'pointer'
          }}
          onClick={() => {
            if (!githubConnected && onConnectGitHub) {
              onConnectGitHub();
            }
          }}
          onMouseEnter={(e) => {
            if (!githubConnected) {
              e.currentTarget.style.transform = 'translateY(-6px)';
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.borderStyle = 'solid';
              e.currentTarget.style.boxShadow = '0 12px 28px rgba(59, 130, 246, 0.2)';
            }
          }}
          onMouseLeave={(e) => {
            if (!githubConnected) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.borderStyle = 'dashed';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
            }
          }}>
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 12
              }}>
                <div style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: githubConnected ? '#3b82f6' : '#cbd5e1'
                }} />
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: githubConnected ? '#1e40af' : '#64748b',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase'
                }}>Automation</span>
              </div>
              <div style={{
                fontSize: 15,
                lineHeight: 1.5,
                color: '#0f172a',
                fontWeight: 500
              }}>
                {githubConnected ? (
                  <>
                    <span style={{ color: '#1e40af', fontWeight: 600 }}>GitHub syncing</span>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                      Commits auto-captured
                    </div>
                  </>
                ) : (
                  <>Connect to auto-capture commits</>
                )}
              </div>
            </div>
            {githubConnected ? (
              <div style={{
                padding: '10px 16px',
                backgroundColor: '#dbeafe',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: '#1e40af',
                textAlign: 'center',
                border: '1px solid #bfdbfe'
              }}>
                ✓ Connected
              </div>
            ) : (
              <div style={{
                padding: '10px 16px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: 'white',
                textAlign: 'center',
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
              }}>
                Connect GitHub →
              </div>
            )}
          </div>

          {/* 3. Coverage - Progress */}
          <div style={{
            background: isComplete
              ? 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)'
              : hasCoverage
                ? 'linear-gradient(135deg, #fef3c7 0%, #ffffff 100%)'
                : 'white',
            border: isComplete
              ? '2px solid #22c55e'
              : hasCoverage
                ? '2px solid #f59e0b'
                : '2px solid #e5e7eb',
            borderRadius: 12,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 16,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            minHeight: 160,
            boxShadow: isComplete
              ? '0 4px 20px rgba(34, 197, 94, 0.15)'
              : hasCoverage
                ? '0 4px 16px rgba(245, 158, 11, 0.12)'
                : '0 2px 8px rgba(0, 0, 0, 0.04)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-6px)';
            e.currentTarget.style.boxShadow = isComplete
              ? '0 12px 32px rgba(34, 197, 94, 0.25)'
              : hasCoverage
                ? '0 12px 28px rgba(245, 158, 11, 0.2)'
                : '0 8px 24px rgba(0, 0, 0, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = isComplete
              ? '0 4px 20px rgba(34, 197, 94, 0.15)'
              : hasCoverage
                ? '0 4px 16px rgba(245, 158, 11, 0.12)'
                : '0 2px 8px rgba(0, 0, 0, 0.04)';
          }}>
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 12
              }}>
                <div style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: isComplete ? '#22c55e' : hasCoverage ? '#f59e0b' : '#cbd5e1'
                }} />
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: isComplete ? '#16a34a' : hasCoverage ? '#d97706' : '#64748b',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase'
                }}>Coverage</span>
              </div>
              <div style={{
                fontSize: 28,
                fontWeight: 800,
                color: isComplete ? '#16a34a' : hasCoverage ? '#d97706' : '#94a3b8',
                letterSpacing: '-0.02em',
                marginBottom: 4
              }}>
                {coveragePercent}%
              </div>
              <div style={{
                fontSize: 13,
                color: '#64748b',
                marginBottom: 12
              }}>
                {coverageData.covered} of {coverageData.total} steps covered
              </div>
              {/* Progress bar */}
              <div style={{
                width: '100%',
                height: 6,
                backgroundColor: '#e5e7eb',
                borderRadius: 3,
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${coveragePercent}%`,
                  height: '100%',
                  background: isComplete
                    ? 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)'
                    : hasCoverage
                      ? 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)'
                      : '#cbd5e1',
                  transition: 'width 0.5s ease'
                }} />
              </div>
            </div>
            {!isComplete && coverageData.missing.length > 0 && (
              <div style={{
                padding: '10px 16px',
                backgroundColor: hasCoverage ? '#fef3c7' : '#f3f4f6',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                color: hasCoverage ? '#92400e' : '#64748b',
                textAlign: 'center',
                border: hasCoverage ? '1px solid #fde68a' : '1px solid #e5e7eb'
              }}>
                Need: {coverageData.missing[0]}
              </div>
            )}
            {isComplete && (
              <div style={{
                padding: '10px 16px',
                backgroundColor: '#dcfce7',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: '#166534',
                textAlign: 'center',
                border: '1px solid #bbf7d0'
              }}>
                ✓ Complete!
              </div>
            )}
          </div>

          {/* 4. Claim Pack - The Reward */}
          <a
            href={`/p/${token}/pack`}
            target="_blank"
            style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
              border: 'none',
              borderRadius: 12,
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 16,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              minHeight: 160,
              boxShadow: '0 8px 24px rgba(37, 99, 235, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
              position: 'relative',
              overflow: 'hidden',
              textDecoration: 'none',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 16px 40px rgba(37, 99, 235, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2) inset';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(37, 99, 235, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1) inset';
            }}
          >
            {/* Animated background */}
            <div style={{
              position: 'absolute',
              top: -50,
              right: -50,
              width: 150,
              height: 150,
              background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.15) 0%, transparent 70%)',
              borderRadius: '50%',
              pointerEvents: 'none'
            }} />
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 12
              }}>
                <div style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: 'white',
                  boxShadow: '0 0 16px rgba(255, 255, 255, 0.8)'
                }} />
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'rgba(255, 255, 255, 0.9)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase'
                }}>Claim Pack</span>
              </div>
              <div style={{
                fontSize: 17,
                lineHeight: 1.4,
                color: 'white',
                fontWeight: 600,
                marginBottom: 8
              }}>
                {evidenceCount > 0 ? (
                  <>
                    <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
                      {evidenceCount} items
                    </div>
                    <div style={{ fontSize: 14, opacity: 0.9 }}>
                      Building in real time
                    </div>
                  </>
                ) : (
                  <>Ready to build</>
                )}
              </div>
            </div>
            <div style={{
              padding: '12px 20px',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 700,
              color: '#1e40af',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}>
              Preview your claim pack
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M6 12l4-4-4-4" />
              </svg>
            </div>
          </a>

        </div>
      </div>
    </div>
  );
}
