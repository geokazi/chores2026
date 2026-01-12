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

      // We need to get the actual family profile ID (not user ID)
      // Get the current user's family profile
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      const { data: profileData, error: profileError } = await supabase
        .from("family_profiles")
        .select("id, name, role")
        .eq("user_id", session.user?.id)
        .eq("family_id", session.family.id)
        .single();

      console.log("🔧 Parent session profile query:", {
        userId: session.user?.id,
        familyId: session.family.id,
        profileData,
        profileError
      });

      if (!profileData) {
        return new Response(JSON.stringify({ error: "Profile not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Return parent profile information
      return new Response(JSON.stringify({
        profile_id: profileData.id,
        family_id: session.family.id,
        role: profileData.role,
        name: profileData.name
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