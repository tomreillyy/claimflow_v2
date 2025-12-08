'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';

export default function SubscriptionSuccessPage() {
  const { refreshSubscription } = useAuth();

  useEffect(() => {
    // Refresh subscription status after successful payment
    refreshSubscription();
  }, [refreshSubscription]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        style={{
          maxWidth: 480,
          width: '100%',
          backgroundColor: 'white',
          borderRadius: 16,
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
          padding: 40,
          textAlign: 'center',
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          style={{
            width: 80,
            height: 80,
            backgroundColor: '#dcfce7',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}
        >
          <CheckCircle size={40} color="#16a34a" />
        </motion.div>

        <h1 style={{
          fontSize: 28,
          fontWeight: 600,
          color: '#021048',
          marginBottom: 12,
        }}>
          You're all set!
        </h1>

        <p style={{
          fontSize: 16,
          color: '#6b7280',
          lineHeight: 1.6,
          marginBottom: 32,
        }}>
          Your subscription is now active. You have full access to generate and export your R&D claim packs.
        </p>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '14px 24px',
              backgroundColor: '#021048',
              color: 'white',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#031560';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#021048';
            }}
          >
            Go to Dashboard
            <ArrowRight size={18} />
          </Link>
        </div>

        <p style={{
          fontSize: 13,
          color: '#9ca3af',
          marginTop: 24,
        }}>
          A confirmation email has been sent to your inbox.
        </p>
      </motion.div>
    </div>
  );
}
