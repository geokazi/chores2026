/**
 * Rewards Catalog API Endpoint
 * GET: List available rewards
 * POST: Add/update a reward (parent only)
 * DELETE: Remove a reward (parent only)
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { RewardsService } from "../../../lib/services/rewards-service.ts";

export const handler: Handlers = {
  async GET(req) {
    try {
      const session = await getAuthenticatedSession(req);

      if (!session.isAuthenticated || !session.family) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const rewardsService = new RewardsService();
      const rewards = await rewardsService.getAvailableRewards(session.family.id);

      return new Response(JSON.stringify({ rewards }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("❌ Get rewards error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  },

  async POST(req) {
    try {
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

      const body = await req.json();
      const { id, name, description, icon, pointCost, category, isActive, maxPerWeek, maxPerMonth } = body;

      if (!name || !pointCost || pointCost <= 0) {
        return new Response(
          JSON.stringify({ error: "name and positive pointCost are required" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      const rewardsService = new RewardsService();
      const reward = await rewardsService.upsertReward(session.family.id, {
        id: id || crypto.randomUUID(),
        name,
        description,
        icon: icon || "🎁",
        pointCost,
        category: category || "other",
        isActive: isActive !== false,
        maxPerWeek,
        maxPerMonth,
      });

      return new Response(JSON.stringify({ success: true, reward }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("❌ Save reward error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  },

  async DELETE(req) {
    try {
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

      const url = new URL(req.url);
      const rewardId = url.searchParams.get("id");

      if (!rewardId) {
        return new Response(
          JSON.stringify({ error: "Reward id is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      const rewardsService = new RewardsService();
      await rewardsService.deleteReward(session.family.id, rewardId);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("❌ Delete reward error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  },
};
