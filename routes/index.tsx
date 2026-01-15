/**
 * Kid Selector Page (Post-Login)
 * Main entry point after parent authentication
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { ChoreService } from "../lib/services/chore-service.ts";
import KidSelector from "../islands/KidSelector.tsx";
import AppFooter from "../components/AppFooter.tsx";

interface IndexPageData {
  family: any;
  familyMembers: any[];
  error?: string;
}

export const handler: Handlers<IndexPageData> = {
  async GET(req, ctx) {
    // SECURITY: Check authentication first
    const { getAuthenticatedSession } = await import("../lib/auth/session.ts");
    const session = await getAuthenticatedSession(req);

    // Redirect to login if not authenticated
    if (!session.isAuthenticated || !session.family) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/login" },
      });
    }

    // User is authenticated - show kid selector
    const familyId = session.family.id;

    try {
      const choreService = new ChoreService();

      // Get fresh family data with current PIN setting (not stale session data)
      const [family, familyMembers] = await Promise.all([
        choreService.getFamily(familyId),
        choreService.getFamilyMembers(familyId)
      ]);

      console.log("✅ Authenticated user accessing kid selector:", {
        user: session.user?.email,
        family: family?.name || session.family.name,
        memberCount: familyMembers.length,
        pinsEnabled: family?.children_pins_enabled
      });

      return ctx.render({
        family: family || session.family, // Use fresh family data with current PIN setting
        familyMembers,
      });
    } catch (error) {
      console.error("❌ Error loading family data:", error);
      return ctx.render({
        family: session.family, // Fallback to session data if fresh fetch fails
        familyMembers: [],
        error: "Failed to load family data",
      });
    }
  },
};

export default function IndexPage({ data }: PageProps<IndexPageData>) {
  const { family, familyMembers, error } = data;

  if (error) {
    return (
      <div class="container">
        <div class="header">
          <h1>ChoreGami 2026</h1>
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
      <div class="header">
        <div>
          <a href="/logout" style={{ color: "white", textDecoration: "none" }}>
            ← Logout
          </a>
        </div>
        <h1>ChoreGami 2026</h1>
        <div>
          <a
            href="/parent/dashboard"
            style={{ color: "white", textDecoration: "none" }}
          >
            ⚙️
          </a>
        </div>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <h2
          style={{
            fontSize: "1.25rem",
            fontWeight: "600",
            marginBottom: "0.5rem",
          }}
        >
          Who's doing chores?
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
