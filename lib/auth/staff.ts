/**
 * Staff Access Control for ChoreGami Admin Pages
 * Uses email-based validation following the established pattern.
 * ~40 lines
 */

// Authorized staff domains
const STAFF_DOMAINS = [
  "@choregami.com",
  "@choregami.app",
  "@probuild365.com",
];

// Specific authorized staff emails
const STAFF_EMAILS = [
  "support@choregami.com",
  "admin@choregami.com",
  "gk@probuild365.com",
];

/**
 * Check if an email belongs to ChoreGami staff
 */
export function isStaffEmail(email: string): boolean {
  if (!email) return false;
  const normalizedEmail = email.toLowerCase().trim();

  // Check specific emails first
  if (STAFF_EMAILS.includes(normalizedEmail)) {
    return true;
  }

  // Check domain patterns
  return STAFF_DOMAINS.some((domain) => normalizedEmail.endsWith(domain));
}

/**
 * HTML response for access denied
 */
export function getAccessDeniedHtml(email: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <title>Access Denied - ChoreGami Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        text-align: center;
        padding: 50px 20px;
        background: linear-gradient(135deg, #f0fdf4 0%, #e8f5e8 100%);
        min-height: 100vh;
        margin: 0;
      }
      .container {
        max-width: 400px;
        margin: 0 auto;
        background: white;
        padding: 40px;
        border-radius: 16px;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
      }
      h1 { color: #ef4444; margin: 0 0 16px 0; }
      p { color: #6b7280; margin: 8px 0; }
      strong { color: #064e3b; }
      .domains {
        background: #f9fafb;
        padding: 12px;
        border-radius: 8px;
        margin: 16px 0;
        font-family: monospace;
        font-size: 0.875rem;
      }
      a {
        display: inline-block;
        margin-top: 20px;
        color: #10b981;
        text-decoration: none;
        font-weight: 500;
      }
      a:hover { text-decoration: underline; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Access Denied</h1>
      <p>Admin access is restricted to ChoreGami staff only.</p>
      <p>Your email: <strong>${email}</strong></p>
      <div class="domains">
        Authorized domains:<br>
        @choregami.com, @choregami.app, @probuild365.com
      </div>
      <a href="/">Back to ChoreGami</a>
    </div>
  </body>
</html>`;
}
