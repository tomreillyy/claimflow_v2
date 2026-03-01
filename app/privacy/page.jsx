'use client';

import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function PrivacyPolicy() {
  const headingStyle = {
    fontSize: 20,
    fontWeight: 600,
    color: '#021048',
    marginTop: 32,
    marginBottom: 12,
  };

  const textStyle = {
    fontSize: 15,
    lineHeight: 1.7,
    color: '#374151',
    marginBottom: 16,
  };

  return (
    <main style={{
      minHeight: '100vh',
      background: '#fff',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
      color: '#0f1222',
    }}>
      <Header />

      <div style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '120px 24px 80px',
      }}>
        <h1 style={{
          fontSize: 36,
          fontWeight: 700,
          color: '#021048',
          marginBottom: 8,
        }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 40 }}>
          Last updated: March 2026
        </p>

        <p style={textStyle}>
          ClaimFlow ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
        </p>

        <h2 style={headingStyle}>1. Information We Collect</h2>
        <p style={textStyle}>
          <strong>Account Information:</strong> When you create an account, we collect your email address and name. We use Supabase for authentication via magic link (one-time password) — we never store passwords.
        </p>
        <p style={textStyle}>
          <strong>Project Data:</strong> Information you provide about your R&D projects, including project descriptions, core activities, evidence, cost records, team members, and documents uploaded to the knowledge base.
        </p>
        <p style={textStyle}>
          <strong>Third-Party Integrations:</strong> If you connect services like GitHub or Jira, we store OAuth access tokens and refresh tokens to access your data on those platforms. We only request read-level permissions and fetch data relevant to your R&D documentation.
        </p>
        <p style={textStyle}>
          <strong>Usage Data:</strong> We may collect information about how you access and use the platform, including your IP address, browser type, and pages visited.
        </p>

        <h2 style={headingStyle}>2. How We Use Your Information</h2>
        <p style={textStyle}>We use the information we collect to:</p>
        <ul style={{ ...textStyle, paddingLeft: 24 }}>
          <li>Provide, maintain, and improve the ClaimFlow platform</li>
          <li>Process and organise your R&D tax credit documentation</li>
          <li>Generate AI-powered summaries and match evidence to activities</li>
          <li>Send transactional emails (e.g. magic link login, team invitations)</li>
          <li>Respond to your enquiries and provide customer support</li>
        </ul>

        <h2 style={headingStyle}>3. Data Sharing</h2>
        <p style={textStyle}>
          We do not sell your personal information. We may share data with:
        </p>
        <ul style={{ ...textStyle, paddingLeft: 24 }}>
          <li><strong>Service providers:</strong> Supabase (database & auth), OpenAI (AI processing), SendGrid (email), Stripe (payments)</li>
          <li><strong>Consultants:</strong> If you are linked to an R&D tax consultant on our platform, they can access your project data as authorised by you</li>
          <li><strong>Legal requirements:</strong> When required by law or to protect our rights</li>
        </ul>

        <h2 style={headingStyle}>4. Data Security</h2>
        <p style={textStyle}>
          We implement appropriate technical and organisational measures to protect your data, including encryption in transit (TLS) and at rest. OAuth tokens for third-party services are stored securely in our database and are only used to fetch data you have explicitly authorised.
        </p>

        <h2 style={headingStyle}>5. Data Retention</h2>
        <p style={textStyle}>
          We retain your data for as long as your account is active or as needed to provide our services. You can request deletion of your account and associated data by contacting us.
        </p>

        <h2 style={headingStyle}>6. Your Rights</h2>
        <p style={textStyle}>
          Depending on your jurisdiction, you may have the right to access, correct, delete, or port your personal data. To exercise these rights, please contact us at the email below.
        </p>

        <h2 style={headingStyle}>7. Third-Party Services</h2>
        <p style={textStyle}>
          Our platform integrates with third-party services (GitHub, Jira, Stripe, etc.). Your use of these services is governed by their respective privacy policies. We encourage you to review them.
        </p>

        <h2 style={headingStyle}>8. Changes to This Policy</h2>
        <p style={textStyle}>
          We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the updated policy on this page with a revised "Last updated" date.
        </p>

        <h2 style={headingStyle}>9. Contact Us</h2>
        <p style={textStyle}>
          If you have questions about this Privacy Policy, please contact us at:{' '}
          <a href="mailto:hello@aird.io" style={{ color: '#021048', fontWeight: 500 }}>
            hello@aird.io
          </a>
        </p>
      </div>

      <Footer />
    </main>
  );
}
