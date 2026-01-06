/**
 * Complete Chore API Route
 * Handles chore completion via API calls
 */

import { Handlers } from "$fresh/server.ts";
import { ChoreService } from "../../../../lib/services/chore-service.ts";
import { TransactionService } from "../../../../lib/services/transaction-service.ts";

export const handler: Handlers = {
  async POST(req, ctx) {
    const choreId = ctx.params.chore_id;

    try {
      const body = await req.json();
      const { kid_id } = body;

      if (!kid_id) {
        return new Response(
          JSON.stringify({ error: "Missing kid_id" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const choreService = new ChoreService();
      const transactionService = new TransactionService();

      // Get the kid's profile to get family_id
      const kid = await choreService.getFamilyMember(kid_id);
      if (!kid) {
        return new Response(
          JSON.stringify({ error: "Kid not found" }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Get chore assignment
      const chore = await choreService.getChoreAssignment(
        choreId,
        kid.family_id,
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

      // Verify chore is assigned to this kid
      if (chore.assigned_to_profile_id !== kid_id) {
        return new Response(
          JSON.stringify({ error: "Chore not assigned to this kid" }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Complete the chore
      const result = await choreService.completeChore(
        choreId,
        kid_id,
        kid.family_id,
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
          kid_id,
          kid.family_id,
        );
      } catch (error) {
        console.warn("Failed to record FamilyScore transaction:", error);
        // Don't fail the chore completion if FamilyScore sync fails
      }

      return new Response(
        JSON.stringify({
          success: true,
          chore: result.assignment,
          points_earned: chore.point_value,
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
