/**
 * SECURE Kid Dashboard Page (Session-Based, NO GUIDs)
 * Uses simple active kid session pattern from original repo
 * Follows /parent/dashboard security model
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../lib/auth/session.ts";
import { ChoreService } from "../../lib/services/chore-service.ts";
import SecureKidDashboard from "../../islands/SecureKidDashboard.tsx";

interface SecureKidDashboardData {
  family: any;
  familyMembers: any[];
  recentActivity: any[];
  error?: string;
}

export const handler: Handlers<SecureKidDashboardData> = {
  async GET(req, ctx) {
    // SECURITY: Verify parent session first (same as parent dashboard)
    const parentSession = await getAuthenticatedSession(req);
    if (!parentSession.isAuthenticated || !parentSession.family) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/login" },
      });
    }

    try {
      const choreService = new ChoreService();
      
      // Get family info (from authenticated session, not URL)
      const family = await choreService.getFamily(parentSession.family.id);
      if (!family) {
        return ctx.render({
          kid: null,
          family: null,
          familyMembers: [],
          todaysChores: [],
          recentActivity: [],
          error: "Family not found",
        });
      }

      // Get all family members to find active kid
      const familyMembers = await choreService.getFamilyMembers(parentSession.family.id);
      
      // Get recent family activity
      const recentActivity = await choreService.getRecentActivity(
        parentSession.family.id,
        5,
      );

      console.log("✅ Secure kid dashboard loaded for family:", family.name);

      return ctx.render({
        family,
        familyMembers,
        recentActivity,
      });
    } catch (error) {
      console.error("❌ Error loading kid dashboard:", error);
      return ctx.render({
        family: null,
        familyMembers: [],
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
    </div>
  );
}