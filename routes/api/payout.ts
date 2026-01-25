/**
 * Pay Out API Endpoint
 * POST: Process a payout for a kid (requires parent PIN)
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../lib/auth/session.ts";
import { BalanceService } from "../../lib/services/balance-service.ts";

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
      const { profileId, amount, parentPin } = body;

      if (!profileId || !amount || amount <= 0) {
        return new Response(
          JSON.stringify({ error: "Invalid request: profileId and positive amount required" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      // Verify the profile belongs to this family
      const targetProfile = session.family.members.find((m: any) => m.id === profileId);
      if (!targetProfile) {
        return new Response(
          JSON.stringify({ error: "Profile not found in family" }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        );
      }

      const balanceService = new BalanceService();
      const result = await balanceService.processPayout(
        { profileId, amount, parentPin },
        session.user!.profileId!,
        session.family.id,
      );

      if (!result.success) {
        return new Response(JSON.stringify({ error: result.error }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          transactionId: result.transactionId,
          newBalance: result.newBalance,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    } catch (error) {
      console.error("❌ Payout error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  },
};
