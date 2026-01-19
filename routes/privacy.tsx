/**
 * Privacy Policy - ChoreGami Family Chore Management
 * Trust-forward, COPPA-aware, aligned with prepaid/gift model
 */

import { Head } from "$fresh/runtime.ts";

export default function PrivacyPolicy() {
  const lastUpdated = "January 18, 2026";

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
          <p class="intro">
            This Privacy Policy explains how ChoreGami ("we," "us," or "our") collects, uses,
            and protects information when you use the ChoreGami service.
          </p>

          <section>
            <h2>1. Information We Collect</h2>
            <p>We collect only the information necessary to operate and improve ChoreGami.</p>

            <h3>1.1 Account Information (Parents & Guardians)</h3>
            <p>When an adult creates an account, we collect:</p>
            <ul>
              <li>Email address or phone number</li>
              <li>Name</li>
              <li>Account credentials (stored using secure hashing)</li>
              <li>Family and profile preferences</li>
            </ul>
            <p>This information is used to authenticate your account and provide access to the Service.</p>
          </section>

          <section>
            <h3>1.2 Child Profile Information</h3>
            <p>Parents or legal guardians may create profiles for children within their family account.</p>
            <p>Child profiles may include:</p>
            <ul>
              <li>First name or nickname</li>
              <li>Chore assignments and completion history</li>
              <li>Points, rewards, and activity related to chores</li>
            </ul>
            <div class="notice safe">
              <strong>We do not collect:</strong>
              <ul>
                <li>Email addresses for children</li>
                <li>Phone numbers for children</li>
                <li>Location data for children</li>
                <li>Marketing data for children</li>
              </ul>
            </div>
            <p>Parents retain full control over child profiles and may edit or delete them at any time.</p>
          </section>

          <section>
            <h3>1.3 Usage and Activity Data</h3>
            <p>We automatically collect limited usage data to operate and improve the Service, including:</p>
            <ul>
              <li>Chore activity and completion records</li>
              <li>Feature usage and interaction data</li>
              <li>Device type, browser type, and operating system</li>
              <li>IP address (used for security and fraud prevention)</li>
            </ul>
            <p>We do not track users across unrelated websites or apps.</p>
          </section>

          <section>
            <h3>1.4 Payments, Plans, and Gifts</h3>
            <p>If you purchase a paid plan or gift:</p>
            <ul>
              <li>Payment information is processed securely by third-party providers (e.g., Stripe)</li>
              <li>We do not store full credit card numbers</li>
              <li>We store purchase records, plan type, and expiration dates</li>
            </ul>
            <p>If you purchase or redeem a gift code:</p>
            <ul>
              <li>We store the gift code, purchase date, and redemption status</li>
              <li>Optional gift messages are stored and shown only to the recipient</li>
              <li>Gift codes have no cash value and are used solely to activate paid access</li>
            </ul>
          </section>

          <section>
            <h2>2. How We Use Your Information</h2>
            <p>We use information to:</p>
            <ul>
              <li>Provide and operate ChoreGami features</li>
              <li>Manage family accounts, chores, and permissions</li>
              <li>Enable paid access, gifts, and plan expiration</li>
              <li>Send service-related notifications (e.g., reminders, plan status)</li>
              <li>Improve usability, performance, and reliability</li>
              <li>Respond to support requests</li>
              <li>Comply with legal obligations</li>
            </ul>
            <p class="highlight">We do not use family or child data for targeted advertising.</p>
          </section>

          <section>
            <h2>3. Information Sharing</h2>
            <p class="highlight">We do not sell personal information.</p>
            <p>We may share limited data only in the following cases:</p>

            <h3>3.1 Service Providers</h3>
            <p>Trusted third parties that help us operate ChoreGami, such as:</p>
            <ul>
              <li>Supabase (authentication and database)</li>
              <li>Stripe (payment processing)</li>
              <li>Twilio (phone verification, if enabled)</li>
              <li>Fly.io (hosting and infrastructure)</li>
            </ul>
            <p>These providers are permitted to use data only to perform services on our behalf.</p>

            <h3>3.2 Within Your Family</h3>
            <p>
              Information such as chore assignments, completions, and points is visible to members
              within the same family account, as intended by the Service.
            </p>

            <h3>3.3 Legal Requirements</h3>
            <p>
              We may disclose information if required by law or to protect the rights, safety,
              or security of ChoreGami and its users.
            </p>
          </section>

          <section>
            <h2>4. Children's Privacy</h2>
            <p>ChoreGami is designed for family use under parental supervision.</p>
            <ul>
              <li>Only adults may create accounts</li>
              <li>Children may only use the Service through parent-managed profiles</li>
              <li>Parents control what information is stored and shared within the family</li>
            </ul>
            <p>
              If you believe a child's information has been collected improperly, please contact us
              and we will promptly address the issue.
            </p>
          </section>

          <section>
            <h2>5. Data Security</h2>
            <p>
              We use reasonable administrative, technical, and organizational safeguards to protect
              your information, including:
            </p>
            <ul>
              <li>Encrypted data transmission (HTTPS/TLS)</li>
              <li>Secure credential storage</li>
              <li>Access controls and authentication</li>
              <li>Limited internal access to data</li>
            </ul>
            <p>No system is 100% secure, but we work continuously to protect your information.</p>
          </section>

          <section>
            <h2>6. Your Rights and Choices</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access your account data</li>
              <li>Correct inaccurate information</li>
              <li>Delete your account and associated data</li>
              <li>Export your data in a standard format</li>
              <li>Opt out of non-essential communications</li>
            </ul>
            <p>To exercise these rights, contact us at <a href="mailto:support@choregami.app">support@choregami.app</a>.</p>
          </section>

          <section>
            <h2>7. Data Retention</h2>
            <p>We retain personal data only while your account is active or as needed to provide the Service.</p>
            <p>When you delete your account:</p>
            <ul>
              <li>Personal data is removed within 30 days</li>
              <li>Some records may be retained if required for legal or accounting purposes</li>
            </ul>
          </section>

          <section>
            <h2>8. Cookies and Similar Technologies</h2>
            <p>We use cookies and similar technologies for:</p>
            <ul>
              <li><strong>Essential functionality:</strong> Authentication, session management</li>
              <li><strong>Preferences:</strong> Display and theme settings</li>
              <li><strong>Analytics:</strong> Aggregated, non-identifying usage insights</li>
            </ul>
            <p>You can control cookies through your browser settings.</p>
          </section>

          <section>
            <h2>9. International Users</h2>
            <p>
              ChoreGami is operated from the United States. If you access the Service from outside
              the U.S., your information may be transferred to and processed in the United States.
            </p>
          </section>

          <section>
            <h2>10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. If changes are significant,
              we will notify you via email or in-app notice. Continued use of the Service after
              changes means you accept the updated policy.
            </p>
          </section>

          <section>
            <h2>11. Contact Us</h2>
            <div class="contact-box">
              <p><strong>Privacy inquiries:</strong> <a href="mailto:privacy@choregami.app">privacy@choregami.app</a></p>
              <p><strong>General support:</strong> <a href="mailto:support@choregami.app">support@choregami.app</a></p>
              <p><strong>Company:</strong> GKTech Solutions LLC</p>
            </div>
          </section>

          <footer class="legal-footer">
            <p>© {new Date().getFullYear()} GKTech Solutions LLC. All rights reserved.</p>
            <p>Please also review our <a href="/terms">Terms of Service</a>.</p>
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
            line-height: 1.6;
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
            margin: 1.5rem 0 0.5rem;
          }
          p, li {
            color: #555;
            line-height: 1.7;
          }
          p {
            margin-bottom: 0.75rem;
          }
          ul {
            margin: 0.5rem 0 1rem 1.5rem;
          }
          li {
            margin-bottom: 0.25rem;
          }
          a {
            color: var(--color-primary, #10b981);
          }
          .notice {
            padding: 1rem;
            border-radius: 8px;
            margin: 1rem 0;
          }
          .notice.safe {
            background: #f0fdf4;
            border: 1px solid #10b981;
            color: #065f46;
          }
          .notice ul {
            margin: 0.5rem 0 0 1rem;
          }
          .notice li {
            color: inherit;
          }
          .highlight {
            background: #f0fdf4;
            padding: 0.5rem 0.75rem;
            border-radius: 6px;
            display: inline-block;
            font-weight: 500;
            color: #065f46;
          }
          .contact-box {
            background: #f9fafb;
            padding: 1rem;
            border-radius: 8px;
            margin: 1rem 0;
          }
          .contact-box p {
            margin: 0.5rem 0;
          }
          .legal-footer {
            text-align: center;
            margin-top: 3rem;
            padding-top: 1.5rem;
            border-top: 1px solid #e5e5e5;
            color: #666;
            font-size: 0.875rem;
          }
          .legal-footer a {
            color: var(--color-primary, #10b981);
          }
          @media (max-width: 600px) {
            .legal-card {
              padding: 1.5rem 1rem;
            }
          }
        `}</style>
      </div>
    </>
  );
}
