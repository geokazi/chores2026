/**
 * Point Adjustment API Route
 * Handles parent point adjustments with FamilyScore sync
 */

import { Handlers } from "$fresh/server.ts";
import { TransactionService } from "../../../lib/services/transaction-service.ts";
import { ChoreService } from "../../../lib/services/chore-service.ts";

export const handler: Handlers = {
  async POST(req) {
    try {
      const body = await req.json();
      const { member_id, family_id, amount, reason } = body;

      if (!member_id || !family_id || !amount || !reason) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const choreService = new ChoreService();
      const transactionService = new TransactionService();

      // Get the family member
      const member = await choreService.getFamilyMember(member_id);
      if (!member || member.family_id !== family_id) {
        return new Response(
          JSON.stringify({ error: "Family member not found" }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Record the point adjustment transaction
      // Note: recordPointAdjustment already updates the member's balance internally
      const adjustmentId = `adjustment_${Date.now()}_${member_id}`;
      await transactionService.recordPointAdjustment(
        adjustmentId,
        amount,
        reason,
        member_id,
        family_id,
      );

      // Get updated member balance
      const updatedMember = await choreService.getFamilyMember(member_id);

      return new Response(
        JSON.stringify({
          success: true,
          new_balance: updatedMember?.current_points ?? (member.current_points + amount),
          adjustment: {
            amount,
            reason,
            member_name: member.name,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("❌ Error adjusting points:", error);
      console.error("❌ Error stack:", error instanceof Error ? error.stack : "No stack");
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          details: error instanceof Error ? error.message : String(error)
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
};
