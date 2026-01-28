/**
 * Feature Demand Tracking
 * POST /api/analytics/feature-demand
 *
 * Tracks user attempts to use features that are temporarily unavailable.
 * Reuses existing ActivityService for consistency.
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { getActivityService } from "../../../lib/services/activity-service.ts";

const ALLOWED_FEATURES = ["sms_invite"];

export const handler: Handlers = {
  async POST(req) {
    const session = await getAuthenticatedSession(req);
    if (!session.isAuthenticated || !session.family) {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      const { feature } = await req.json();

      if (!feature || !ALLOWED_FEATURES.includes(feature)) {
        return new Response("Invalid feature", { status: 400 });
      }

      // Reuse ActivityService - logs to family_activity with JSONB data
      await getActivityService().logActivity({
        familyId: session.family.id,
        actorId: session.user?.profileId || "unknown",
        actorName: session.user?.profileName || "Unknown",
        type: "point_adjustment", // Reuse existing type, distinguish via meta
        title: `Requested: ${feature}`,
        icon: "📊",
        meta: { demand_feature: feature },
      });

      return Response.json({ ok: true });
    } catch {
      return Response.json({ error: "Failed" }, { status: 500 });
    }
  },
};
