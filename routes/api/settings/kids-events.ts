/**
 * API to toggle "kids can create events" family setting
 * Stores in families.settings.apps.choregami.kids_can_create_events
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { getServiceSupabaseClient } from "../../../lib/supabase.ts";

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
      const { enabled } = await req.json();
      const familyId = session.family.id;
      const client = getServiceSupabaseClient();

      // Get current settings
      const { data: family, error: fetchError } = await client
        .from("families")
        .select("settings")
        .eq("id", familyId)
        .single();

      if (fetchError) {
        console.error("Error fetching family settings:", fetchError);
        return new Response(JSON.stringify({ error: "Failed to fetch settings" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Merge new setting into existing JSONB structure
      const currentSettings = family?.settings || {};
      const updatedSettings = {
        ...currentSettings,
        apps: {
          ...currentSettings.apps,
          choregami: {
            ...currentSettings.apps?.choregami,
            kids_can_create_events: enabled === true,
          },
        },
      };

      // Save updated settings
      const { error: updateError } = await client
        .from("families")
        .update({ settings: updatedSettings })
        .eq("id", familyId);

      if (updateError) {
        console.error("Error updating family settings:", updateError);
        return new Response(JSON.stringify({ error: "Failed to save settings" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.log(`📅 Kids event creation ${enabled ? "enabled" : "disabled"} for family ${familyId}`);

      return new Response(JSON.stringify({ success: true, enabled }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error in kids-events setting:", error);
      return new Response(JSON.stringify({ error: "Internal error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
