/**
 * Single Event API - GET, PUT, DELETE operations
 */

import { Handlers } from "$fresh/server.ts";
import { getCookies } from "@std/http/cookie";
import { getServiceSupabaseClient } from "../../../lib/supabase.ts";

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
  // GET /api/events/[id] - Get single event
  async GET(req, ctx) {
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

      const { data: event, error } = await client
        .schema("choretracker")
        .from("family_events")
        .select("*")
        .eq("id", eventId)
        .eq("family_id", familyId)
        .eq("is_deleted", false)
        .single();

      if (error || !event) {
        return new Response(JSON.stringify({ error: "Event not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ event }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Event GET error:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch event" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },

  // PATCH /api/events/[id] - Update event (metadata, prep_tasks, etc.)
  async PATCH(req, ctx) {
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

      // Verify event belongs to this family
      const { data: existing } = await client
        .schema("choretracker")
        .from("family_events")
        .select("*")
        .eq("id", eventId)
        .eq("family_id", familyId)
        .eq("is_deleted", false)
        .single();

      if (!existing) {
        return new Response(JSON.stringify({ error: "Event not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Build update object (only allow certain fields)
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (body.title !== undefined) updateData.title = body.title;
      if (body.event_date !== undefined) updateData.event_date = body.event_date;
      if (body.participants !== undefined) updateData.participants = body.participants;

      // Handle schedule_data - accept either nested or flat format
      if (body.schedule_data !== undefined) {
        updateData.schedule_data = body.schedule_data;
      } else if (body.is_all_day !== undefined || body.event_time !== undefined) {
        // Merge with existing schedule_data
        updateData.schedule_data = {
          ...(existing.schedule_data || {}),
          all_day: body.is_all_day ?? existing.schedule_data?.all_day ?? false,
          start_time: body.event_time ?? existing.schedule_data?.start_time ?? null,
        };
      }

      // Handle metadata - accept either nested or flat format
      if (body.metadata !== undefined) {
        updateData.metadata = body.metadata;
      } else if (body.emoji !== undefined) {
        // Merge emoji into existing metadata, preserving prep_tasks etc.
        updateData.metadata = {
          ...(existing.metadata || {}),
          emoji: body.emoji,
        };
      }

      const { data: updated, error } = await client
        .schema("choretracker")
        .from("family_events")
        .update(updateData)
        .eq("id", eventId)
        .select()
        .single();

      if (error) {
        console.error("Event update error:", error);
        return new Response(JSON.stringify({ error: "Failed to update event" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ event: updated }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Event PATCH error:", error);
      return new Response(JSON.stringify({ error: "Failed to update event" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },

  // DELETE /api/events/[id] - Soft delete event
  async DELETE(req, ctx) {
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

      // Verify event belongs to this family
      const { data: existing } = await client
        .schema("choretracker")
        .from("family_events")
        .select("id")
        .eq("id", eventId)
        .eq("family_id", familyId)
        .single();

      if (!existing) {
        return new Response(JSON.stringify({ error: "Event not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Soft delete
      const { error } = await client
        .schema("choretracker")
        .from("family_events")
        .update({ is_deleted: true })
        .eq("id", eventId);

      if (error) {
        console.error("Event delete error:", error);
        return new Response(JSON.stringify({ error: "Failed to delete event" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Unlink chores from this event (set family_event_id to null)
      await client
        .schema("choretracker")
        .from("chore_assignments")
        .update({ family_event_id: null })
        .eq("family_event_id", eventId);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Event DELETE error:", error);
      return new Response(JSON.stringify({ error: "Failed to delete event" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
