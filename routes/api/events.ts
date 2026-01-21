/**
 * Events API - Simplified for ChoreGami (no multi-day complexity)
 * Reuses choretracker.family_events table from MealPlanner
 */

import { Handlers } from "$fresh/server.ts";
import { getCookies } from "@std/http/cookie";
import { getServiceSupabaseClient } from "../../lib/supabase.ts";

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
  // GET /api/events - List family events
  async GET(req) {
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
        return new Response(JSON.stringify({ events: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Use local date from query param to avoid timezone issues
      const url = new URL(req.url);
      const localDate = url.searchParams.get("localDate") ||
        new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD format in server's local time

      // Get events with linked chore counts
      const { data: events } = await client
        .schema("choretracker")
        .from("family_events")
        .select("*")
        .eq("family_id", familyId)
        .eq("is_deleted", false)
        .gte("event_date", localDate) // Today and future (using local date)
        .order("event_date")
        .order("created_at");

      return new Response(JSON.stringify({ events: events || [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Events GET error:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch events" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },

  // POST /api/events - Create new event
  async POST(req) {
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

      const body = await req.json();

      // Get creator's profile_id
      const { data: { user } } = await client.auth.getUser(accessToken);
      const { data: creatorProfile } = await client
        .from("family_profiles")
        .select("id")
        .eq("user_id", user?.id)
        .eq("family_id", familyId)
        .single();

      const eventData = {
        family_id: familyId,
        title: body.title,
        event_date: body.event_date,
        schedule_data: {
          all_day: body.is_all_day || false,
          start_time: body.event_time || null,
        },
        participants: body.participants || [],
        location_data: {},
        recurrence_data: {},
        metadata: {
          source_app: "chores2026",
          emoji: body.emoji || null,
        },
        created_by_profile_id: creatorProfile?.id || null,
      };

      const { data: newEvent, error } = await client
        .schema("choretracker")
        .from("family_events")
        .insert(eventData)
        .select()
        .single();

      if (error) {
        console.error("Event creation error:", error);
        return new Response(JSON.stringify({ error: "Failed to create event" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ event: newEvent }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Events POST error:", error);
      return new Response(JSON.stringify({ error: "Failed to create event" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
