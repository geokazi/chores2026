/**
 * Family Reports Page
 * Session-based access (NO family_id in URL) - available to everyone in the family
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../lib/auth/session.ts";
import { ChoreService } from "../lib/services/chore-service.ts";
import FamilyReports from "../islands/FamilyReports.tsx";
import AppFooter from "../components/AppFooter.tsx";

interface ReportsData {
  family: any;
  analytics: {
    members: Array<{
      id: string;
      name: string;
      role: string;
      savings: number;
      savings_dollars: number;
      earned_week: number;
      earned_month: number;
      earned_ytd: number;
      earned_all_time: number;
    }>;
    totals: {
      earned_week: number;
      earned_month: number;
      earned_ytd: number;
      earned_all_time: number;
    };
  };
  goalsAchieved: Array<{
    name: string;
    reward_name: string;
    reward_icon: string;
    points_used: number;
    achieved_at: string;
  }>;
  error?: string;
}

export const handler: Handlers<ReportsData> = {
  async GET(req, ctx) {
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

      const pointsPerDollar = session.family.points_per_dollar;

      const [analytics, goalsAchieved] = await Promise.all([
        choreService.getFamilyAnalytics(familyId, pointsPerDollar),
        choreService.getGoalsAchieved(familyId, 5),
      ]);

      console.log("✅ Family reports loaded for:", session.family.name);

      return ctx.render({
        family: session.family,
        analytics,
        goalsAchieved,
      });
    } catch (error) {
      console.error("❌ Error loading family reports:", error);
      return ctx.render({
        family: session.family,
        analytics: { members: [], totals: { earned_week: 0, earned_month: 0, earned_ytd: 0, earned_all_time: 0 } },
        goalsAchieved: [],
        error: "Failed to load reports",
      });
    }
  },
};

export default function ReportsPage({ data }: PageProps<ReportsData>) {
  const { family, analytics, goalsAchieved, error } = data;

  return (
    <div class="container">
      <div class="header">
        <div>
          <a href="/" style={{ color: "white", textDecoration: "none" }}>
            ← Back
          </a>
        </div>
        <h1>Family Progress</h1>
        <div></div>
      </div>

      {error ? (
        <div class="card">
          <p style={{ color: "var(--color-warning)", textAlign: "center" }}>
            {error}
          </p>
          <a href="/" class="btn btn-primary" style={{ marginTop: "1rem" }}>
            Back to Home
          </a>
        </div>
      ) : (
        <FamilyReports
          analytics={analytics}
          goalsAchieved={goalsAchieved}
          pointsPerDollar={family.points_per_dollar}
        />
      )}
      <AppFooter />
    </div>
  );
}
