/**
 * Kid PIN Management API
 * Set and update 4-digit PINs for kids
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../../lib/auth/session.ts";
import { ChoreService } from "../../../../lib/services/chore-service.ts";

export const handler: Handlers = {
  async POST(req, ctx) {
    // Verify parent session
    const session = await getAuthenticatedSession(req);
    if (!session.isAuthenticated || !session.family) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const kidId = ctx.params.kid_id;
    if (!kidId) {
      return new Response(JSON.stringify({ error: "Kid ID required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const { pin_hash } = await req.json();
      if (!pin_hash) {
        return new Response(JSON.stringify({ error: "PIN hash required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const choreService = new ChoreService();
      
      // Verify kid belongs to this family
      const kid = await choreService.getFamilyMember(kidId);
      if (!kid || kid.family_id !== session.family.id) {
        return new Response(JSON.stringify({ error: "Kid not found in family" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Set the PIN
      const success = await choreService.setKidPin(kidId, pin_hash);
      if (!success) {
        return new Response(JSON.stringify({ error: "Failed to set PIN" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.log("✅ PIN set for kid:", kid.name);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("❌ Error setting kid PIN:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};