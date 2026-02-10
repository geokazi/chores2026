/**
 * Weekly Grid API Endpoint
 * GET /api/grid/weekly - Returns weekly grid visualization data
 *
 * Pro tier gated feature with session-based family access
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { GridService, type WeeklyGridData } from "../../../lib/services/grid-service.ts";
import { hasPaidPlan, getTrialInfo } from "../../../lib/plan-gate.ts";
import { getServiceSupabaseClient } from "../../../lib/supabase.ts";

interface GridResponse {
  success: boolean;
  data?: WeeklyGridData;
  error?: string;
  upgrade_url?: string;
}

export const handler: Handlers = {
  async GET(req) {
    // 1. Authenticate session
    const session = await getAuthenticatedSession(req);
    if (!session.isAuthenticated || !session.family) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const familyId = session.family.id;

    // 2. Get family settings for Pro tier check
    const supabase = getServiceSupabaseClient();
    const { data: familyData } = await supabase
      .from("families")
      .select("settings")
      .eq("id", familyId)
      .single();

    const settings = familyData?.settings || {};

    // 3. Check Pro tier access (Weekly Grid is Pro-only)
    const isPaid = hasPaidPlan(settings);
    const trialInfo = getTrialInfo(settings);
    const hasAccess = isPaid || trialInfo.isActive;

    if (!hasAccess) {
      return Response.json(
        {
          success: false,
          error: "Weekly Grid requires Pro plan",
          upgrade_url: "/pricing",
        } as GridResponse,
        { status: 403 }
      );
    }

    // 4. Get timezone from query param
    const url = new URL(req.url);
    const timezone = url.searchParams.get("tz") || "America/Los_Angeles";

    // 5. Generate grid data
    try {
      const gridService = new GridService();
      const gridData = await gridService.getWeeklyGrid(familyId, timezone);

      return Response.json({
        success: true,
        data: gridData,
      } as GridResponse);
    } catch (error) {
      console.error("❌ Failed to generate weekly grid:", error);
      return Response.json(
        { success: false, error: "Failed to generate grid" },
        { status: 500 }
      );
    }
  },
};
