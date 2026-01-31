/**
 * Get chores linked to specific events
 * Used by dashboards to show event-linked chores in "What's Next" section
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { getSupabaseClient } from "../../../lib/supabase.ts";

export const handler: Handlers = {
  async POST(req) {
    // Verify authenticated session
    const session = await getAuthenticatedSession(req);
    if (!session.isAuthenticated || !session.family) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    try {
      const { eventIds, memberId } = await req.json();

      if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
        return new Response(
          JSON.stringify({ chores: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      const supabase = getSupabaseClient();
      const familyId = session.family.id;

      // Fetch chores linked to these events, assigned to this member
      let query = supabase
        .schema("choretracker")
        .from("chore_assignments")
        .select(`
          id,
          status,
          point_value,
          due_date,
          family_event_id,
          chore_template:chore_templates(id, name, icon, description)
        `)
        .eq("family_id", familyId)
        .eq("is_deleted", false)
        .in("family_event_id", eventIds)
        .in("status", ["pending", "assigned"]);

      // Filter by member if provided
      if (memberId) {
        query = query.eq("assigned_to_profile_id", memberId);
      }

      const { data: chores, error } = await query.order("due_date", { ascending: true });

      if (error) {
        console.error("Error fetching event chores:", error);
        return new Response(
          JSON.stringify({ error: "Failed to fetch chores" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      console.log(`📋 Fetched ${chores?.length || 0} chores for ${eventIds.length} events`);

      return new Response(
        JSON.stringify({ chores: chores || [] }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );

    } catch (error) {
      console.error("Error in by-events:", error);
      return new Response(
        JSON.stringify({ error: "Internal error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
