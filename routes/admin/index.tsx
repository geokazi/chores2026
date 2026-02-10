/**
 * Admin Dashboard Landing Page
 * /admin - Entry point for ChoreGami staff
 * Links to all admin tools
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../lib/auth/session.ts";
import { isStaffEmail, getAccessDeniedHtml } from "../../lib/auth/staff.ts";
import AdminIdleTimeout from "../../islands/AdminIdleTimeout.tsx";

interface AdminPageData {
  userEmail: string;
}

export const handler: Handlers<AdminPageData> = {
  async GET(req, ctx) {
    const session = await getAuthenticatedSession(req);

    // Must be logged in
    if (!session.isAuthenticated || !session.user?.email) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/login?returnTo=/admin" },
      });
    }

    const userEmail = session.user.email;

    // Must be staff
    if (!isStaffEmail(userEmail)) {
      return new Response(getAccessDeniedHtml(userEmail), {
        status: 403,
        headers: { "Content-Type": "text/html" },
      });
    }

    return ctx.render({ userEmail });
  },
};

export default function AdminIndexPage({ data }: PageProps<AdminPageData>) {
  return (
    <div class="admin-page">
      <header class="admin-header">
        <div class="admin-logo">
          <span class="logo-icon">⚙️</span>
          <span class="logo-text">ChoreGami Admin</span>
        </div>
        <div class="admin-user">
          <span>{data.userEmail}</span>
          <a href="/" class="back-link">← Back to App</a>
          <a href="/logout" class="logout-btn">Log out</a>
        </div>
      </header>

      <main class="admin-main">
        <h1>Admin Dashboard</h1>
        <p class="admin-subtitle">ChoreGami staff tools and management</p>

        <div class="admin-cards">
          <a href="/admin/gift-codes" class="admin-card">
            <span class="card-icon">🎁</span>
            <div class="card-content">
              <strong>Gift Codes</strong>
              <span>Generate, view, and manage gift codes</span>
            </div>
          </a>

          <a href="/admin/shopify-skus" class="admin-card">
            <span class="card-icon">🏷️</span>
            <div class="card-content">
              <strong>Shopify SKUs</strong>
              <span>Map SKUs to plan types</span>
            </div>
          </a>

          <a href="/admin/demand-signals" class="admin-card">
            <span class="card-icon">📊</span>
            <div class="card-content">
              <strong>Demand Signals</strong>
              <span>Feature usage & demand tracking</span>
            </div>
          </a>

          <div class="admin-card admin-card-disabled">
            <span class="card-icon">👥</span>
            <div class="card-content">
              <strong>Users</strong>
              <span>Coming soon</span>
            </div>
          </div>

          <div class="admin-card admin-card-disabled">
            <span class="card-icon">💳</span>
            <div class="card-content">
              <strong>Subscriptions</strong>
              <span>Coming soon</span>
            </div>
          </div>
        </div>

        <section class="quick-links">
          <h2>Quick Links</h2>
          <div class="link-list">
            <a href="/families" target="_blank">→ /families landing page</a>
            <a href="/landing" target="_blank">→ /landing page</a>
            <a href="/redeem" target="_blank">→ /redeem page</a>
            <a href="/pricing" target="_blank">→ /pricing page</a>
            <a href="/share" target="_blank">→ /share page</a>
          </div>
        </section>
      </main>

      <AdminIdleTimeout timeoutMinutes={2} />

      <style>{`
        .admin-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        }

        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          background: white;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .admin-logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e293b;
        }

        .logo-icon {
          font-size: 1.5rem;
        }

        .admin-user {
          display: flex;
          align-items: center;
          gap: 1rem;
          font-size: 0.875rem;
          color: #64748b;
        }

        .back-link {
          color: #10b981;
          text-decoration: none;
          font-weight: 500;
        }

        .back-link:hover {
          text-decoration: underline;
        }

        .logout-btn {
          color: #6b7280;
          text-decoration: none;
          font-size: 0.875rem;
          padding: 0.375rem 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          transition: all 0.15s;
        }

        .logout-btn:hover {
          color: #ef4444;
          border-color: #ef4444;
          background: #fef2f2;
        }

        .admin-main {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem 1.5rem;
        }

        h1 {
          margin: 0;
          color: #1e293b;
          font-size: 1.75rem;
        }

        .admin-subtitle {
          color: #64748b;
          margin: 0.5rem 0 2rem;
        }

        .admin-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .admin-card {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1.25rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          text-decoration: none;
          color: inherit;
          transition: all 0.2s;
        }

        .admin-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .admin-card-disabled {
          opacity: 0.5;
          cursor: not-allowed;
          pointer-events: none;
        }

        .card-icon {
          font-size: 2rem;
        }

        .card-content {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .card-content strong {
          color: #1e293b;
          font-size: 1rem;
        }

        .card-content span {
          color: #64748b;
          font-size: 0.875rem;
        }

        .quick-links {
          margin-top: 2rem;
          padding: 1.5rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .quick-links h2 {
          margin: 0 0 1rem;
          font-size: 1rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .link-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .link-list a {
          color: #3b82f6;
          text-decoration: none;
          font-size: 0.9rem;
        }

        .link-list a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
