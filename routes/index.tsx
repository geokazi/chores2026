/**
 * Kid Selector Page (Post-Login)
 * Main entry point after parent authentication
 *
 * OPTIMIZATION: Uses cached session data instead of DB queries
 * Family data (members, settings) is cached at login in session.ts
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../lib/auth/session.ts";
import { isStaffEmail } from "../lib/auth/staff.ts";
import KidSelector from "../islands/KidSelector.tsx";
import AppHeader from "../islands/AppHeader.tsx";
import AppFooter from "../components/AppFooter.tsx";

interface IndexPageData {
  family: {
    id: string;
    name: string;
    children_pins_enabled: boolean;
    theme: string;
  };
  familyMembers: Array<{
    id: string;
    name: string;
    role: "parent" | "child";
    current_points: number;
  }>;
  error?: string;
  showGiftSuccess?: boolean;
}

export const handler: Handlers<IndexPageData> = {
  async GET(req, ctx) {
    const url = new URL(req.url);
    const showGiftSuccess = url.searchParams.get("gift") === "activated";
    const session = await getAuthenticatedSession(req);

    // Staff users go to admin dashboard
    if (session.isAuthenticated && session.user?.email && isStaffEmail(session.user.email)) {
      return new Response(null, { status: 303, headers: { Location: "/admin" } });
    }

    // Redirect to landing page if not authenticated (value-first UX)
    if (!session.isAuthenticated || !session.family) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/landing" },
      });
    }

    // OPTIMIZATION: Use cached session data (no DB queries needed)
    const { family } = session;

    console.log("✅ Kid selector (cached):", {
      user: session.user?.email,
      family: family.name,
      memberCount: family.members.length,
      pinsEnabled: family.children_pins_enabled,
    });

    return ctx.render({
      family: {
        id: family.id,
        name: family.name,
        children_pins_enabled: family.children_pins_enabled,
        theme: family.theme,
      },
      familyMembers: family.members,
      showGiftSuccess,
    });
  },
};

export default function IndexPage({ data }: PageProps<IndexPageData>) {
  const { family, familyMembers, error, showGiftSuccess } = data;

  if (error) {
    return (
      <div class="container">
        <div class="header">
          <h1>ChoreGami</h1>
        </div>
        <div class="card">
          <p style={{ color: "var(--color-warning)", textAlign: "center" }}>
            {error}
          </p>
          <a
            href="/login"
            class="btn btn-primary"
            style={{ marginTop: "1rem" }}
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div class="container">
      {/* Check for pending invite token from OAuth flow (fallback for existing users) */}
      <script dangerouslySetInnerHTML={{
        __html: `
          (function() {
            var token = localStorage.getItem('pendingInviteToken');
            if (token) {
              localStorage.removeItem('pendingInviteToken');
              window.location.href = '/join?token=' + token;
            }
          })();
        `
      }} />
      <AppHeader
        currentPage="selector"
        pageTitle="ChoreGami"
        familyMembers={familyMembers}
        currentUser={null}
        userRole="parent"
      />

      {showGiftSuccess && (
        <div style={{
          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
          color: "white",
          padding: "1rem",
          borderRadius: "0.5rem",
          marginTop: "1rem",
          textAlign: "center",
          fontWeight: "500",
        }}>
          🎁 Your gift subscription is now active! Enjoy your Family Plan.
        </div>
      )}

      <div style={{ marginBottom: "1rem", marginTop: "1rem" }}>
        <h2
          style={{
            fontSize: "1.25rem",
            fontWeight: "600",
            marginBottom: "0.5rem",
          }}
        >
          Who's contributing today?
        </h2>
      </div>

      <KidSelector
        family={family}
        familyMembers={familyMembers}
      />

      <div style={{ marginTop: "2rem", textAlign: "center" }}>
        <a
          href="/parent/dashboard"
          style={{
            color: "var(--color-secondary)",
            textDecoration: "none",
            fontWeight: "500",
          }}
        >
          Family Dashboard →
        </a>
      </div>

      <AppFooter />
    </div>
  );
}
