/**
 * SECURE Parent Dashboard Page
 * Uses session-based family access (NO family_id in URL)
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../lib/auth/session.ts";
import { ChoreService } from "../../lib/services/chore-service.ts";
import ParentDashboard from "../../islands/ParentDashboard.tsx";

interface ParentDashboardData {
  family: any;
  members: any[];
  chores: any[];
  recentActivity: any[];
  error?: string;
}

export const handler: Handlers<ParentDashboardData> = {
  async GET(req, ctx) {
    // SECURITY: Get family_id from authenticated session, not URL
    const session = await getAuthenticatedSession(req);

    if (!session.isAuthenticated || !session.family) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/login" },
      });
    }

    const familyId = session.family.id;

    try {
      const choreService = new ChoreService();

      // Get family info (already validated via session)
      const family = session.family;

      // Get family members
      const members = await choreService.getFamilyMembers(familyId);

      // 🚀 AUTO-REGISTRATION: FamilyScore now auto-registers families when first chore is completed
      // No explicit registration needed - happens automatically via TransactionService

      // Get all chores (active and completed)
      const chores = await choreService.getAllChores(familyId);

      // Get recent activity (last 10 items)
      const recentActivity = await choreService.getRecentActivity(familyId, 10);

      console.log("✅ Parent dashboard loaded for family:", family.name);

      return ctx.render({
        family,
        members,
        chores,
        recentActivity,
      });
    } catch (error) {
      console.error("❌ Error loading parent dashboard:", error);
      return ctx.render({
        family: session.family,
        members: [],
        chores: [],
        recentActivity: [],
        error: "Failed to load dashboard",
      });
    }
  },
};

export default function ParentDashboardPage(
  { data }: PageProps<ParentDashboardData>,
) {
  const { family, members, chores, recentActivity, error } = data;

  if (error) {
    return (
      <div class="container">
        <div class="header">
          <div>
            <a href="/" style={{ color: "white", textDecoration: "none" }}>
              ← Back
            </a>
          </div>
          <h1>ChoreGami 2026</h1>
          <div></div>
        </div>
        <div class="card">
          <p style={{ color: "var(--color-warning)", textAlign: "center" }}>
            {error}
          </p>
          <a href="/" class="btn btn-primary" style={{ marginTop: "1rem" }}>
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div class="container">
      <div class="header">
        <div>
          <a href="/" style={{ color: "white", textDecoration: "none" }}>
            ← Back
          </a>
        </div>
        <h1>Family Dashboard</h1>
        <div></div>
      </div>

      <ParentDashboard
        family={family}
        members={members}
        chores={chores}
        recentActivity={recentActivity}
      />
    </div>
  );
}