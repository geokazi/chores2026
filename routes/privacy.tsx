/**
 * Privacy Policy - ChoreGami Family Chore Management
 * ~220 lines - adapted from mealplanner, respects 500 line limit
 */

import { Head } from "$fresh/runtime.ts";

export default function PrivacyPolicy() {
  const lastUpdated = "January 16, 2026";

  return (
    <>
      <Head>
        <title>Privacy Policy - ChoreGami</title>
        <meta name="description" content="Privacy Policy for ChoreGami family chore management application" />
      </Head>

      <div class="legal-container">
        <div class="legal-card">
          <header class="legal-header">
            <a href="/" class="back-link">← Back to ChoreGami</a>
            <span class="last-updated">Last updated: {lastUpdated}</span>
          </header>

          <h1>Privacy Policy</h1>
          <p class="intro">This policy describes how ChoreGami collects, uses, and protects your information.</p>

          <section>
            <h2>1. Information We Collect</h2>
            <h3>1.1 Account Information</h3>
            <p>When you create an account, we collect:</p>
            <ul>
              <li>Email address or phone number</li>
              <li>Name and family member names</li>
              <li>Account credentials (securely hashed)</li>
              <li>Profile preferences and settings</li>
            </ul>

            <h3>1.2 Usage Data</h3>
            <p>We automatically collect:</p>
            <ul>
              <li>Chore completion records and points</li>
              <li>Feature usage and interaction data</li>
              <li>Device information and IP address</li>
              <li>Browser type and operating system</li>
            </ul>

            <h3>1.3 Children's Information</h3>
            <div class="notice info">
              ChoreGami allows parents to create profiles for children. Child profiles contain only
              names and chore activity data. Parents maintain full control over child data.
            </div>
          </section>

          <section>
            <h2>2. How We Use Your Information</h2>
            <p>We use collected information to:</p>
            <ul>
              <li>Provide and improve the ChoreGami service</li>
              <li>Track chores, points, and family progress</li>
              <li>Send service-related notifications</li>
              <li>Process payments for premium subscriptions</li>
              <li>Analyze usage patterns to improve features</li>
              <li>Respond to support requests</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2>3. Information Sharing</h2>
            <p>We do not sell your personal information. We may share data with:</p>
            <ul>
              <li><strong>Service Providers:</strong> Companies that help us operate (hosting, payments, analytics)</li>
              <li><strong>Family Members:</strong> Within your family group as part of the service</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect rights</li>
            </ul>
            <h3>Third-Party Services</h3>
            <ul>
              <li>Supabase (authentication and database)</li>
              <li>Stripe (payment processing)</li>
              <li>Twilio (phone verification)</li>
              <li>Fly.io (hosting)</li>
            </ul>
          </section>

          <section>
            <h2>4. Data Security</h2>
            <p>We implement security measures including:</p>
            <ul>
              <li>Encrypted data transmission (HTTPS/TLS)</li>
              <li>Secure password hashing</li>
              <li>Regular security audits</li>
              <li>Access controls and authentication</li>
            </ul>
            <div class="notice warning">
              No method of transmission over the Internet is 100% secure. While we strive to protect
              your data, we cannot guarantee absolute security.
            </div>
          </section>

          <section>
            <h2>5. Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li><strong>Access:</strong> Request a copy of your data</li>
              <li><strong>Correction:</strong> Update inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and data</li>
              <li><strong>Portability:</strong> Export your data in a standard format</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
            </ul>
            <p>To exercise these rights, contact us at support@choregami.app</p>
          </section>

          <section>
            <h2>6. Data Retention</h2>
            <p>
              We retain your data while your account is active. Upon account deletion, we remove
              personal data within 30 days, except where retention is required for legal purposes.
            </p>
          </section>

          <section>
            <h2>7. Cookies and Tracking</h2>
            <p>We use cookies for:</p>
            <ul>
              <li><strong>Essential:</strong> Authentication and session management</li>
              <li><strong>Preferences:</strong> Theme and display settings</li>
              <li><strong>Analytics:</strong> Understanding usage patterns (anonymized)</li>
            </ul>
            <p>You can control cookies through your browser settings.</p>
          </section>

          <section>
            <h2>8. International Users</h2>
            <p>
              ChoreGami is operated from the United States. If you access the service from other
              regions, your information may be transferred to and processed in the US.
            </p>
          </section>

          <section>
            <h2>9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy periodically. We will notify you of significant
              changes via email or in-app notification. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2>10. Contact Us</h2>
            <div class="contact-box">
              <p><strong>Privacy Inquiries:</strong> privacy@choregami.app</p>
              <p><strong>General Support:</strong> support@choregami.app</p>
              <p><strong>Company:</strong> GKTech Solutions LLC</p>
            </div>
          </section>

          <footer class="legal-footer">
            <p>© {new Date().getFullYear()} GKTech Solutions LLC. All rights reserved.</p>
            <p><a href="/terms">Terms of Service</a></p>
          </footer>
        </div>

        <style>{`
          .legal-container {
            min-height: 100vh;
            background: linear-gradient(135deg, var(--color-bg, #f0fdf4) 0%, #e8f5e8 100%);
            padding: 1rem;
          }
          .legal-card {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            padding: 2rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          .legal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            flex-wrap: wrap;
            gap: 1rem;
          }
          .back-link {
            color: var(--color-primary, #10b981);
            text-decoration: none;
            font-weight: 600;
          }
          .back-link:hover { text-decoration: underline; }
          .last-updated {
            color: #666;
            font-size: 0.875rem;
          }
          h1 {
            color: var(--color-primary, #10b981);
            text-align: center;
            margin-bottom: 0.5rem;
          }
          .intro {
            text-align: center;
            color: #666;
            margin-bottom: 2rem;
          }
          section {
            margin-bottom: 2rem;
          }
          h2 {
            color: #333;
            border-bottom: 2px solid var(--color-primary, #10b981);
            padding-bottom: 0.5rem;
            margin-bottom: 1rem;
          }
          h3 {
            color: #444;
            margin: 1rem 0 0.5rem;
          }
          p, li {
            color: #555;
            line-height: 1.6;
          }
          ul {
            margin: 0.5rem 0 1rem 1.5rem;
          }
          .notice {
            padding: 1rem;
            border-radius: 8px;
            margin: 1rem 0;
          }
          .notice.info {
            background: #dbeafe;
            border: 1px solid #3b82f6;
            color: #1e40af;
          }
          .notice.warning {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            color: #92400e;
          }
          .contact-box {
            background: #f0fdf4;
            padding: 1rem;
            border-radius: 8px;
            margin: 1rem 0;
          }
          .legal-footer {
            text-align: center;
            margin-top: 3rem;
            padding-top: 1rem;
            border-top: 1px solid #e5e5e5;
            color: #666;
            font-size: 0.875rem;
          }
          .legal-footer a {
            color: var(--color-primary, #10b981);
          }
        `}</style>
      </div>
    </>
  );
}
