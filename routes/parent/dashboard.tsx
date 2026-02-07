/**
 * SECURE Parent Dashboard Page
 * Uses session-based family access (NO family_id in URL)
 *
 * OPTIMIZATION: Uses cached session data for family + members
 * Only queries DB for chores and activity (dynamic data)
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../lib/auth/session.ts";
import { ChoreService } from "../../lib/services/chore-service.ts";
import { getActivityService } from "../../lib/services/activity-service.ts";
import { InsightsService, ThisWeekActivity, StreakData } from "../../lib/services/insights-service.ts";
import { getTrialInfo, isTrialPlan, getPlanBadge, type PlanBadgeInfo } from "../../lib/plan-gate.ts";
import ParentDashboard from "../../islands/ParentDashboard.tsx";
import AppHeader from "../../islands/AppHeader.tsx";
import AppFooter from "../../components/AppFooter.tsx";
import TrialBanner from "../../islands/TrialBanner.tsx";

interface ParentDashboardData {
  family: any;
  members: any[];
  chores: any[];
  parentChores: any[];
  parentProfileId?: string;
  recentActivity: any[];
  thisWeekActivity: ThisWeekActivity[];
  streaks: StreakData[];
  trialInfo: {
    isActive: boolean;
    daysRemaining: number;
    isEnding: boolean;
    isExpired: boolean;
    choresCompleted?: number;
  };
  planBadge?: PlanBadgeInfo;
  error?: string;
}

export const handler: Handlers<ParentDashboardData> = {
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
      const insightsService = new InsightsService();

      // Get timezone from URL query param (sent by browser) or default
      const url = new URL(req.url);
      const timezone = url.searchParams.get("tz") || "America/Los_Angeles";

      // OPTIMIZATION: Use cached family + members from session
      const family = session.family;
      const members = family.members;
      const familySettings = family.settings as Record<string, unknown> | null;

      // Parent profile ID is now cached in session
      const parentProfileId = session.user?.profileId;

      // 🚀 AUTO-REGISTRATION: FamilyScore now auto-registers families when first chore is completed
      // No explicit registration needed - happens automatically via TransactionService

      // Get all chores (active and completed)
      const chores = await choreService.getAllChores(familyId);

      // Get parent's own chores if we found their profile
      let parentChores: any[] = [];
      if (parentProfileId) {
        parentChores = await choreService.getTodaysChores(parentProfileId, familyId);
      }

      // Get recent activity from new ActivityService (includes all types)
      const activityService = getActivityService();
      const recentActivity = await activityService.getRecentActivity(familyId, 10);

      // Get weekly progress data for This Week view
      const childProfiles = members
        .filter((m: any) => m.role === "child")
        .map((m: any) => ({ id: m.id, name: m.name }));

      // Fetch insights data (thisWeekActivity + streaks)
      let thisWeekActivity: ThisWeekActivity[] = [];
      let streaks: StreakData[] = [];

      if (childProfiles.length > 0) {
        const insights = await insightsService.getInsights(
          familyId, familySettings, childProfiles, timezone
        );
        thisWeekActivity = insights.thisWeekActivity;
        streaks = insights.streaks;
      }

      // Get trial info and plan badge
      const trialInfo = getTrialInfo(family.settings);
      const planBadge = getPlanBadge(family.settings);
      const choresCompletedDuringTrial = isTrialPlan(family.settings)
        ? chores.filter((c: any) => c.status === "completed").length
        : 0;

      console.log("✅ Parent dashboard loaded for family:", family.name);

      return ctx.render({
        family,
        members,
        chores,
        parentChores,
        parentProfileId,
        recentActivity,
        thisWeekActivity,
        streaks,
        trialInfo: {
          ...trialInfo,
          choresCompleted: choresCompletedDuringTrial,
        },
        planBadge,
      });
    } catch (error) {
      console.error("❌ Error loading parent dashboard:", error);
      return ctx.render({
        family: session.family,
        members: [],
        chores: [],
        parentChores: [],
        parentProfileId: undefined,
        recentActivity: [],
        thisWeekActivity: [],
        streaks: [],
        trialInfo: { isActive: false, daysRemaining: 0, isEnding: false, isExpired: false },
        error: "Failed to load dashboard",
      });
    }
  },
};

export default function ParentDashboardPage(
  { data }: PageProps<ParentDashboardData>,
) {
  const { family, members, chores, parentChores, parentProfileId, recentActivity, thisWeekActivity, streaks, trialInfo, planBadge, error } = data;

  // Script to detect browser timezone and reload with it if needed
  const timezoneScript = `
    (function() {
      const url = new URL(window.location.href);
      if (!url.searchParams.has('tz')) {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        url.searchParams.set('tz', tz);
        window.location.replace(url.toString());
      }
    })();
  `;

  if (error) {
    return (
      <div class="container">
        <script dangerouslySetInnerHTML={{ __html: timezoneScript }} />
        <div class="header">
          <div>
            <a href="/" style={{ color: "white", textDecoration: "none" }}>
              ← Back
            </a>
          </div>
          <h1>ChoreGami</h1>
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

  // Find current parent from members
  const currentUser = members.find(m => m.id === parentProfileId) || null;

  return (
    <div class="container">
      {/* Auto-detect and pass browser timezone */}
      <script dangerouslySetInnerHTML={{ __html: timezoneScript }} />
      <AppHeader
        currentPage="dashboard"
        pageTitle="Family Dashboard"
        familyMembers={members}
        currentUser={currentUser}
        userRole="parent"
        planBadge={planBadge}
      />

      {/* Trial Banner - shows when trial is ending or expired */}
      {(trialInfo.isEnding || trialInfo.isExpired) && (
        <div style={{ padding: "0 1rem" }}>
          <TrialBanner
            daysRemaining={trialInfo.daysRemaining}
            isEnding={trialInfo.isEnding}
            isExpired={trialInfo.isExpired}
            familyStats={trialInfo.choresCompleted ? { choresCompleted: trialInfo.choresCompleted } : undefined}
          />
        </div>
      )}

      <ParentDashboard
        family={family}
        members={members}
        chores={chores}
        parentChores={parentChores}
        parentProfileId={parentProfileId}
        recentActivity={recentActivity}
        thisWeekActivity={thisWeekActivity}
        streaks={streaks}
      />
      <AppFooter />
    </div>
  );
}