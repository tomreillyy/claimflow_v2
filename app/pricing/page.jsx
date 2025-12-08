'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { Check } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

const features = [
  'Unlimited projects',
  'Unlimited team members',
  'AI-generated claim pack sections',
  'Evidence capture & organization',
  'GitHub integration',
  'Export to PDF and Word',
  'Professional R&D narratives',
  'Email support'
];

export default function PricingPage() {
  const { user, isSubscribed } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!user) {
      window.location.href = '/auth/login?redirect=/pricing';
      return;
    }

    if (isSubscribed) {
      window.location.href = '/';
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
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />

      <main>
        {/* Hero Section */}
        <section style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: '120px 24px 60px',
          textAlign: 'center'
        }}>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              fontSize: 'clamp(40px, 7vw, 64px)',
              fontWeight: 600,
              lineHeight: 1.1,
              color: 'var(--ink)',
              marginBottom: 16
            }}
          >
            Simple pricing
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{
              fontSize: 20,
              color: 'var(--muted)',
              maxWidth: 600,
              margin: '0 auto',
              lineHeight: 1.6
            }}
          >
            One plan, everything included. Cancel anytime.
          </motion.p>
        </section>

        {/* Single Pricing Card */}
        <section style={{
          maxWidth: 480,
          margin: '0 auto',
          padding: '0 24px 80px'
        }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{
              position: 'relative',
              padding: '32px 28px',
              borderRadius: 16,
              border: '2px solid var(--brand)',
              backgroundColor: '#fafbff',
              boxShadow: '0 8px 32px rgba(2, 16, 72, 0.12)'
            }}
          >
            <h3 style={{
              fontSize: 22,
              fontWeight: 600,
              color: 'var(--ink)',
              marginBottom: 8,
              textAlign: 'center'
            }}>
              Aird Pro
            </h3>

            <p style={{
              fontSize: 15,
              color: 'var(--muted)',
              lineHeight: 1.5,
              marginBottom: 24,
              textAlign: 'center'
            }}>
              Everything you need to build your R&D claim pack
            </p>

            <div style={{
              marginBottom: 24,
              textAlign: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
                <span style={{
                  fontSize: 48,
                  fontWeight: 700,
                  color: 'var(--ink)',
                  lineHeight: 1
                }}>
                  $49
                </span>
                <span style={{
                  fontSize: 16,
                  color: 'var(--muted)'
                }}>
                  /month
                </span>
              </div>
              <p style={{
                fontSize: 14,
                color: 'var(--muted)',
                marginTop: 4
              }}>
                Cancel anytime
              </p>
            </div>

            <motion.button
              onClick={handleSubscribe}
              disabled={loading}
              style={{
                display: 'block',
                width: '100%',
                padding: '14px 24px',
                borderRadius: 12,
                border: 'none',
                backgroundColor: 'var(--brand)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 600,
                textAlign: 'center',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(2, 16, 72, 0.2)'
              }}
              whileHover={!loading ? {
                scale: 1.02,
                boxShadow: '0 4px 16px rgba(2, 16, 72, 0.25)'
              } : {}}
              whileTap={!loading ? { scale: 0.98 } : {}}
            >
              {loading ? 'Loading...' : (isSubscribed ? 'Go to Dashboard' : 'Get Started')}
            </motion.button>

            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: '28px 0 0 0'
            }}>
              {features.map((feature, featureIndex) => (
                <li
                  key={featureIndex}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    fontSize: 15,
                    color: 'var(--ink)',
                    padding: '10px 0',
                    borderTop: featureIndex === 0 ? '1px solid var(--line)' : 'none'
                  }}
                >
                  <Check
                    size={18}
                    style={{
                      color: '#16a34a',
                      flexShrink: 0,
                      marginTop: 2
                    }}
                  />
                  {feature}
                </li>
              ))}
            </ul>
          </motion.div>
        </section>

        {/* FAQ Section */}
        <section style={{
          background: 'var(--bg-soft)',
          borderTop: '1px solid var(--line)',
          padding: '80px 24px'
        }}>
          <div style={{
            maxWidth: 720,
            margin: '0 auto'
          }}>
            <h2 style={{
              fontSize: 'clamp(28px, 4vw, 36px)',
              fontWeight: 600,
              lineHeight: 1.2,
              color: 'var(--ink)',
              textAlign: 'center',
              marginBottom: 48
            }}>
              Frequently asked questions
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <FaqItem
                question="What can I do for free?"
                answer="You can sign up, create projects, add team members, capture evidence, and use AI to classify your R&D activities - all for free. You only need to subscribe when you're ready to generate and export your claim pack."
              />
              <FaqItem
                question="What payment methods do you accept?"
                answer="We accept all major credit cards (Visa, Mastercard, American Express) via our secure payment processor, Stripe."
              />
              <FaqItem
                question="Can I cancel anytime?"
                answer="Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your current billing period."
              />
              <FaqItem
                question="Is my data secure?"
                answer="Absolutely. All data is encrypted in transit and at rest. We use bank-level security to protect your R&D documentation."
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section style={{
          padding: '80px 24px',
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: 600,
            margin: '0 auto'
          }}>
            <h2 style={{
              fontSize: 'clamp(28px, 4vw, 36px)',
              fontWeight: 600,
              lineHeight: 1.2,
              color: 'var(--ink)',
              marginBottom: 16
            }}>
              Ready to get started?
            </h2>
            <p style={{
              fontSize: 18,
              color: 'var(--muted)',
              lineHeight: 1.6,
              marginBottom: 32
            }}>
              Join thousands of teams capturing their innovation story with Aird.
            </p>
            <motion.button
              onClick={handleSubscribe}
              disabled={loading}
              style={{
                display: 'inline-block',
                padding: '14px 28px',
                background: 'var(--brand)',
                color: 'white',
                borderRadius: 'var(--radius)',
                border: 'none',
                fontSize: 16,
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 2px 8px rgba(2, 16, 72, 0.15)'
              }}
              whileHover={!loading ? {
                scale: 1.05,
                boxShadow: '0 4px 16px rgba(2, 16, 72, 0.25)'
              } : {}}
              whileTap={!loading ? { scale: 0.98 } : {}}
            >
              {loading ? 'Loading...' : (isSubscribed ? 'Go to Dashboard' : 'Get Started')}
            </motion.button>
          </div>
        </section>
      </main>
    </>
  );
}

function FaqItem({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{
      borderRadius: 12,
      border: '1px solid var(--line)',
      backgroundColor: '#fff',
      overflow: 'hidden'
    }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left'
        }}
      >
        <span style={{
          fontSize: 17,
          fontWeight: 500,
          color: 'var(--ink)'
        }}>
          {question}
        </span>
        <span style={{
          fontSize: 24,
          color: 'var(--muted)',
          transition: 'transform 0.2s ease',
          transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)'
        }}>
          +
        </span>
      </button>
      <motion.div
        initial={false}
        animate={{
          height: isOpen ? 'auto' : 0,
          opacity: isOpen ? 1 : 0
        }}
        transition={{ duration: 0.2 }}
        style={{ overflow: 'hidden' }}
      >
        <p style={{
          padding: '0 24px 20px',
          margin: 0,
          fontSize: 15,
          lineHeight: 1.6,
          color: 'var(--muted)'
        }}>
          {answer}
        </p>
      </motion.div>
    </div>
  );
}
