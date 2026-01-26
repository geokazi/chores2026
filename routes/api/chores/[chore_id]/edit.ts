/**
 * Edit Chore API
 * Updates a chore template (recurring) or assignment (one-time)
 * POST /api/chores/[chore_id]/edit
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../../lib/auth/session.ts";
import { getServiceSupabaseClient } from "../../../../lib/supabase.ts";

interface EditRecurringRequest {
  type: 'recurring';
  name?: string;
  points?: number;
  recurringDays?: string[];
  assignedTo?: string;
}

interface EditOneTimeRequest {
  type: 'one_time';
  name?: string;
  points?: number;
  dueDate?: string;
  assignedTo?: string;
}

type EditRequest = EditRecurringRequest | EditOneTimeRequest;

export const handler: Handlers = {
  async POST(req, ctx) {
    const session = await getAuthenticatedSession(req);
    if (!session.isAuthenticated || !session.family) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const choreId = ctx.params.chore_id;
    const familyId = session.family.id;

    try {
      const body: EditRequest = await req.json();
      const supabase = getServiceSupabaseClient();

      if (body.type === 'recurring') {
        // Update recurring template
        const updates: Record<string, unknown> = {};

        if (body.name !== undefined) updates.name = body.name.trim();
        if (body.points !== undefined) updates.points = body.points;
        if (body.recurringDays !== undefined) updates.recurring_days = body.recurringDays;
        if (body.assignedTo !== undefined) updates.assigned_to_profile_id = body.assignedTo;

        if (Object.keys(updates).length === 0) {
          return Response.json({ success: false, error: "No updates provided" }, { status: 400 });
        }

        const { error } = await supabase
          .schema("choretracker")
          .from("chore_templates")
          .update(updates)
          .eq("id", choreId)
          .eq("family_id", familyId)
          .eq("is_recurring", true)
          .eq("is_deleted", false);

        if (error) {
          console.error("Error updating recurring template:", error);
          return Response.json({ success: false, error: "Failed to update" }, { status: 500 });
        }

        return Response.json({ success: true, message: "Recurring chore updated" });

      } else if (body.type === 'one_time') {
        // Get the assignment first to find the template
        const { data: assignment, error: fetchError } = await supabase
          .schema("choretracker")
          .from("chore_assignments")
          .select("id, chore_template_id, point_value")
          .eq("id", choreId)
          .eq("family_id", familyId)
          .eq("is_deleted", false)
          .single();

        if (fetchError || !assignment) {
          console.error("Error fetching assignment:", fetchError);
          return Response.json({ success: false, error: "Chore not found" }, { status: 404 });
        }

        // Update assignment fields
        const assignmentUpdates: Record<string, unknown> = {};
        if (body.dueDate !== undefined) assignmentUpdates.due_date = body.dueDate;
        if (body.points !== undefined) assignmentUpdates.point_value = body.points;
        if (body.assignedTo !== undefined) assignmentUpdates.assigned_to_profile_id = body.assignedTo;

        if (Object.keys(assignmentUpdates).length > 0) {
          const { error: updateError } = await supabase
            .schema("choretracker")
            .from("chore_assignments")
            .update(assignmentUpdates)
            .eq("id", choreId)
            .eq("family_id", familyId);

          if (updateError) {
            console.error("Error updating assignment:", updateError);
            return Response.json({ success: false, error: "Failed to update assignment" }, { status: 500 });
          }
        }

        // Update template name if provided
        if (body.name !== undefined) {
          const { error: templateError } = await supabase
            .schema("choretracker")
            .from("chore_templates")
            .update({ name: body.name.trim() })
            .eq("id", assignment.chore_template_id)
            .eq("family_id", familyId);

          if (templateError) {
            console.error("Error updating template name:", templateError);
            // Non-fatal - assignment was updated
          }
        }

        return Response.json({ success: true, message: "Chore updated" });

      } else {
        return Response.json({ success: false, error: "Invalid type" }, { status: 400 });
      }

    } catch (err) {
      console.error("Edit chore error:", err);
      return Response.json({ success: false, error: "Internal error" }, { status: 500 });
    }
  },
};
