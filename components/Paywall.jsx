'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { Lock, Check, ArrowRight } from 'lucide-react';

export default function Paywall({ projectToken }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!user) {
      // Redirect to login if not authenticated
      window.location.href = `/auth/login?redirect=/p/${projectToken}/pack`;
      return;
    }

    setLoading(true);
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
      } else {
        console.error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    'AI-generated claim pack sections',
    'Export to PDF and Word',
    'Unlimited projects',
    'Full evidence documentation',
    'Professional R&D narratives',
  ];

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        maxWidth: 480,
        width: '100%',
        backgroundColor: 'white',
        borderRadius: 16,
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: '#021048',
          padding: '32px 24px',
          textAlign: 'center',
        }}>
          <div style={{
            width: 56,
            height: 56,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Lock size={28} color="white" />
          </div>
          <h1 style={{
            fontSize: 24,
            fontWeight: 600,
            color: 'white',
            margin: 0,
          }}>
            Unlock Your Claim Pack
          </h1>
          <p style={{
            fontSize: 15,
            color: 'rgba(255, 255, 255, 0.7)',
            marginTop: 8,
          }}>
            Subscribe to access AI-powered claim documentation
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: 24 }}>
          {/* Price */}
          <div style={{
            textAlign: 'center',
            marginBottom: 24,
            paddingBottom: 24,
            borderBottom: '1px solid #e5e7eb',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'center',
              gap: 4,
            }}>
              <span style={{
                fontSize: 48,
                fontWeight: 700,
                color: '#021048',
              }}>
                $49
              </span>
              <span style={{
                fontSize: 16,
                color: '#6b7280',
              }}>
                /month
              </span>
            </div>
            <p style={{
              fontSize: 14,
              color: '#6b7280',
              marginTop: 4,
            }}>
              Cancel anytime
            </p>
          </div>

          {/* Features */}
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: '0 0 24px 0',
          }}>
            {features.map((feature, index) => (
              <li key={index} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 0',
                fontSize: 15,
                color: '#374151',
              }}>
                <Check size={18} color="#16a34a" style={{ flexShrink: 0 }} />
                {feature}
              </li>
            ))}
          </ul>

          {/* CTA Button */}
          <button
            onClick={handleSubscribe}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px 24px',
              backgroundColor: '#021048',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = '#031560';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#021048';
            }}
          >
            {loading ? 'Loading...' : (
              <>
                Subscribe Now
                <ArrowRight size={18} />
              </>
            )}
          </button>

          {/* Security note */}
          <p style={{
            fontSize: 12,
            color: '#9ca3af',
            textAlign: 'center',
            marginTop: 16,
          }}>
            Secure payment powered by Stripe
          </p>
        </div>
      </div>
    </div>
  );
}
