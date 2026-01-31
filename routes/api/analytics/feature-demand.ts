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

const ALLOWED_FEATURES = [
  // SMS invites (pending A2P 10DLC)
  "sms_invite",
  // Referral tracking
  "referral_card_view",
  "referral_copy",
  "referral_share",
  "referral_share_complete",
  // Redeem/upgrade tracking
  "redeem_click",
  "redeem_attempt",
  "redeem_success",
  "redeem_failure",
];

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
