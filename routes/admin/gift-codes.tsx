/**
 * Gift Code Admin Panel
 * /admin/gift-codes
 * Staff-only: Generate, view, and manage gift codes
 * ~100 lines
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../lib/auth/session.ts";
import { isStaffEmail, getAccessDeniedHtml } from "../../lib/auth/staff.ts";
import GiftCodeAdmin from "../../islands/GiftCodeAdmin.tsx";

interface AdminPageData {
  staffEmail: string;
}

export const handler: Handlers<AdminPageData> = {
  async GET(req, ctx) {
    // 1. Check authentication
    const session = await getAuthenticatedSession(req);
    if (!session.isAuthenticated || !session.user?.email) {
      const returnUrl = encodeURIComponent(req.url);
      return new Response(null, {
        status: 302,
        headers: { Location: `/login?returnTo=${returnUrl}` },
      });
    }

    // 2. Check staff access
    if (!isStaffEmail(session.user.email)) {
      console.log(`Unauthorized admin access attempt by ${session.user.email}`);
      return new Response(getAccessDeniedHtml(session.user.email), {
        status: 403,
        headers: { "Content-Type": "text/html" },
      });
    }

    console.log(`Staff access authorized for ${session.user.email}`);
    return ctx.render({ staffEmail: session.user.email });
  },
};

export default function GiftCodeAdminPage({ data }: PageProps<AdminPageData>) {
  return (
    <div class="admin-page">
      <header class="admin-header">
        <div class="header-content">
          <a href="/" class="logo">ChoreGami</a>
          <div class="header-right">
            <span class="staff-badge">Staff</span>
            <span class="staff-email">{data.staffEmail}</span>
          </div>
        </div>
      </header>

      <main class="admin-main">
        <GiftCodeAdmin staffEmail={data.staffEmail} />
      </main>

      <style>{`
        .admin-page {
          min-height: 100vh;
          background: #f8fafc;
        }
        .admin-header {
          background: white;
          border-bottom: 1px solid #e5e7eb;
          padding: 1rem 1.5rem;
        }
        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo {
          font-size: 1.25rem;
          font-weight: 700;
          color: #10b981;
          text-decoration: none;
        }
        .header-right {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .staff-badge {
          background: #10b981;
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        .staff-email {
          color: #6b7280;
          font-size: 0.875rem;
        }
        .admin-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 1.5rem;
        }
        @media (max-width: 768px) {
          .admin-main { padding: 1rem; }
          .staff-email { display: none; }
        }
      `}</style>
    </div>
  );
}
