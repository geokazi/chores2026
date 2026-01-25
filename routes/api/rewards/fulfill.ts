/**
 * Fulfill a reward purchase (parent marks as delivered)
 * POST { purchaseId, fulfilledByProfileId }
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { RewardsService } from "../../../lib/services/rewards-service.ts";

export const handler: Handlers = {
  async POST(req) {
    const session = await getAuthenticatedSession(req);

    if (!session.isAuthenticated || !session.family) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify parent role
    const currentProfile = session.family.members.find(
      (m: any) => m.id === session.user?.profileId,
    );
    if (!currentProfile || currentProfile.role !== "parent") {
      return new Response(JSON.stringify({ error: "Parent access required" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const { purchaseId, fulfilledByProfileId } = await req.json();

      if (!purchaseId) {
        return new Response(JSON.stringify({ error: "purchaseId required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const rewardsService = new RewardsService();
      const success = await rewardsService.fulfillPurchase(
        purchaseId,
        fulfilledByProfileId || session.user?.profileId,
      );

      if (!success) {
        return new Response(JSON.stringify({ error: "Failed to fulfill" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Fulfill error:", error);
      return new Response(JSON.stringify({ error: "Server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
