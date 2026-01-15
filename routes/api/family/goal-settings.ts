/**
 * Family Goal Settings API
 * Update weekly goal and bonus amount in JSONB settings
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
      const { weekly_goal, goal_bonus } = body;

      // Validate inputs
      if (weekly_goal !== null && (typeof weekly_goal !== "number" || weekly_goal < 1 || weekly_goal > 1000)) {
        return new Response(JSON.stringify({ error: "weekly_goal must be between 1-1000 or null" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (typeof goal_bonus !== "number" || goal_bonus < 0 || goal_bonus > 100) {
        return new Response(JSON.stringify({ error: "goal_bonus must be between 0-100" }), {
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

      // Merge new goal settings into existing JSONB structure
      const currentSettings = family?.settings || {};
      const updatedSettings = {
        ...currentSettings,
        apps: {
          ...currentSettings.apps,
          choregami: {
            ...currentSettings.apps?.choregami,
            weekly_goal,
            goal_bonus,
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

      console.log("✅ Goal settings updated:", {
        family: session.family.name,
        weekly_goal,
        goal_bonus,
      });

      return new Response(JSON.stringify({
        success: true,
        weekly_goal,
        goal_bonus,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error updating goal settings:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
