/**
 * Kid Dashboard Page
 * Main screen for kids showing their chores and family leaderboard
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { ChoreService } from "../../../lib/services/chore-service.ts";
import KidDashboard from "../../../islands/KidDashboard.tsx";
import KidSessionValidator from "../../../islands/KidSessionValidator.tsx";

interface KidDashboardData {
  kid: any;
  family: any;
  familyMembers: any[];
  todaysChores: any[];
  recentActivity: any[];
  error?: string;
}

export const handler: Handlers<KidDashboardData> = {
  async GET(req, ctx) {
    const kidId = ctx.params.kid_id;

    // Verify parent session first
    const parentSession = await getAuthenticatedSession(req);
    if (!parentSession.isAuthenticated || !parentSession.family) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/login" },
      });
    }

    try {
      const choreService = new ChoreService();

      // Get the kid's profile
      const kid = await choreService.getFamilyMember(kidId);
      if (!kid) {
        return ctx.render({
          kid: null,
          family: null,
          familyMembers: [],
          todaysChores: [],
          recentActivity: [],
          error: "Kid not found",
        });
      }

      // Verify kid belongs to parent's family
      if (kid.family_id !== parentSession.family.id) {
        return ctx.render({
          kid,
          family: null,
          familyMembers: [],
          todaysChores: [],
          recentActivity: [],
          error: "Access denied - kid not in your family",
        });
      }

      // Get family info
      const family = await choreService.getFamily(kid.family_id);
      if (!family) {
        return ctx.render({
          kid,
          family: null,
          familyMembers: [],
          todaysChores: [],
          recentActivity: [],
          error: "Family not found",
        });
      }

      // Check if PIN validation is required for this family
      if (family.children_pins_enabled) {
        // Kid session validation will be handled client-side
        // Server just needs to pass the PIN requirement to client
        console.log(`🔐 PIN required for kid ${kid.name} in family ${family.name || family.id}`);
      }

      // Get all family members for leaderboard
      const familyMembers = await choreService.getFamilyMembers(kid.family_id);

      // 🚀 AUTO-REGISTRATION: FamilyScore now auto-registers families when first chore is completed
      // No explicit registration needed - happens automatically via TransactionService

      // Get today's chores for this kid
      const todaysChores = await choreService.getTodaysChores(
        kidId,
        kid.family_id,
      );

      // Get recent family activity
      const recentActivity = await choreService.getRecentActivity(
        kid.family_id,
        5,
      );

      return ctx.render({
        kid,
        family,
        familyMembers,
        todaysChores,
        recentActivity,
      });
    } catch (error) {
      console.error("Error loading kid dashboard:", error);
      return ctx.render({
        kid: null,
        family: null,
        familyMembers: [],
        todaysChores: [],
        recentActivity: [],
        error: "Failed to load dashboard",
      });
    }
  },
};

export default function KidDashboardPage(
  { data }: PageProps<KidDashboardData>,
) {
  const { kid, family, familyMembers, todaysChores, recentActivity, error } =
    data;

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
    <KidSessionValidator kidId={kid?.id} family={family}>
      <div class="container">
        <div class="header">
          <div>
            <a href="/" style={{ color: "white", textDecoration: "none" }}>
              ← Switch Kid
            </a>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>{kid?.role === "child" ? "👧" : "👨‍👩‍👧‍👦"}</span>
            <span>{kid?.name}</span>
            {family?.children_pins_enabled && (
              <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>🔐</span>
            )}
          </div>
          <div>
            <a
              href="/parent/dashboard"
              style={{ color: "white", textDecoration: "none" }}
            >
              ≡
            </a>
          </div>
        </div>

        <KidDashboard
          kid={kid}
          family={family}
          familyMembers={familyMembers}
          todaysChores={todaysChores}
          recentActivity={recentActivity}
        />
      </div>
    </KidSessionValidator>
  );
}
