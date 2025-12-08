'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

export default function ActionsRow({
  evidenceCount = 0,
  weeklyCount = 0,
  githubConnected = false,
  coverageData = { covered: 0, total: 5, missing: [] },
  token,
  onConnectGitHub,
  onAddNote
}) {
  const { isSubscribed, user } = useAuth();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const hasRecentEvidence = weeklyCount > 0;
  const coveragePercent = Math.round((coverageData.covered / coverageData.total) * 100);

  const handlePreviewClick = async (e) => {
    // If subscribed, let the link work normally
    if (isSubscribed) return;

    // If not subscribed, prevent default and redirect to checkout
    e.preventDefault();

    if (!user) {
      // Redirect to login if not authenticated
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
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    } finally {
      setCheckoutLoading(false);
    }
  };

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
                backgroundColor: '#021048',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.15s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#031560';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#021048';
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
                backgroundColor: '#021048',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#031560';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#021048';
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
              </svg>
              {githubConnected ? 'Sync' : 'Connect to GitHub'}
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
                backgroundColor: '#021048',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.15s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#031560';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#021048';
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
              {isSubscribed
                ? 'Your claim pack updates as you work. Preview what you\'ve built.'
                : 'Subscribe to unlock your AI-generated claim pack.'}
            </div>
            <a
              href={`/p/${token}/pack`}
              target={isSubscribed ? "_blank" : undefined}
              onClick={handlePreviewClick}
              style={{
                padding: '8px 12px',
                backgroundColor: '#021048',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 500,
                cursor: checkoutLoading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s',
                textDecoration: 'none',
                textAlign: 'center',
                display: 'block',
                opacity: checkoutLoading ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!checkoutLoading) e.currentTarget.style.backgroundColor = '#031560';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#021048';
              }}
            >
              {checkoutLoading ? 'Loading...' : (isSubscribed ? 'Preview' : 'Unlock Claim Pack')}
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
