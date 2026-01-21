/**
 * Prep Task API - Toggle completion status
 * POST /api/events/[id]/prep-task
 * Body: { taskId: string, done: boolean }
 */

import { Handlers } from "$fresh/server.ts";
import { getCookies } from "@std/http/cookie";
import { getServiceSupabaseClient } from "../../../../lib/supabase.ts";
import { getActivityService } from "../../../../lib/services/activity-service.ts";

async function getUserFamilyId(client: any, accessToken: string): Promise<string | null> {
  const { data: { user } } = await client.auth.getUser(accessToken);
  if (!user) return null;

  const { data: profile } = await client
    .from("family_profiles")
    .select("family_id")
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .single();

  return profile?.family_id || null;
}

export const handler: Handlers = {
  async POST(req, ctx) {
    try {
      const cookies = getCookies(req.headers);
      const accessToken = cookies["sb-access-token"];
      if (!accessToken) {
        return new Response(JSON.stringify({ error: "Not authenticated" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const client = getServiceSupabaseClient();
      const familyId = await getUserFamilyId(client, accessToken);
      if (!familyId) {
        return new Response(JSON.stringify({ error: "Family not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      const eventId = ctx.params.id;
      const body = await req.json();
      const { taskId, done } = body;

      if (!taskId || typeof done !== "boolean") {
        return new Response(JSON.stringify({ error: "taskId and done are required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Get the event
      const { data: event, error: fetchError } = await client
        .schema("choretracker")
        .from("family_events")
        .select("*")
        .eq("id", eventId)
        .eq("family_id", familyId)
        .eq("is_deleted", false)
        .single();

      if (fetchError || !event) {
        return new Response(JSON.stringify({ error: "Event not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Update the prep task in metadata
      const metadata = event.metadata || {};
      const prepTasks = metadata.prep_tasks || [];

      const taskIndex = prepTasks.findIndex((t: any) => t.id === taskId);
      if (taskIndex === -1) {
        return new Response(JSON.stringify({ error: "Task not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      prepTasks[taskIndex].done = done;

      // Save updated metadata
      const { error: updateError } = await client
        .schema("choretracker")
        .from("family_events")
        .update({
          metadata: { ...metadata, prep_tasks: prepTasks },
          updated_at: new Date().toISOString(),
        })
        .eq("id", eventId);

      if (updateError) {
        console.error("Prep task update error:", updateError);
        return new Response(JSON.stringify({ error: "Failed to update task" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Log activity for task completion only (not unchecking)
      if (done) {
        try {
          const { data: { user } } = await client.auth.getUser(accessToken);
          const { data: userProfile } = await client
            .from("family_profiles")
            .select("id, name")
            .eq("user_id", user?.id)
            .eq("family_id", familyId)
            .single();

          const taskName = prepTasks[taskIndex].text || "prep task";
          const activityService = getActivityService();
          await activityService.logActivity({
            familyId: familyId!,
            actorId: userProfile?.id || "",
            actorName: userProfile?.name || "Someone",
            type: "prep_task_completed",
            title: `${userProfile?.name || "Someone"} completed "${taskName}"`,
            target: {
              type: "prep_task",
              id: taskId,
              name: taskName,
            },
            meta: { eventId, eventTitle: event.title },
          });
        } catch (activityError) {
          console.warn("Failed to log activity:", activityError);
        }
      }

      return new Response(JSON.stringify({ success: true, task: prepTasks[taskIndex] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Prep task toggle error:", error);
      return new Response(JSON.stringify({ error: "Failed to update task" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
