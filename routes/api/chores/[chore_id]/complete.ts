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

      // Verify kid belongs to parent's family
      if (kid.family_id !== parentSession.family.id) {
        return new Response(
          JSON.stringify({ error: "Access denied - kid not in your family" }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Check if family requires PIN validation
      const family = await choreService.getFamily(kid.family_id);
      if (family?.children_pins_enabled) {
        // Note: Kid session validation is handled client-side
        // Server trusts that proper PIN validation happened before the API call
        console.log(`🔐 Chore completion for ${kid.name} (PIN-protected family)`);
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
