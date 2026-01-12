/**
 * Parent PIN Verification API
 * Verifies parent PIN and elevates session permissions
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
      if (!pin || pin.length !== 4) {
        return new Response(JSON.stringify({ error: "Valid 4-digit PIN required" }), {
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

      // Verify PIN against stored hash
      if (!parent.pin_hash) {
        return new Response(JSON.stringify({ error: "No PIN set for parent" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const isValidPin = await bcrypt.compare(pin, parent.pin_hash);
      if (!isValidPin) {
        console.log(`❌ Invalid PIN attempt for parent: ${parent.name}`);
        return new Response(JSON.stringify({ error: "Invalid PIN" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.log(`✅ PIN verified for parent: ${parent.name}`);
      
      return new Response(JSON.stringify({ 
        success: true,
        message: "PIN verified successfully"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("❌ Error verifying parent PIN:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};