/**
 * Event Badge Check
 * GET /api/events/badge-check
 * Returns { hasUpcoming: true/false } based on events today/tomorrow.
 * Lightweight endpoint for AppHeader badge indicator.
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { getServiceSupabaseClient } from "../../../lib/supabase.ts";

export const handler: Handlers = {
  async GET(req) {
    const session = await getAuthenticatedSession(req);
    if (!session.isAuthenticated || !session.family) {
      return Response.json({ hasUpcoming: false });
    }

    const supabase = getServiceSupabaseClient();
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayStr = today.toISOString().slice(0, 10);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("family_events")
      .select("id")
      .eq("family_id", session.family.id)
      .gte("event_date", todayStr)
      .lte("event_date", tomorrowStr)
      .limit(1);

    return Response.json({
      hasUpcoming: !error && data && data.length > 0,
    });
  },
};
