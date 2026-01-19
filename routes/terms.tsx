/**
 * Terms of Service - ChoreGami Family Chore Management
 * Parent-friendly, plain English, aligned with prepaid/gift model
 */

import { Head } from "$fresh/runtime.ts";

export default function TermsOfService() {
  const lastUpdated = "January 18, 2026";

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
          <p class="intro">Please read these Terms of Service ("Terms") carefully before using ChoreGami.</p>

          <section>
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using ChoreGami ("the Service"), you agree to be bound by these Terms and our{" "}
              <a href="/privacy">Privacy Policy</a>.
            </p>
            <p>
              If you do not agree with these Terms, please do not use the Service.
            </p>
            <p>
              We may update these Terms from time to time. If we make material changes, we will update the
              "Last updated" date. Continued use of the Service after changes means you accept the updated Terms.
            </p>
          </section>

          <section>
            <h2>2. Description of the Service</h2>
            <p>
              ChoreGami is a family chore and responsibility management platform designed to help households
              organize chores, encourage accountability, and build positive habits.
            </p>
            <p>The Service may include:</p>
            <ul>
              <li>Creating and assigning chores</li>
              <li>Tracking chore completion</li>
              <li>Awarding points or rewards</li>
              <li>Viewing family leaderboards and activity</li>
              <li>Managing family members, roles, and permissions</li>
              <li>Accessing optional paid features such as templates, reports, and insights</li>
            </ul>
            <p class="note">
              ChoreGami is intended as a planning and organization tool only and does not replace
              parental supervision or judgment.
            </p>
          </section>

          <section>
            <h2>3. Accounts and Eligibility</h2>
            <h3>3.1 Account Creation</h3>
            <p>You must be at least 18 years old to create a ChoreGami account.</p>
            <p>
              Parents or legal guardians may create and manage child profiles within their family account.
              Child profiles are not permitted to create accounts independently.
            </p>
            <p>You agree to provide accurate and current information when creating your account.</p>

            <h3>3.2 Account Responsibility</h3>
            <p>You are responsible for:</p>
            <ul>
              <li>Maintaining the confidentiality of your login credentials</li>
              <li>All activity that occurs under your account</li>
              <li>Ensuring appropriate supervision of children using the Service</li>
            </ul>
            <p>Please notify us immediately if you believe your account has been compromised.</p>
          </section>

          <section>
            <h2>4. Plans, Payments, and Access</h2>
            <h3>4.1 Free and Paid Access</h3>
            <p>
              ChoreGami offers both free features and optional paid plans. Paid plans may unlock additional
              templates, customization, analytics, or other premium features.
            </p>
            <p>Details of current plans and pricing are shown within the app and may change over time.</p>

            <h3>4.2 Payments</h3>
            <p>If you purchase a paid plan:</p>
            <ul>
              <li>Payment is due in advance</li>
              <li>Prices are shown clearly before purchase</li>
              <li>Purchases may be time-based (e.g., school year, seasonal, or fixed-term access)</li>
              <li>Unless otherwise stated, payments are non-refundable, except where required by law</li>
            </ul>
            <p>Some plans may be offered as one-time purchases rather than recurring subscriptions.</p>

            <h3>4.3 Cancellation and Expiration</h3>
            <ul>
              <li>Paid access ends automatically when the plan expires</li>
              <li>You are not required to renew</li>
              <li>Expired plans revert to the free version of the Service</li>
            </ul>
            <p>Optional renewal reminders may be provided, but you are responsible for managing renewals.</p>

            <h3>4.4 Gifts and Promo Codes</h3>
            <p>Gift codes or promotional access may be offered and are subject to:</p>
            <ul>
              <li>One-time use</li>
              <li>Expiration or activation rules disclosed at redemption</li>
              <li>No cash value and no resale</li>
            </ul>
            <p>We reserve the right to revoke codes obtained fraudulently or used in violation of these Terms.</p>
          </section>

          <section>
            <h2>5. Acceptable Use</h2>
            <p>You agree to use ChoreGami only for lawful and appropriate purposes.</p>
            <p>You may not:</p>
            <ul>
              <li>Attempt to bypass access controls or plan restrictions</li>
              <li>Interfere with the operation or security of the Service</li>
              <li>Use the Service to harass, threaten, or harm others</li>
              <li>Upload or share content that is unlawful or abusive</li>
            </ul>
            <p>Parents and guardians are responsible for how children use the Service.</p>
          </section>

          <section>
            <h2>6. Data and Content</h2>
            <p>You retain ownership of the information you enter into ChoreGami.</p>
            <p>
              By using the Service, you grant us a limited license to store, process, and display your content
              solely to provide and improve the Service.
            </p>
            <p>
              We do not sell personal family data. Please review our{" "}
              <a href="/privacy">Privacy Policy</a> for details on data handling.
            </p>
          </section>

          <section>
            <h2>7. Disclaimer of Warranties</h2>
            <p>ChoreGami is provided "as is" and "as available."</p>
            <p>We do not guarantee that:</p>
            <ul>
              <li>The Service will be uninterrupted or error-free</li>
              <li>Chores will be completed</li>
              <li>Family outcomes or behavior improvements will occur</li>
            </ul>
            <p>Use of the Service is at your own discretion and responsibility.</p>
          </section>

          <section>
            <h2>8. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, ChoreGami shall not be liable for any indirect,
              incidental, special, or consequential damages arising from your use of the Service.
            </p>
            <p>
              Our total liability for any claim related to the Service will not exceed the amount you paid
              to ChoreGami in the 12 months prior to the claim.
            </p>
          </section>

          <section>
            <h2>9. Termination</h2>
            <p>We may suspend or terminate access to the Service if you violate these Terms or misuse the platform.</p>
            <p>You may stop using ChoreGami at any time.</p>
            <p>Termination does not affect any accrued rights or obligations prior to termination.</p>
          </section>

          <section>
            <h2>10. Contact Information</h2>
            <p>If you have questions about these Terms, please contact us:</p>
            <div class="contact-box">
              <p><strong>Email:</strong> support@choregami.app</p>
              <p><strong>Website:</strong> https://choregami.fly.dev</p>
              <p><strong>Company:</strong> GKTech Solutions LLC</p>
            </div>
          </section>

          <footer class="legal-footer">
            <p>© {new Date().getFullYear()} GKTech Solutions LLC. All rights reserved.</p>
            <p>Please also review our <a href="/privacy">Privacy Policy</a>.</p>
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
          .note {
            background: #f0fdf4;
            padding: 0.75rem 1rem;
            border-radius: 8px;
            border-left: 3px solid var(--color-primary, #10b981);
            font-style: italic;
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
