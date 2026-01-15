/**
 * SECURE Kid Dashboard Page (Session-Based, NO GUIDs)
 * Uses simple active kid session pattern from original repo
 *
 * OPTIMIZATION: Uses cached session data for family + members
 * Only queries DB for recent activity (dynamic data)
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../lib/auth/session.ts";
import { ChoreService } from "../../lib/services/chore-service.ts";
import SecureKidDashboard from "../../islands/SecureKidDashboard.tsx";
import AppFooter from "../../components/AppFooter.tsx";

interface SecureKidDashboardData {
  family: any;
  familyMembers: any[];
  recentActivity: any[];
  error?: string;
}

export const handler: Handlers<SecureKidDashboardData> = {
  async GET(req, ctx) {
    const session = await getAuthenticatedSession(req);
    if (!session.isAuthenticated || !session.family) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/login" },
      });
    }

    try {
      const choreService = new ChoreService();

      // OPTIMIZATION: Use cached family + members from session
      const { family } = session;

      // Only query DB for dynamic data (recent activity)
      const recentActivity = await choreService.getRecentActivity(family.id, 5);

      console.log("✅ Kid dashboard (cached):", {
        family: family.name,
        memberCount: family.members.length,
      });

      return ctx.render({
        family,
        familyMembers: family.members,
        recentActivity,
      });
    } catch (error) {
      console.error("❌ Error loading kid dashboard:", error);
      return ctx.render({
        family: session.family,
        familyMembers: session.family?.members || [],
        recentActivity: [],
        error: "Failed to load dashboard",
      });
    }
  },
};

export default function SecureKidDashboardPage(
  { data }: PageProps<SecureKidDashboardData>,
) {
  const { family, familyMembers, recentActivity, error } = data;

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
          <a href="/" class="btn btn-primary" style={{ marginTop: "1rem" }}>
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div class="container">
      <SecureKidDashboard
        family={family}
        familyMembers={familyMembers}
        recentActivity={recentActivity}
      />
      <AppFooter />
    </div>
  );
}