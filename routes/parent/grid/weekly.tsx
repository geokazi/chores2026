/**
 * Weekly Grid Page
 * Displays printable/shareable weekly chore completion grid
 *
 * Pro tier feature with session-based family access
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { GridService, type WeeklyGridData } from "../../../lib/services/grid-service.ts";
import { hasPaidPlan, getTrialInfo, getPlanBadge, type PlanBadgeInfo } from "../../../lib/plan-gate.ts";
import AppHeader from "../../../islands/AppHeader.tsx";
import AppFooter from "../../../components/AppFooter.tsx";
import WeeklyGrid from "../../../islands/WeeklyGrid.tsx";

interface WeeklyGridPageData {
  gridData: WeeklyGridData | null;
  hasAccess: boolean;
  family: any;
  members: any[];
  currentUser: any;
  planBadge?: PlanBadgeInfo;
  error?: string;
}

export const handler: Handlers<WeeklyGridPageData> = {
  async GET(req, ctx) {
    const session = await getAuthenticatedSession(req);

    if (!session.isAuthenticated || !session.family) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/login" },
      });
    }

    const family = session.family;
    const familyId = family.id;
    const members = family.members || [];
    const settings = family.settings || {};

    // Check Pro tier access
    const isPaid = hasPaidPlan(settings);
    const trialInfo = getTrialInfo(settings);
    const hasAccess = isPaid || trialInfo.isActive;
    const planBadge = getPlanBadge(settings);

    // Find current user
    const parentProfileId = session.user?.profileId;
    const currentUser = members.find((m: any) => m.id === parentProfileId) || null;

    if (!hasAccess) {
      return ctx.render({
        gridData: null,
        hasAccess: false,
        family,
        members,
        currentUser,
        planBadge,
      });
    }

    // Get timezone from query param
    const url = new URL(req.url);
    const timezone = url.searchParams.get("tz") || "America/Los_Angeles";

    try {
      const gridService = new GridService();
      const gridData = await gridService.getWeeklyGrid(familyId, timezone);

      return ctx.render({
        gridData,
        hasAccess: true,
        family,
        members,
        currentUser,
        planBadge,
      });
    } catch (error) {
      console.error("❌ Failed to load weekly grid:", error);
      return ctx.render({
        gridData: null,
        hasAccess: true,
        family,
        members,
        currentUser,
        planBadge,
        error: "Failed to load grid data",
      });
    }
  },
};

export default function WeeklyGridPage({ data }: PageProps<WeeklyGridPageData>) {
  const { gridData, hasAccess, family, members, currentUser, planBadge, error } = data;

  // Script to detect browser timezone
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

  return (
    <div class="container">
      <script dangerouslySetInnerHTML={{ __html: timezoneScript }} />
      <link rel="stylesheet" href="/grid-print.css" />

      <AppHeader
        currentPage="grid"
        pageTitle="Weekly Grid"
        familyMembers={members}
        currentUser={currentUser}
        userRole="parent"
        planBadge={planBadge}
      />

      <div style={{ padding: "0 1rem" }}>
        {!hasAccess ? (
          <div class="card" style={{ textAlign: "center", padding: "2rem" }}>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
              Weekly Grid
            </h2>
            <p style={{ color: "var(--color-text-light)", marginBottom: "1.5rem" }}>
              Weekly Grid is a Pro feature that provides a printable/shareable
              view of your family's weekly chore progress.
            </p>
            <a
              href="/pricing"
              class="btn btn-primary"
              style={{ textDecoration: "none" }}
            >
              Upgrade to Pro
            </a>
          </div>
        ) : error ? (
          <div class="card" style={{ textAlign: "center", padding: "2rem" }}>
            <p style={{ color: "var(--color-warning)" }}>{error}</p>
            <a
              href="/parent/dashboard"
              class="btn btn-secondary"
              style={{ marginTop: "1rem", textDecoration: "none" }}
            >
              Back to Dashboard
            </a>
          </div>
        ) : gridData ? (
          <WeeklyGrid
            gridData={gridData}
            familyName={family.name}
          />
        ) : (
          <div class="card" style={{ textAlign: "center", padding: "2rem" }}>
            <p>No data available</p>
          </div>
        )}
      </div>

      <AppFooter />
    </div>
  );
}
