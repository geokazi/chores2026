/**
 * Unlink Chore from Event API
 * Removes the family_event_id from a chore assignment
 * POST /api/chores/[chore_id]/unlink-event
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../../lib/auth/session.ts";
import { getServiceSupabaseClient } from "../../../../lib/supabase.ts";

export const handler: Handlers = {
  async POST(req, ctx) {
    const session = await getAuthenticatedSession(req);
    if (!session.isAuthenticated || !session.family) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const choreId = ctx.params.chore_id;
    const familyId = session.family.id;

    try {
      const supabase = getServiceSupabaseClient();

      // Verify the chore belongs to this family
      const { data: chore, error: fetchError } = await supabase
        .schema("choretracker")
        .from("chore_assignments")
        .select("id, family_event_id")
        .eq("id", choreId)
        .eq("family_id", familyId)
        .eq("is_deleted", false)
        .single();

      if (fetchError || !chore) {
        return Response.json({ success: false, error: "Chore not found" }, { status: 404 });
      }

      // Remove the event link
      const { error: updateError } = await supabase
        .schema("choretracker")
        .from("chore_assignments")
        .update({ family_event_id: null })
        .eq("id", choreId)
        .eq("family_id", familyId);

      if (updateError) {
        console.error("Error unlinking chore from event:", updateError);
        return Response.json({ success: false, error: "Failed to unlink chore" }, { status: 500 });
      }

      return Response.json({ success: true, message: "Chore unlinked from event" });

    } catch (err) {
      console.error("Unlink chore error:", err);
      return Response.json({ success: false, error: "Internal error" }, { status: 500 });
    }
  },
};
