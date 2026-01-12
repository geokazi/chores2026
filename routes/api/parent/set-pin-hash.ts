/**
 * Parent PIN Hash Storage API
 * Stores pre-hashed PIN for parents (client-side hashing like kid PINs)
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

      const { pin_hash, parent_id } = await req.json();
      
      if (!pin_hash || !pin_hash.startsWith('$2')) {
        return new Response(JSON.stringify({ error: "Valid bcrypt hash required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!parent_id) {
        return new Response(JSON.stringify({ error: "Parent ID required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

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

      // Store the pre-hashed PIN directly (no server-side hashing)
      const success = await choreService.setKidPinHash(parent_id, pin_hash);
      if (!success) {
        return new Response(JSON.stringify({ error: "Failed to set PIN" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.log(`✅ PIN hash stored for parent: ${parent.name}`);

      return new Response(JSON.stringify({ 
        success: true,
        message: "Parent PIN set successfully"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("❌ Error setting parent PIN hash:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};