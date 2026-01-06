/**
 * Parent Dashboard Page
 * Family management and monitoring interface
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { ChoreService } from "../../../lib/services/chore-service.ts";
import ParentDashboard from "../../../islands/ParentDashboard.tsx";

interface ParentDashboardData {
  family: any;
  members: any[];
  chores: any[];
  recentActivity: any[];
  error?: string;
}

export const handler: Handlers<ParentDashboardData> = {
  async GET(req, ctx) {
    const familyId = ctx.params.family_id;

    try {
      const choreService = new ChoreService();

      // Get family info
      const family = await choreService.getFamily(familyId);
      if (!family) {
        return ctx.render({
          family: null,
          members: [],
          chores: [],
          recentActivity: [],
          error: "Family not found",
        });
      }

      // Get family members
      const members = await choreService.getFamilyMembers(familyId);

      // Get all chores (active and completed)
      const chores = await choreService.getAllChores(familyId);

      // Get recent activity (last 10 items)
      const recentActivity = await choreService.getRecentActivity(familyId, 10);

      return ctx.render({
        family,
        members,
        chores,
        recentActivity,
      });
    } catch (error) {
      console.error("Error loading parent dashboard:", error);
      return ctx.render({
        family: null,
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
