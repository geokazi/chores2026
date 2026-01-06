/**
 * SECURE Parent Activity Page
 * Uses session-based family access (NO family_id in URL)
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../lib/auth/session.ts";
import { ChoreService } from "../../lib/services/chore-service.ts";
import ParentActivityTab from "../../islands/ParentActivityTab.tsx";

interface ParentActivityData {
  family: any;
  recentActivity: any[];
  error?: string;
}

export const handler: Handlers<ParentActivityData> = {
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

      // Get recent activity (last 50 items for activity view)
      const recentActivity = await choreService.getRecentActivity(familyId, 50);

      console.log("✅ Parent activity loaded for family:", session.family.name);

      return ctx.render({
        family: session.family,
        recentActivity,
      });
    } catch (error) {
      console.error("❌ Error loading parent activity:", error);
      return ctx.render({
        family: session.family,
        recentActivity: [],
        error: "Failed to load activity feed",
      });
    }
  },
};

export default function ParentActivityPage(
  { data }: PageProps<ParentActivityData>,
) {
  const { family, recentActivity, error } = data;

  if (error) {
    return (
      <div class="container">
        <div class="header">
          <div>
            <a href="/parent/dashboard" style={{ color: "white", textDecoration: "none" }}>
              ← Dashboard
            </a>
          </div>
          <h1>Activity Feed</h1>
          <div></div>
        </div>
        <div class="card">
          <p style={{ color: "var(--color-warning)", textAlign: "center" }}>
            {error}
          </p>
          <a href="/parent/dashboard" class="btn btn-primary" style={{ marginTop: "1rem" }}>
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div class="container">
      <div class="header">
        <div>
          <a href="/parent/dashboard" style={{ color: "white", textDecoration: "none" }}>
            ← Dashboard
          </a>
        </div>
        <h1>Activity Feed</h1>
        <div></div>
      </div>

      <ParentActivityTab
        family={family}
        recentActivity={recentActivity}
      />
    </div>
  );
}