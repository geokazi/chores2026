/**
 * Parent PIN Setup API
 * Allows parents to set their 4-digit PIN for secure operations
 */

import { Handlers } from "$fresh/server.ts";
// @ts-ignore: bcrypt types not compatible with Deno 2
import * as bcrypt from "bcryptjs";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { ChoreService } from "../../../lib/services/chore-service.ts";

export const handler: Handlers = {
  async POST(req, ctx) {
    try {
      const session = await getAuthenticatedSession(req);
      
      if (!session.isAuthenticated || !session.family || !session.profile) {
        return new Response(JSON.stringify({ error: "Not authenticated" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const { pin } = await req.json();
      if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        return new Response(JSON.stringify({ error: "Valid 4-digit numeric PIN required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const choreService = new ChoreService();
      const parent = await choreService.getFamilyMember(session.profile.id);
      
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

      // Hash the PIN
      const pinHash = await bcrypt.hash(pin, 12);

      // Save to database using existing setKidPin method (works for parents too)
      const success = await choreService.setKidPin(session.profile.id, pinHash);
      if (!success) {
        return new Response(JSON.stringify({ error: "Failed to set PIN" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.log(`✅ PIN set for parent: ${parent.name}`);

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