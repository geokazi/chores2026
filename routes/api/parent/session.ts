/**
 * Parent Session API
 * Returns current parent session information for PIN verification
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";

export const handler: Handlers = {
  async GET(req, ctx) {
    try {
      const session = await getAuthenticatedSession(req);
      
      if (!session.isAuthenticated || !session.family) {
        return new Response(JSON.stringify({ error: "Not authenticated" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Return parent profile information
      return new Response(JSON.stringify({
        profile_id: session.profile?.id,
        family_id: session.family.id,
        role: session.profile?.role || 'parent'
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("❌ Error getting parent session:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};