/**
 * Savings Goals API Endpoint
 * GET: List goals for current profile
 * POST: Create a new goal
 * PUT: Add to goal / boost goal
 * DELETE: Remove a goal
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { GoalsService } from "../../../lib/services/goals-service.ts";

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

      const url = new URL(req.url);
      const profileId = url.searchParams.get("profileId") || session.user?.profileId;

      if (!profileId) {
        return new Response(
          JSON.stringify({ error: "Profile not found" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      // Verify profile belongs to family
      const targetProfile = session.family.members.find((m: any) => m.id === profileId);
      if (!targetProfile) {
        return new Response(
          JSON.stringify({ error: "Profile not found in family" }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        );
      }

      const goalsService = new GoalsService();
      const goals = await goalsService.getGoals(profileId);

      return new Response(JSON.stringify({ goals }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("❌ Get goals error:", error);
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

      const body = await req.json();
      const { profileId, name, description, targetAmount, icon, category, targetDate } = body;

      const targetProfileId = profileId || session.user?.profileId;
      if (!targetProfileId) {
        return new Response(
          JSON.stringify({ error: "Profile not found" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      // Verify profile belongs to family
      const targetProfile = session.family.members.find((m: any) => m.id === targetProfileId);
      if (!targetProfile) {
        return new Response(
          JSON.stringify({ error: "Profile not found in family" }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        );
      }

      if (!name || !targetAmount || targetAmount <= 0) {
        return new Response(
          JSON.stringify({ error: "name and positive targetAmount are required" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      const goalsService = new GoalsService();
      const result = await goalsService.createGoal(targetProfileId, {
        name,
        description,
        targetAmount,
        icon,
        category,
        targetDate,
      });

      if (!result.success) {
        return new Response(JSON.stringify({ error: result.error }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, goal: result.goal }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("❌ Create goal error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  },

  async PUT(req) {
    try {
      const session = await getAuthenticatedSession(req);

      if (!session.isAuthenticated || !session.family) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const { profileId, goalId, amount, isBoost } = body;

      if (!goalId || !amount || amount <= 0) {
        return new Response(
          JSON.stringify({ error: "goalId and positive amount are required" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      const targetProfileId = profileId || session.user?.profileId;
      if (!targetProfileId) {
        return new Response(
          JSON.stringify({ error: "Profile not found" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      // Verify profile belongs to family
      const targetProfile = session.family.members.find((m: any) => m.id === targetProfileId);
      if (!targetProfile) {
        return new Response(
          JSON.stringify({ error: "Profile not found in family" }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        );
      }

      const goalsService = new GoalsService();
      let result;

      if (isBoost) {
        // Parent boost - verify parent role
        const currentProfile = session.family.members.find(
          (m: any) => m.id === session.user?.profileId,
        );
        if (!currentProfile || currentProfile.role !== "parent") {
          return new Response(JSON.stringify({ error: "Parent access required for boost" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }

        result = await goalsService.boostGoal({
          goalId,
          profileId: targetProfileId,
          amount,
          boosterId: session.user!.profileId!,
        });
      } else {
        // Kid adding from own balance
        result = await goalsService.addToGoal(targetProfileId, goalId, amount, true);
      }

      if (!result.success) {
        return new Response(JSON.stringify({ error: result.error }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, goal: result.goal }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("❌ Update goal error:", error);
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

      const url = new URL(req.url);
      const goalId = url.searchParams.get("goalId");
      const profileId = url.searchParams.get("profileId") || session.user?.profileId;

      if (!goalId || !profileId) {
        return new Response(
          JSON.stringify({ error: "goalId and profileId are required" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      // Verify profile belongs to family
      const targetProfile = session.family.members.find((m: any) => m.id === profileId);
      if (!targetProfile) {
        return new Response(
          JSON.stringify({ error: "Profile not found in family" }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        );
      }

      // Authorization: only goal owner or parent can delete
      const currentProfile = session.family.members.find(
        (m: any) => m.id === session.user?.profileId,
      );
      const isOwner = session.user?.profileId === profileId;
      const isParent = currentProfile?.role === "parent";

      if (!isOwner && !isParent) {
        return new Response(
          JSON.stringify({ error: "Only goal owner or parent can delete goals" }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        );
      }

      const goalsService = new GoalsService();
      const deleted = await goalsService.deleteGoal(profileId, goalId);

      return new Response(JSON.stringify({ success: deleted }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("❌ Delete goal error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  },
};
