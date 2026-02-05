/**
 * Events API - Supports multi-day and recurring events via JSONB
 * Reuses choretracker.family_events table from MealPlanner
 *
 * Supports both parent and kid event creation:
 * - Parents: Always allowed
 * - Kids: Only when families.settings.apps.choregami.kids_can_create_events is true
 *
 * Query params for GET:
 * - localDate: Start date (default: today)
 * - endDate: End date for range (default: 30 days from localDate)
 * - expand: If "true", expand multi-day and recurring events
 */

import { Handlers } from "$fresh/server.ts";
import { getCookies } from "@std/http/cookie";
import { getServiceSupabaseClient } from "../../lib/supabase.ts";
import { getActivityService } from "../../lib/services/activity-service.ts";
import { expandEventsForDateRange } from "../../lib/utils/event-expansion.ts";

interface SessionInfo {
  familyId: string;
  creatorProfileId: string;
  isKidSession: boolean;
}

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

/**
 * Get session info for event creation - supports both parent and kid sessions
 */
async function getSessionInfo(req: Request, client: any): Promise<SessionInfo | null> {
  const cookies = getCookies(req.headers);
  const accessToken = cookies["sb-access-token"];

  if (!accessToken) return null;

  // Get parent's family info
  const familyId = await getUserFamilyId(client, accessToken);
  if (!familyId) return null;

  // Check if this is a kid session (active-kid-id cookie set)
  const body = await req.clone().json().catch(() => ({}));
  const kidCreatorId = body.creatorId; // Kid's profile ID passed from client

  if (kidCreatorId) {
    // Verify kid belongs to this family
    const { data: kidProfile } = await client
      .from("family_profiles")
      .select("id, family_id")
      .eq("id", kidCreatorId)
      .eq("is_deleted", false)
      .single();

    if (kidProfile && kidProfile.family_id === familyId) {
      return {
        familyId,
        creatorProfileId: kidCreatorId,
        isKidSession: true,
      };
    }
  }

  // Default: parent session
  const { data: { user } } = await client.auth.getUser(accessToken);
  const { data: parentProfile } = await client
    .from("family_profiles")
    .select("id")
    .eq("user_id", user?.id)
    .eq("family_id", familyId)
    .single();

  return {
    familyId,
    creatorProfileId: parentProfile?.id || null,
    isKidSession: false,
  };
}

/**
 * Check if family allows kids to create events
 */
async function kidsCanCreateEvents(client: any, familyId: string): Promise<boolean> {
  const { data: family } = await client
    .from("families")
    .select("settings")
    .eq("id", familyId)
    .single();

  return family?.settings?.apps?.choregami?.kids_can_create_events === true;
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
      // IMPORTANT: localDate should be passed from client (browser's local date)
      // Fallback uses server time which may be UTC and differ from user's timezone
      const url = new URL(req.url);
      const localDate = url.searchParams.get("localDate") || (() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      })();

      // End date for range queries (default: 30 days from start)
      const defaultEndDate = (() => {
        const d = new Date(localDate);
        d.setDate(d.getDate() + 30);
        // Use local date components to avoid UTC timezone issues
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })();
      const endDate = url.searchParams.get("endDate") || defaultEndDate;

      // Whether to expand multi-day and recurring events
      const shouldExpand = url.searchParams.get("expand") === "true";

      // For recurring events, we need to fetch from the original event_date
      // so we can generate future occurrences
      const { data: events } = await client
        .schema("choretracker")
        .from("family_events")
        .select("*")
        .eq("family_id", familyId)
        .eq("is_deleted", false)
        .lte("event_date", endDate) // Include events that start before end date
        .order("event_date")
        .order("created_at");

      // Filter and optionally expand events
      const rawEvents = events || [];

      let resultEvents;
      if (shouldExpand) {
        // Expand multi-day and recurring events
        resultEvents = expandEventsForDateRange(rawEvents, localDate, endDate);
      } else {
        // Just filter to events >= localDate (original behavior)
        resultEvents = rawEvents.filter((e: { event_date: string }) => e.event_date >= localDate);
      }

      return new Response(JSON.stringify({ events: resultEvents }), {
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
  // Supports both parent and kid sessions (when kids_can_create_events is enabled)
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
      const body = await req.json();

      // Check for kid session (creatorId passed from client)
      const kidCreatorId = body.creatorId;
      let familyId: string | null = null;
      let creatorProfileId: string | null = null;

      if (kidCreatorId) {
        // Kid session - verify kid belongs to family and setting is enabled
        const { data: kidProfile } = await client
          .from("family_profiles")
          .select("id, family_id, name")
          .eq("id", kidCreatorId)
          .eq("is_deleted", false)
          .single();

        if (!kidProfile) {
          return new Response(JSON.stringify({ error: "Profile not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        familyId = kidProfile.family_id;

        if (!familyId) {
          return new Response(JSON.stringify({ error: "Kid profile has no family" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Check if kids can create events
        const canCreate = await kidsCanCreateEvents(client, familyId);
        if (!canCreate) {
          return new Response(JSON.stringify({ error: "Kids cannot create events in this family" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }

        creatorProfileId = kidCreatorId;
        console.log(`📅 Kid "${kidProfile.name}" creating event: ${body.title}`);
      } else {
        // Parent session
        familyId = await getUserFamilyId(client, accessToken);
        if (!familyId) {
          return new Response(JSON.stringify({ error: "Family not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { data: { user } } = await client.auth.getUser(accessToken);
        const { data: parentProfile } = await client
          .from("family_profiles")
          .select("id")
          .eq("user_id", user?.id)
          .eq("family_id", familyId)
          .single();

        creatorProfileId = parentProfile?.id || null;
      }

      // Build schedule_data with new fields
      const scheduleData: Record<string, unknown> = {
        all_day: body.is_all_day || false,
        start_time: body.event_time || null,
      };
      if (body.end_time) {
        scheduleData.end_time = body.end_time;
      }
      if (body.duration_days && body.duration_days > 1) {
        scheduleData.duration_days = body.duration_days;
      }

      // Build recurrence_data with new fields
      const recurrenceData: Record<string, unknown> = {};
      if (body.repeat_pattern) {
        recurrenceData.is_recurring = true;
        recurrenceData.pattern = body.repeat_pattern;
        recurrenceData.until_date = body.repeat_until || null;
      }

      const eventData = {
        family_id: familyId,
        title: body.title,
        event_date: body.event_date,
        schedule_data: scheduleData,
        participants: body.participants || [],
        location_data: {},
        recurrence_data: recurrenceData,
        metadata: {
          source_app: "chores2026",
          emoji: body.emoji || null,
        },
        created_by_profile_id: creatorProfileId,
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

      console.log(`✅ Event created: "${newEvent.title}" on ${newEvent.event_date} (id: ${newEvent.id})`);

      // Log activity (non-blocking)
      try {
        // Get creator name
        let creatorName = "Someone";
        if (creatorProfileId) {
          const { data: creator } = await client
            .from("family_profiles")
            .select("name")
            .eq("id", creatorProfileId)
            .single();
          creatorName = creator?.name || "Someone";
        }

        const activityService = getActivityService();
        await activityService.logActivity({
          familyId: familyId!,
          actorId: creatorProfileId || "",
          actorName: creatorName,
          type: "event_created",
          title: `${creatorName} created "${newEvent.title}"`,
          target: {
            type: "event",
            id: newEvent.id,
            name: newEvent.title,
          },
        });
      } catch (error) {
        console.warn("Failed to log activity:", error);
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
