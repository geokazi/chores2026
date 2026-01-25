/**
 * Parent Insights Page - Behavioral analytics for habit formation
 * Template-aware: measures consistency against expected days, not calendar days
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../lib/auth/session.ts";
import { InsightsService, KidTrend, StreakData, RoutineData, ThisWeekActivity } from "../../lib/services/insights-service.ts";
import HabitInsights from "../../islands/HabitInsights.tsx";
import AppFooter from "../../components/AppFooter.tsx";

interface InsightsData {
  trends: KidTrend[];
  streaks: StreakData[];
  routines: RoutineData[];
  totalActiveDays: number;
  thisWeekActivity: ThisWeekActivity[];
  familyName: string;
  error?: string;
}

export const handler: Handlers<InsightsData> = {
  async GET(req, ctx) {
    const session = await getAuthenticatedSession(req);

    if (!session.isAuthenticated || !session.family) {
      return new Response(null, { status: 303, headers: { Location: "/login" } });
    }

    const familyId = session.family.id;
    const familySettings = session.family.settings as Record<string, unknown> | null;
    const childProfiles = session.family.members
      .filter((m: any) => m.role === "child")
      .map((m: any) => ({ id: m.id, name: m.name }));

    if (childProfiles.length === 0) {
      return ctx.render({
        trends: [], streaks: [], routines: [],
        totalActiveDays: 0, thisWeekActivity: [],
        familyName: session.family.name,
        error: "No kids in family yet. Add kids in Settings first.",
      });
    }

    try {
      const insightsService = new InsightsService();

      // Reuse the service's Supabase client for timezone lookup
      const profileId = session.user?.profileId;
      const timezone = profileId
        ? await insightsService.getTimezone(profileId)
        : "UTC";

      // Single call fetches transactions once, computes all insights
      const { trends, streaks, routines, totalActiveDays, thisWeekActivity } = await insightsService.getInsights(
        familyId, familySettings, childProfiles, timezone
      );

      return ctx.render({
        trends, streaks, routines, totalActiveDays, thisWeekActivity,
        familyName: session.family.name,
      });
    } catch (error) {
      console.error("Insights error:", error);
      return ctx.render({
        trends: [], streaks: [], routines: [],
        totalActiveDays: 0, thisWeekActivity: [],
        familyName: session.family.name,
        error: "Failed to load insights. Please try again.",
      });
    }
  },
};

export default function InsightsPage({ data }: PageProps<InsightsData>) {
  const isNewUser = data.totalActiveDays < 7;
  const subtitle = isNewUser
    ? `${data.familyName} — Getting started`
    : `${data.familyName} — 12-week view`;

  return (
    <div class="insights-page">
      <div class="insights-header">
        <a href="/parent/dashboard" class="back-link">← Back</a>
        <h1>Habit Insights</h1>
        <p class="subtitle">{subtitle}</p>
      </div>

      {data.error
        ? <div class="insights-error">{data.error}</div>
        : <HabitInsights
            trends={data.trends}
            streaks={data.streaks}
            routines={data.routines}
            totalActiveDays={data.totalActiveDays}
            thisWeekActivity={data.thisWeekActivity}
          />
      }

      <AppFooter />

      <style>{`
        .insights-page {
          max-width: 600px;
          margin: 0 auto;
          padding: 1rem;
        }
        .insights-header {
          margin-bottom: 1.5rem;
        }
        .insights-header h1 {
          margin: 0.5rem 0 0.25rem;
          color: var(--color-primary, #10b981);
          font-size: 1.5rem;
        }
        .subtitle {
          margin: 0;
          color: #666;
          font-size: 0.875rem;
        }
        .back-link {
          color: var(--color-primary, #10b981);
          text-decoration: none;
          font-size: 0.875rem;
        }
        .insights-error {
          background: #fef3cd;
          color: #856404;
          padding: 1rem;
          border-radius: 8px;
          text-align: center;
        }
      `}</style>
    </div>
  );
}
