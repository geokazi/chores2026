/**
 * Calendar ICS Export
 * GET /api/events/:id/calendar → downloads .ics file
 * Authenticated via session cookie
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../../lib/auth/session.ts";
import { getServiceSupabaseClient } from "../../../../lib/supabase.ts";
import { incrementUsage } from "../../../../lib/services/usage-tracker.ts";
import { generateICS } from "../../../../lib/utils/ics-generator.ts";

export const handler: Handlers = {
  async GET(req, ctx) {
    const session = await getAuthenticatedSession(req);
    if (!session.isAuthenticated || !session.family) {
      return new Response("Unauthorized", { status: 401 });
    }

    const eventId = ctx.params.id;
    const supabase = getServiceSupabaseClient();

    const { data: event, error } = await supabase
      .from("family_events")
      .select("*")
      .eq("id", eventId)
      .eq("family_id", session.family.id)
      .single();

    if (error || !event) {
      return new Response("Event not found", { status: 404 });
    }

    const ics = generateICS(event);

    // Track usage (non-blocking)
    const profileId = session.user?.profileId;
    if (profileId) {
      incrementUsage(profileId, "ics").catch((err) =>
        console.warn("Usage tracking failed:", err)
      );
    }

    const filename = `${event.title.replace(/[^a-zA-Z0-9 ]/g, "").trim()}.ics`;

    return new Response(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  },
};

