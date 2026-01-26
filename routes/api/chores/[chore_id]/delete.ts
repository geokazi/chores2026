/**
 * Delete Chore API
 * Soft-deletes a chore template or assignment
 * POST /api/chores/[chore_id]/delete
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../../lib/auth/session.ts";
import { getSupabaseClient } from "../../../../lib/supabase.ts";

interface DeleteRequest {
  type: 'recurring' | 'one_time';
}

export const handler: Handlers = {
  async POST(req, ctx) {
    const session = await getAuthenticatedSession(req);
    if (!session.isAuthenticated || !session.family) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const choreId = ctx.params.chore_id;
    const familyId = session.family.id;

    try {
      const body: DeleteRequest = await req.json();
      const supabase = getSupabaseClient();

      if (body.type === 'recurring') {
        // Soft-delete the recurring template
        const { error } = await supabase
          .schema("choretracker")
          .from("chore_templates")
          .update({ is_deleted: true, is_active: false })
          .eq("id", choreId)
          .eq("family_id", familyId)
          .eq("is_recurring", true);

        if (error) {
          console.error("Error deleting recurring template:", error);
          return Response.json({ success: false, error: "Failed to delete" }, { status: 500 });
        }

        return Response.json({ success: true, message: "Recurring chore deleted" });

      } else if (body.type === 'one_time') {
        // Soft-delete the assignment
        const { error } = await supabase
          .schema("choretracker")
          .from("chore_assignments")
          .update({ is_deleted: true })
          .eq("id", choreId)
          .eq("family_id", familyId);

        if (error) {
          console.error("Error deleting assignment:", error);
          return Response.json({ success: false, error: "Failed to delete" }, { status: 500 });
        }

        return Response.json({ success: true, message: "Chore deleted" });

      } else {
        return Response.json({ success: false, error: "Invalid type" }, { status: 400 });
      }

    } catch (err) {
      console.error("Delete chore error:", err);
      return Response.json({ success: false, error: "Internal error" }, { status: 500 });
    }
  },
};
