/**
 * Personal Parent Chore View (Client-Side Session-Based)
 * Uses SecureParentDashboard component for proper parent identification
 * Follows same pattern as secure kid dashboard
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../lib/auth/session.ts";
import { ChoreService } from "../../lib/services/chore-service.ts";
import SecureParentDashboard from "../../islands/SecureParentDashboard.tsx";

interface SecureParentData {
  family: any;
  familyMembers: any[];
  recentActivity: any[];
  error?: string;
}

export const handler: Handlers<SecureParentData> = {
  async GET(req, ctx) {
    // SECURITY: Verify parent session (same pattern as secure kid dashboard)
    const parentSession = await getAuthenticatedSession(req);
    if (!parentSession.isAuthenticated || !parentSession.family) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/login" },
      });
    }

    try {
      const choreService = new ChoreService();
      const familyId = parentSession.family.id;

      // Get family info and members (client-side component will handle parent identification)
      const [family, familyMembers] = await Promise.all([
        choreService.getFamily(familyId),
        choreService.getFamilyMembers(familyId)
      ]);

      // Get recent family activity (for context)
      const recentActivity = await choreService.getRecentActivity(familyId, 5);

      console.log(`✅ Secure parent view data loaded for family: ${family.name}`);

      return ctx.render({
        family: family || parentSession.family,
        familyMembers,
        recentActivity,
      });
    } catch (error) {
      console.error("❌ Error loading secure parent view:", error);
      return ctx.render({
        family: parentSession.family,
        familyMembers: [],
        recentActivity: [],
        error: "Failed to load personal chore view",
      });
    }
  },
};

export default function SecurePersonalParentPage({ data }: PageProps<SecureParentData>) {
  const { family, familyMembers, recentActivity, error } = data;

  if (error) {
    return (
      <div class="container">
        <div class="header">
          <div>
            <a href="/" style={{ color: "white", textDecoration: "none" }}>
              ← Back
            </a>
          </div>
          <h1>My Chores</h1>
          <div></div>
        </div>
        <div class="card">
          <p style={{ color: "var(--color-warning)", textAlign: "center" }}>
            {error}
          </p>
          <a href="/parent/dashboard" class="btn btn-primary" style={{ marginTop: "1rem" }}>
            Go to Family Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div class="container">
      {/* Client-side component handles active parent identification and chore loading */}
      <SecureParentDashboard
        family={family}
        familyMembers={familyMembers}
        recentActivity={recentActivity}
      />
    </div>
  );
}