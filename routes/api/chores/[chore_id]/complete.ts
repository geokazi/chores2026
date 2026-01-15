/**
 * Complete Chore API Route
 * Handles chore completion via API calls
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../../lib/auth/session.ts";
import { ChoreService } from "../../../../lib/services/chore-service.ts";
import { TransactionService } from "../../../../lib/services/transaction-service.ts";

export const handler: Handlers = {
  async POST(req, ctx) {
    const choreId = ctx.params.chore_id;

    // Verify parent session
    const parentSession = await getAuthenticatedSession(req);
    if (!parentSession.isAuthenticated || !parentSession.family) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body = await req.json();
      const { kid_id, profile_id } = body;

      // Accept either kid_id (for kid chore completion) or profile_id (for parent chore completion)
      const userId = kid_id || profile_id;
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Missing kid_id or profile_id" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const choreService = new ChoreService();
      const transactionService = new TransactionService();

      // Get the user's profile to get family_id (could be kid or parent)
      const user = await choreService.getFamilyMember(userId);
      if (!user) {
        return new Response(
          JSON.stringify({ error: "User not found" }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Verify user belongs to parent's family
      if (user.family_id !== parentSession.family.id) {
        return new Response(
          JSON.stringify({ error: "Access denied - user not in your family" }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Check if family requires PIN validation
      const family = await choreService.getFamily(user.family_id);
      if (family?.children_pins_enabled && user.role === 'child') {
        // Note: Kid session validation is handled client-side
        // Server trusts that proper PIN validation happened before the API call
        console.log(`🔐 Chore completion for ${user.name} (PIN-protected family)`);
      }

      // Get chore assignment
      const chore = await choreService.getChoreAssignment(
        choreId,
        user.family_id,
      );
      if (!chore) {
        return new Response(
          JSON.stringify({ error: "Chore not found" }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Verify chore is assigned to this user (kid or parent)
      if (chore.assigned_to_profile_id !== userId) {
        return new Response(
          JSON.stringify({ error: "Chore not assigned to this user" }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Complete the chore
      const result = await choreService.completeChore(
        choreId,
        userId,
        user.family_id,
      );

      if (!result.success) {
        return new Response(
          JSON.stringify({ error: result.error }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Record transaction for FamilyScore integration
      try {
        await transactionService.recordChoreCompletion(
          choreId,
          chore.point_value,
          chore.chore_template?.name || "Chore",
          userId,
          user.family_id,
        );
      } catch (error) {
        console.warn("Failed to record FamilyScore transaction:", error);
        // Don't fail the chore completion if FamilyScore sync fails
      }

      // Check if family goal was reached (non-blocking)
      let goalResult = null;
      try {
        goalResult = await choreService.checkFamilyGoal(user.family_id);
      } catch (error) {
        console.warn("Failed to check family goal:", error);
      }

      return new Response(
        JSON.stringify({
          success: true,
          chore: result.assignment,
          points_earned: chore.point_value,
          goal_achieved: goalResult?.achieved || false,
          goal_bonus: goalResult?.bonus,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error completing chore:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
};
