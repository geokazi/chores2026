/**
 * Points-Only Mode API
 * Toggle display of dollar values throughout the app
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export const handler: Handlers = {
  async POST(req) {
    // Verify parent session
    const session = await getAuthenticatedSession(req);

    if (!session.isAuthenticated || !session.family) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body = await req.json();
      const { enabled } = body;

      // Validate input
      if (typeof enabled !== "boolean") {
        return new Response(JSON.stringify({ error: "enabled must be a boolean" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const client = createClient(supabaseUrl, supabaseServiceKey);

      // Get current settings
      const { data: family, error: fetchError } = await client
        .from("families")
        .select("settings")
        .eq("id", session.family.id)
        .single();

      if (fetchError) {
        console.error("Error fetching family settings:", fetchError);
        return new Response(JSON.stringify({ error: "Failed to fetch settings" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Merge into existing JSONB structure
      const currentSettings = family?.settings || {};
      const updatedSettings = {
        ...currentSettings,
        apps: {
          ...currentSettings.apps,
          choregami: {
            ...currentSettings.apps?.choregami,
            points_only_mode: enabled,
          },
        },
      };

      // Update family settings
      const { error: updateError } = await client
        .from("families")
        .update({ settings: updatedSettings })
        .eq("id", session.family.id);

      if (updateError) {
        console.error("Error updating family settings:", updateError);
        return new Response(JSON.stringify({ error: "Failed to update settings" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.log("✅ Points-only mode updated:", {
        family: session.family.name,
        points_only_mode: enabled,
      });

      return new Response(JSON.stringify({
        success: true,
        points_only_mode: enabled,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error updating points-only mode:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
