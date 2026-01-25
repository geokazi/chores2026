/**
 * Claim Reward API Endpoint
 * POST: Kid claims a reward from the catalog
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { RewardsService } from "../../../lib/services/rewards-service.ts";

export const handler: Handlers = {
  async POST(req) {
    try {
      const session = await getAuthenticatedSession(req);

      if (!session.isAuthenticated || !session.family) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const { rewardId, profileId } = body;

      if (!rewardId) {
        return new Response(
          JSON.stringify({ error: "rewardId is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      // Use provided profileId or current user's profile
      const claimingProfileId = profileId || session.user?.profileId;
      if (!claimingProfileId) {
        return new Response(
          JSON.stringify({ error: "Profile not found" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      // Verify the profile belongs to this family
      const targetProfile = session.family.members.find(
        (m: any) => m.id === claimingProfileId,
      );
      if (!targetProfile) {
        return new Response(
          JSON.stringify({ error: "Profile not found in family" }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        );
      }

      const rewardsService = new RewardsService();
      const result = await rewardsService.claimReward({
        rewardId,
        profileId: claimingProfileId,
        familyId: session.family.id,
      });

      if (!result.success) {
        return new Response(JSON.stringify({ error: result.error }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          purchase: result.purchase,
          newBalance: result.newBalance,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    } catch (error) {
      console.error("❌ Claim reward error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  },
};
