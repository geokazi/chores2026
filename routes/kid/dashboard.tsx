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
import { getActivityService } from "../../lib/services/activity-service.ts";
import SecureKidDashboard from "../../islands/SecureKidDashboard.tsx";
import AppFooter from "../../components/AppFooter.tsx";

interface GoalStatus {
  enabled: boolean;
  target: number;
  progress: number;
  bonus: number;
  achieved: boolean;
}

interface SecureKidDashboardData {
  family: any;
  familyMembers: any[];
  recentActivity: any[];
  goalStatus: GoalStatus | null;
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

      // Query DB for dynamic data (recent activity + goal status)
      const activityService = getActivityService();
      const [recentActivity, goalStatus] = await Promise.all([
        activityService.getRecentActivity(family.id, 10),
        choreService.getFamilyGoalStatus(family.id),
      ]);

      console.log("✅ Kid dashboard (cached):", {
        family: family.name,
        memberCount: family.members.length,
        goalEnabled: goalStatus?.enabled || false,
      });

      return ctx.render({
        family,
        familyMembers: family.members,
        recentActivity,
        goalStatus,
      });
    } catch (error) {
      console.error("❌ Error loading kid dashboard:", error);
      return ctx.render({
        family: session.family,
        familyMembers: session.family?.members || [],
        recentActivity: [],
        goalStatus: null,
        error: "Failed to load dashboard",
      });
    }
  },
};

export default function SecureKidDashboardPage(
  { data }: PageProps<SecureKidDashboardData>,
) {
  const { family, familyMembers, recentActivity, goalStatus, error } = data;

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
        goalStatus={goalStatus}
      />
      <AppFooter />
    </div>
  );
}