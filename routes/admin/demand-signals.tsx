/**
 * Demand Signals Admin Page
 * /admin/demand-signals - Staff-only analytics dashboard
 * View aggregated demand signals for product decisions
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../lib/auth/session.ts";
import { isStaffEmail, getAccessDeniedHtml } from "../../lib/auth/staff.ts";
import AdminIdleTimeout from "../../islands/AdminIdleTimeout.tsx";
import DemandSignalsAdmin from "../../islands/DemandSignalsAdmin.tsx";

interface PageData {
  userEmail: string;
}

export const handler: Handlers<PageData> = {
  async GET(req, ctx) {
    const session = await getAuthenticatedSession(req);

    // Must be logged in
    if (!session.isAuthenticated || !session.user?.email) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/login?returnTo=/admin/demand-signals" },
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

export default function DemandSignalsPage({ data }: PageProps<PageData>) {
  return (
    <div class="admin-page">
      <header class="admin-header">
        <div class="admin-logo">
          <span class="logo-icon">📊</span>
          <span class="logo-text">Demand Signals</span>
        </div>
        <div class="admin-user">
          <span>{data.userEmail}</span>
          <a href="/admin" class="back-link">← Admin</a>
          <a href="/" class="back-link">← App</a>
          <a href="/logout" class="logout-btn">Log out</a>
        </div>
      </header>

      <main class="admin-main">
        <h1>Demand Signals Dashboard</h1>
        <p class="admin-subtitle">
          Track feature usage and demand to guide product decisions
        </p>

        <DemandSignalsAdmin />
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
          flex-wrap: wrap;
          gap: 0.5rem;
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
          flex-wrap: wrap;
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
          max-width: 900px;
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

        @media (max-width: 640px) {
          .admin-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .admin-user {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  );
}
