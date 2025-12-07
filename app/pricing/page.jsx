'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    description: 'For small teams getting started with R&D documentation',
    price: 49,
    period: 'month',
    features: [
      'Up to 3 active projects',
      '5 team members',
      'Basic evidence capture',
      'Standard export formats',
      'Email support'
    ],
    cta: 'Start free trial',
    highlighted: false
  },
  {
    name: 'Professional',
    description: 'For growing teams that need comprehensive documentation',
    price: 149,
    period: 'month',
    features: [
      'Unlimited projects',
      '20 team members',
      'Advanced evidence capture',
      'GitHub integration',
      'Custom export templates',
      'Priority support',
      'API access'
    ],
    cta: 'Start free trial',
    highlighted: true
  },
  {
    name: 'Enterprise',
    description: 'For organizations with advanced security and compliance needs',
    price: null,
    period: null,
    features: [
      'Everything in Professional',
      'Unlimited team members',
      'SSO & SAML',
      'Advanced security controls',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee',
      'On-premise deployment option'
    ],
    cta: 'Contact sales',
    highlighted: false
  }
];

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);

  const getPrice = (monthlyPrice) => {
    if (!monthlyPrice) return null;
    return isAnnual ? Math.round(monthlyPrice * 0.8) : monthlyPrice;
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
            Simple, transparent pricing
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
            Choose the plan that fits your team. All plans include a 14-day free trial.
          </motion.p>

          {/* Billing Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              marginTop: 40
            }}
          >
            <span style={{
              fontSize: 15,
              fontWeight: 500,
              color: !isAnnual ? 'var(--ink)' : 'var(--muted)'
            }}>
              Monthly
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              style={{
                position: 'relative',
                width: 56,
                height: 32,
                borderRadius: 9999,
                border: 'none',
                backgroundColor: isAnnual ? 'var(--brand)' : 'var(--line)',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
            >
              <span style={{
                position: 'absolute',
                top: 4,
                left: isAnnual ? 28 : 4,
                width: 24,
                height: 24,
                borderRadius: '50%',
                backgroundColor: '#fff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'left 0.2s ease'
              }} />
            </button>
            <span style={{
              fontSize: 15,
              fontWeight: 500,
              color: isAnnual ? 'var(--ink)' : 'var(--muted)'
            }}>
              Annual
            </span>
            {isAnnual && (
              <span style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#16a34a',
                backgroundColor: '#dcfce7',
                padding: '4px 10px',
                borderRadius: 9999
              }}>
                Save 20%
              </span>
            )}
          </motion.div>
        </section>

        {/* Pricing Cards */}
        <section style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '0 24px 120px'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 24,
            alignItems: 'start'
          }}>
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * (index + 3) }}
                style={{
                  position: 'relative',
                  padding: plan.highlighted ? '32px 28px' : '28px 24px',
                  borderRadius: 16,
                  border: plan.highlighted
                    ? '2px solid var(--brand)'
                    : '1px solid var(--line)',
                  backgroundColor: plan.highlighted ? '#fafbff' : '#fff',
                  boxShadow: plan.highlighted
                    ? '0 8px 32px rgba(2, 16, 72, 0.12)'
                    : '0 1px 3px rgba(0,0,0,0.04)'
                }}
              >
                {plan.highlighted && (
                  <div style={{
                    position: 'absolute',
                    top: -12,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'var(--brand)',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '4px 12px',
                    borderRadius: 9999,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Most Popular
                  </div>
                )}

                <h3 style={{
                  fontSize: 22,
                  fontWeight: 600,
                  color: 'var(--ink)',
                  marginBottom: 8
                }}>
                  {plan.name}
                </h3>

                <p style={{
                  fontSize: 15,
                  color: 'var(--muted)',
                  lineHeight: 1.5,
                  marginBottom: 24,
                  minHeight: 44
                }}>
                  {plan.description}
                </p>

                <div style={{
                  marginBottom: 24
                }}>
                  {plan.price ? (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{
                        fontSize: 48,
                        fontWeight: 700,
                        color: 'var(--ink)',
                        lineHeight: 1
                      }}>
                        ${getPrice(plan.price)}
                      </span>
                      <span style={{
                        fontSize: 16,
                        color: 'var(--muted)'
                      }}>
                        /{isAnnual ? 'mo, billed annually' : 'month'}
                      </span>
                    </div>
                  ) : (
                    <div style={{
                      fontSize: 32,
                      fontWeight: 700,
                      color: 'var(--ink)',
                      lineHeight: 1
                    }}>
                      Custom
                    </div>
                  )}
                </div>

                <motion.a
                  href={plan.price ? '/admin/new-project' : '/contact'}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '14px 24px',
                    borderRadius: 12,
                    border: 'none',
                    backgroundColor: plan.highlighted ? 'var(--brand)' : 'transparent',
                    color: plan.highlighted ? '#fff' : 'var(--brand)',
                    fontSize: 15,
                    fontWeight: 600,
                    textAlign: 'center',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: plan.highlighted
                      ? '0 2px 8px rgba(2, 16, 72, 0.2)'
                      : 'inset 0 0 0 2px var(--brand)'
                  }}
                  whileHover={{
                    scale: 1.02,
                    boxShadow: plan.highlighted
                      ? '0 4px 16px rgba(2, 16, 72, 0.25)'
                      : 'inset 0 0 0 2px var(--brand)'
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  {plan.cta}
                </motion.a>

                <ul style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '28px 0 0 0'
                }}>
                  {plan.features.map((feature, featureIndex) => (
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
            ))}
          </div>
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
                question="How does the 14-day free trial work?"
                answer="Start using Aird immediately with full access to all features in your chosen plan. No credit card required. If you decide to continue after 14 days, you'll be prompted to add payment details."
              />
              <FaqItem
                question="Can I change plans later?"
                answer="Yes, you can upgrade or downgrade your plan at any time. When upgrading, you'll get immediate access to new features. When downgrading, changes take effect at your next billing cycle."
              />
              <FaqItem
                question="What payment methods do you accept?"
                answer="We accept all major credit cards (Visa, Mastercard, American Express) as well as direct debit for annual plans. Enterprise customers can pay via invoice."
              />
              <FaqItem
                question="Is my data secure?"
                answer="Absolutely. All data is encrypted in transit and at rest. We use bank-level security and are SOC 2 compliant. Enterprise plans include additional security features like SSO and audit logs."
              />
              <FaqItem
                question="Do you offer discounts for startups or non-profits?"
                answer="Yes, we offer special pricing for eligible startups, non-profits, and educational institutions. Contact our sales team to learn more."
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
            <motion.a
              href="/admin/new-project"
              style={{
                display: 'inline-block',
                padding: '14px 28px',
                background: 'var(--brand)',
                color: 'white',
                borderRadius: 'var(--radius)',
                textDecoration: 'none',
                fontSize: 16,
                fontWeight: 500,
                boxShadow: '0 2px 8px rgba(2, 16, 72, 0.15)'
              }}
              whileHover={{
                scale: 1.05,
                boxShadow: '0 4px 16px rgba(2, 16, 72, 0.25)'
              }}
              whileTap={{ scale: 0.98 }}
            >
              Start your free trial
            </motion.a>
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
