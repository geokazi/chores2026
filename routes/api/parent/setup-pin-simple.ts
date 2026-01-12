/**
 * Simple Parent PIN Setup API
 * Stores PINs as plaintext for instant verification (family chore app security model)
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { ChoreService } from "../../../lib/services/chore-service.ts";

export const handler: Handlers = {
  async POST(req, ctx) {
    try {
      const session = await getAuthenticatedSession(req);
      
      if (!session.isAuthenticated || !session.family) {
        return new Response(JSON.stringify({ error: "Not authenticated" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const { pin, parent_id } = await req.json();
      
      if (!pin || !parent_id) {
        return new Response(JSON.stringify({ error: "PIN and parent ID required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!/^\d{4}$/.test(pin)) {
        return new Response(JSON.stringify({ error: "PIN must be exactly 4 digits" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.log(`🔧 Setting up plaintext PIN for parent: ${parent_id}`);

      const choreService = new ChoreService();
      const parent = await choreService.getFamilyMember(parent_id);
      
      if (!parent || parent.role !== 'parent') {
        return new Response(JSON.stringify({ error: "Parent not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Verify parent belongs to authenticated family
      if (parent.family_id !== session.family.id) {
        return new Response(JSON.stringify({ error: "Access denied" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Store PIN as plaintext using the direct hash storage method
      const success = await choreService.setKidPinHash(parent_id, pin);
      if (!success) {
        return new Response(JSON.stringify({ error: "Failed to set PIN" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.log(`✅ Plaintext PIN stored for parent: ${parent.name}`);

      return new Response(JSON.stringify({ 
        success: true,
        message: "Parent PIN set successfully"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    } catch (error) {
      console.error("❌ Error setting parent PIN:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};