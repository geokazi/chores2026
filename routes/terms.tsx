/**
 * Terms of Service - ChoreGami Family Chore Management
 * ~180 lines - adapted from mealplanner, respects 500 line limit
 */

import { Head } from "$fresh/runtime.ts";

export default function TermsOfService() {
  const lastUpdated = "January 16, 2026";

  return (
    <>
      <Head>
        <title>Terms of Service - ChoreGami</title>
        <meta name="description" content="Terms of Service for ChoreGami family chore management application" />
      </Head>

      <div class="legal-container">
        <div class="legal-card">
          <header class="legal-header">
            <a href="/" class="back-link">← Back to ChoreGami</a>
            <span class="last-updated">Last updated: {lastUpdated}</span>
          </header>

          <h1>Terms of Service</h1>
          <p class="intro">Please read these Terms of Service carefully before using ChoreGami.</p>

          <section>
            <h2>1. Acceptance of Terms</h2>
            <div class="notice warning">
              <strong>IMPORTANT:</strong> By using ChoreGami, you acknowledge and agree that:
              <ul>
                <li>ChoreGami reserves the right to modify these Terms at any time</li>
                <li>You use ChoreGami at your own risk</li>
                <li>You agree to indemnify and hold ChoreGami harmless from all claims</li>
              </ul>
              If you do not agree to these terms, do not use the Service.
            </div>
            <p>
              By accessing or using ChoreGami ("the Service"), you agree to be bound by these Terms of Service.
              If you disagree with any part of these terms, you may not access the Service.
            </p>
          </section>

          <section>
            <h2>2. Description of Service</h2>
            <p>ChoreGami is a family chore management platform that allows users to:</p>
            <ul>
              <li>Create and manage family chore assignments</li>
              <li>Track chore completion and award points</li>
              <li>View family leaderboards and activity</li>
              <li>Manage family member profiles and permissions</li>
              <li>Access premium features with subscription plans</li>
            </ul>
          </section>

          <section>
            <h2>3. User Accounts</h2>
            <h3>3.1 Registration</h3>
            <p>
              You must register an account to access ChoreGami features. Registration is permitted for
              persons 18 years or older. Parents/guardians may create child profiles within their family account.
              You must provide accurate information during registration.
            </p>
            <h3>3.2 Account Security</h3>
            <p>
              You are responsible for maintaining the security of your account credentials and for all
              activities conducted through your account.
            </p>
          </section>

          <section>
            <h2>4. Subscription and Billing</h2>
            <h3>4.1 Plans</h3>
            <div class="plan-box">
              <p><strong>Free Plan:</strong> Basic chore tracking for small families</p>
              <p><strong>Premium Plan:</strong> Advanced features including unlimited family members, detailed analytics, and priority support</p>
            </div>
            <h3>4.2 Billing</h3>
            <ul>
              <li>Subscription fees are billed in advance on a recurring basis</li>
              <li>You authorize automatic charging of your selected payment method</li>
              <li>All fees are non-refundable except as required by law</li>
              <li>You may cancel your subscription at any time</li>
            </ul>
          </section>

          <section>
            <h2>5. User Responsibilities</h2>
            <p>You agree to:</p>
            <ul>
              <li>Use the Service only for lawful purposes</li>
              <li>Not share account credentials with unauthorized users</li>
              <li>Supervise children's use of the Service appropriately</li>
              <li>Not attempt to circumvent security measures</li>
              <li>Not use the Service to harass or harm others</li>
            </ul>
          </section>

          <section>
            <h2>6. Limitation of Liability</h2>
            <div class="notice warning">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, CHOREGAMI SHALL NOT BE LIABLE FOR ANY DIRECT,
              INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
            </div>
          </section>

          <section>
            <h2>7. Termination</h2>
            <p>
              We may terminate or suspend your account at any time for violations of these Terms.
              Upon termination, your right to use the Service will immediately cease.
            </p>
          </section>

          <section>
            <h2>8. Contact Us</h2>
            <div class="contact-box">
              <p><strong>Email:</strong> support@choregami.app</p>
              <p><strong>Company:</strong> GKTech Solutions LLC</p>
              <p><strong>Website:</strong> choregami.fly.dev</p>
            </div>
          </section>

          <footer class="legal-footer">
            <p>© {new Date().getFullYear()} GKTech Solutions LLC. All rights reserved.</p>
            <p><a href="/privacy">Privacy Policy</a></p>
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
          .notice.warning {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            color: #92400e;
          }
          .notice ul {
            margin: 0.5rem 0 0 1rem;
          }
          .plan-box, .contact-box {
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
