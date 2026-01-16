/**
 * Debug Session API
 * Returns session information for debugging
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";

export const handler: Handlers = {
  async GET(req) {
    console.log("🔧 Debug session API called");
    console.log("🔧 Request headers:", Object.fromEntries(req.headers.entries()));
    
    try {
      const session = await getAuthenticatedSession(req);
      
      console.log("🔧 Session result:", {
        isAuthenticated: session.isAuthenticated,
        hasUser: !!session.user,
        hasFamily: !!session.family,
        userId: session.user?.id,
        familyId: session.family?.id
      });
      
      return new Response(JSON.stringify({
        isAuthenticated: session.isAuthenticated,
        hasUser: !!session.user,
        hasFamily: !!session.family,
        userId: session.user?.id?.substring(0, 8) + "...",
        familyId: session.family?.id?.substring(0, 8) + "...",
        userEmail: session.user?.email,
        familyName: session.family?.name
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("❌ Session debug error:", error);
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};