/**
 * Analytics Event Endpoint
 * POST /api/analytics/event
 * Lightweight endpoint for client-side event tracking (badge taps, etc.)
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { incrementUsage } from "../../../lib/services/usage-tracker.ts";

export const handler: Handlers = {
  async POST(req) {
    const session = await getAuthenticatedSession(req);
    if (!session.isAuthenticated) {
      return new Response("Unauthorized", { status: 401 });
    }

    const profileId = session.user?.profileId;
    if (!profileId) {
      return new Response("No profile", { status: 400 });
    }

    try {
      const body = await req.json();
      const { metric } = body;

      if (!metric || typeof metric !== "string") {
        return new Response("Invalid metric", { status: 400 });
      }

      // Only allow known metrics
      const allowedMetrics = ["badges", "ics", "digests", "prep_shop", "prep_export"];
      if (!allowedMetrics.includes(metric)) {
        return new Response("Unknown metric", { status: 400 });
      }

      await incrementUsage(profileId, metric);
      return Response.json({ ok: true });
    } catch (error) {
      console.error("[analytics/event] Error:", error);
      return Response.json({ error: "Failed" }, { status: 500 });
    }
  },
};
