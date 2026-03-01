'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

function formatCurrency(amount) {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}k`;
  return `$${amount.toFixed(0)}`;
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

const STEP_LABELS = ['Hypothesis', 'Experiment', 'Observation', 'Evaluation', 'Conclusion'];

const STEP_COLORS = {
  hypothesis: '#6366f1',
  experiment: '#0ea5e9',
  observation: '#10b981',
  evaluation: '#f59e0b',
  conclusion: '#8b5cf6',
};

const SOURCE_ICONS = {
  manual: 'M',
  email: '@',
  github: 'G',
  document: 'D',
};

export default function ProjectDashboard({
  project,
  items,
  token,
  stepCounts,
  coveredSteps,
  missingSteps,
  weeklyEvidence,
  totalEvidence,
  githubConnected,
  ledger,
  coreActivities,
  onConnectGitHub,
  onAddNote,
}) {
  const { isSubscribed, user } = useAuth();
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const coveragePercent = Math.round((coveredSteps / 5) * 100);
  const totalCost = (ledger || []).reduce((sum, row) => sum + (parseFloat(row.total_amount) || 0), 0);
  const teamCount = project.participants?.length || 0;
  const recentItems = (items || []).slice(0, 5);

  const handleUnlockClaimPack = async (e) => {
    if (isSubscribed) return;
    e.preventDefault();
    if (!user) {
      window.location.href = `/auth/login?redirect=/p/${token}/pack`;
      return;
    }
    setCheckoutLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px 0' }}>

      {/* Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 16,
        marginBottom: 32,
      }}>
        {/* Total Evidence */}
        <div style={statCardStyle}>
          <div style={statLabelStyle}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span>Evidence</span>
          </div>
          <div style={statValueStyle}>{totalEvidence}</div>
          <div style={statSubtextStyle}>
            {weeklyEvidence > 0 ? `+${weeklyEvidence} this week` : 'No new this week'}
          </div>
        </div>

        {/* R&D Coverage */}
        <div style={statCardStyle}>
          <div style={statLabelStyle}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 11 12 14 22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <span>R&D Coverage</span>
          </div>
          <div style={statValueStyle}>{coveredSteps}/5</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <div style={{
              flex: 1,
              height: 6,
              backgroundColor: '#e2e8f0',
              borderRadius: 3,
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${coveragePercent}%`,
                height: '100%',
                backgroundColor: coveragePercent === 100 ? '#10b981' : coveragePercent >= 60 ? '#021048' : '#f59e0b',
                borderRadius: 3,
                transition: 'width 0.3s ease',
              }} />
            </div>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{coveragePercent}%</span>
          </div>
        </div>

        {/* Total Costs */}
        <div style={statCardStyle}>
          <div style={statLabelStyle}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <span>R&D Spend</span>
          </div>
          <div style={statValueStyle}>{totalCost > 0 ? formatCurrency(totalCost) : '$0'}</div>
          <div style={statSubtextStyle}>Total recorded</div>
        </div>

        {/* Team */}
        <div style={statCardStyle}>
          <div style={statLabelStyle}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>Team</span>
          </div>
          <div style={statValueStyle}>{teamCount}</div>
          <div style={statSubtextStyle}>{teamCount === 1 ? 'participant' : 'participants'}</div>
        </div>
      </div>

      {/* Action CTA Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 16,
        marginBottom: 32,
      }}>
        {/* Evidence CTA */}
        <div style={ctaCardStyle}>
          <div style={ctaTextStyle}>
            {weeklyEvidence > 0
              ? `${weeklyEvidence} new piece${weeklyEvidence !== 1 ? 's' : ''} captured this week. Add more to strengthen your claim.`
              : 'No evidence captured this week. Add more to strengthen your claim.'}
          </div>
          <button onClick={onAddNote} style={ctaButtonStyle}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#031560'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#021048'}
          >
            Add note
          </button>
        </div>

        {/* GitHub CTA */}
        <div style={ctaCardStyle}>
          <div style={ctaTextStyle}>
            {githubConnected
              ? 'GitHub capturing automatically. Every commit adds to your record.'
              : 'Connect GitHub to capture commits automatically. Every commit adds to your record.'}
          </div>
          <button onClick={onConnectGitHub} style={{ ...ctaButtonStyle, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#031560'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#021048'}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            {githubConnected ? 'Sync' : 'Connect to GitHub'}
          </button>
        </div>

        {/* Coverage CTA */}
        <div style={ctaCardStyle}>
          <div style={ctaTextStyle}>
            {coveredSteps} of 5 R&D steps captured.{' '}
            {missingSteps.length > 0 && `Add a ${missingSteps[0].toLowerCase()} to strengthen your story.`}
          </div>
          <button onClick={onAddNote} style={ctaButtonStyle}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#031560'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#021048'}
          >
            {missingSteps.length > 0 ? `Add ${missingSteps[0].toLowerCase()}` : 'Add note'}
          </button>
        </div>

        {/* Claim Pack CTA */}
        <div style={ctaCardStyle}>
          <div style={ctaTextStyle}>
            {isSubscribed
              ? 'Your claim pack updates as you work. Preview what you\'ve built.'
              : 'Subscribe to unlock your AI-generated claim pack.'}
          </div>
          <a
            href={`/p/${token}/pack`}
            target={isSubscribed ? '_blank' : undefined}
            onClick={handleUnlockClaimPack}
            style={{
              ...ctaButtonStyle,
              textDecoration: 'none',
              textAlign: 'center',
              display: 'block',
              opacity: checkoutLoading ? 0.7 : 1,
              cursor: checkoutLoading ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => { if (!checkoutLoading) e.currentTarget.style.backgroundColor = '#031560'; }}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#021048'}
          >
            {checkoutLoading ? 'Loading...' : (isSubscribed ? 'Preview' : 'Unlock Claim Pack')}
          </a>
        </div>
      </div>

      {/* Two-column: Recent Evidence + Coverage Breakdown */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: 24,
      }}>
        {/* Recent Evidence */}
        <div style={sectionCardStyle}>
          <div style={sectionHeaderStyle}>Recent Evidence</div>
          {recentItems.length === 0 ? (
            <div style={{ padding: '24px 20px', fontSize: 14, color: '#94a3b8', textAlign: 'center' }}>
              No evidence yet. Add your first note to get started.
            </div>
          ) : (
            <div>
              {recentItems.map((ev, i) => {
                const step = ev.systematic_step_primary || 'Unknown';
                const stepKey = step.toLowerCase();
                const source = ev.source || 'manual';
                const content = ev.content || '';
                const snippet = content.length > 120 ? content.slice(0, 120) + '...' : content;

                return (
                  <div key={ev.id} style={{
                    padding: '14px 20px',
                    borderBottom: i < recentItems.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                  }}>
                    {/* Source icon */}
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      backgroundColor: source === 'github' ? '#24292f' : source === 'email' ? '#0ea5e9' : source === 'document' ? '#8b5cf6' : '#021048',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 600,
                      flexShrink: 0,
                      marginTop: 2,
                    }}>
                      {SOURCE_ICONS[source] || 'M'}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: STEP_COLORS[stepKey] || '#64748b',
                          backgroundColor: (STEP_COLORS[stepKey] || '#64748b') + '14',
                          padding: '2px 8px',
                          borderRadius: 10,
                          textTransform: 'uppercase',
                          letterSpacing: '0.03em',
                        }}>
                          {step}
                        </span>
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>
                          {formatDate(ev.created_at)}
                        </span>
                      </div>
                      <div style={{
                        fontSize: 13,
                        color: '#374151',
                        lineHeight: 1.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}>
                        {snippet}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Coverage Breakdown */}
        <div style={sectionCardStyle}>
          <div style={sectionHeaderStyle}>Step Coverage</div>
          <div style={{ padding: '16px 20px' }}>
            {STEP_LABELS.map((step) => {
              const key = step.toLowerCase();
              const count = stepCounts?.[key] || 0;
              const maxCount = Math.max(...Object.values(stepCounts || {}), 1);
              const barPercent = Math.round((count / maxCount) * 100);

              return (
                <div key={step} style={{ marginBottom: 16 }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 6,
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{step}</span>
                    <span style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: count > 0 ? '#0f172a' : '#94a3b8',
                    }}>
                      {count}
                    </span>
                  </div>
                  <div style={{
                    height: 8,
                    backgroundColor: '#f1f5f9',
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: count > 0 ? `${Math.max(barPercent, 4)}%` : '0%',
                      height: '100%',
                      backgroundColor: STEP_COLORS[key] || '#021048',
                      borderRadius: 4,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
              );
            })}

            {missingSteps.length > 0 && (
              <div style={{
                marginTop: 20,
                padding: '10px 14px',
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: 8,
                fontSize: 12,
                color: '#92400e',
                lineHeight: 1.5,
              }}>
                Missing: {missingSteps.join(', ')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Shared styles ---

const statCardStyle = {
  background: 'linear-gradient(145deg, #ffffff 0%, #fafbfc 100%)',
  borderRadius: 16,
  padding: '20px 24px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
  border: '1px solid rgba(0,0,0,0.06)',
};

const statLabelStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 8,
  fontSize: 13,
  fontWeight: 500,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
};

const statValueStyle = {
  fontSize: 32,
  fontWeight: 700,
  color: '#0f172a',
  lineHeight: 1.1,
};

const statSubtextStyle = {
  fontSize: 13,
  color: '#94a3b8',
  marginTop: 4,
};

const ctaCardStyle = {
  backgroundColor: 'white',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
};

const ctaTextStyle = {
  fontSize: 13,
  color: '#374151',
  lineHeight: 1.5,
  marginBottom: 14,
};

const ctaButtonStyle = {
  padding: '8px 14px',
  backgroundColor: '#021048',
  color: 'white',
  border: 'none',
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'background-color 0.15s',
};

const sectionCardStyle = {
  background: 'linear-gradient(145deg, #ffffff 0%, #fafbfc 100%)',
  borderRadius: 16,
  boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
  border: '1px solid rgba(0,0,0,0.06)',
  overflow: 'hidden',
};

const sectionHeaderStyle = {
  padding: '14px 20px',
  borderBottom: '1px solid rgba(0,0,0,0.06)',
  fontSize: 15,
  fontWeight: 600,
  color: '#0f172a',
  backgroundColor: 'rgba(0,0,0,0.01)',
};
