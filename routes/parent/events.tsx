/**
 * Parent Events List Page
 * Simple list view of family events with "This Week" and "Upcoming" sections
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../lib/auth/session.ts";
import { getServiceSupabaseClient } from "../../lib/supabase.ts";
import AppHeader from "../../islands/AppHeader.tsx";
import AppFooter from "../../components/AppFooter.tsx";
import EventsList from "../../islands/EventsList.tsx";

interface FamilyEvent {
  id: string;
  title: string;
  event_date: string;
  schedule_data?: {
    all_day?: boolean;
    start_time?: string;
  };
  participants?: string[];
  metadata?: {
    source_app?: string;
    emoji?: string;
  };
  linked_chores_count?: number;
  completed_chores_count?: number;
}

interface EventsPageData {
  family: any;
  members: any[];
  thisWeek: FamilyEvent[];
  upcoming: FamilyEvent[];
  parentProfileId?: string;
  error?: string;
}

export const handler: Handlers<EventsPageData> = {
  async GET(req, ctx) {
    const session = await getAuthenticatedSession(req);

    if (!session.isAuthenticated || !session.family) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/login" },
      });
    }

    const familyId = session.family.id;
    const family = session.family;
    const members = family.members;
    const parentProfileId = session.user?.profileId;

    try {
      const client = getServiceSupabaseClient();

      // Get events with linked chore counts
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split("T")[0];

      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      const weekFromNowStr = weekFromNow.toISOString().split("T")[0];

      const { data: events, error: eventsError } = await client
        .schema("choretracker")
        .from("family_events")
        .select("*")
        .eq("family_id", familyId)
        .eq("is_deleted", false)
        .gte("event_date", todayStr)
        .order("event_date");

      if (eventsError) {
        console.error("Error fetching events:", eventsError);
        throw eventsError;
      }

      // Get chore counts per event
      const eventIds = (events || []).map((e: any) => e.id);
      let choreCounts: Record<string, { total: number; completed: number }> = {};

      if (eventIds.length > 0) {
        const { data: chores } = await client
          .schema("choretracker")
          .from("chore_assignments")
          .select("family_event_id, status")
          .in("family_event_id", eventIds)
          .eq("is_deleted", false);

        if (chores) {
          for (const chore of chores) {
            if (!chore.family_event_id) continue;
            if (!choreCounts[chore.family_event_id]) {
              choreCounts[chore.family_event_id] = { total: 0, completed: 0 };
            }
            choreCounts[chore.family_event_id].total++;
            if (chore.status === "completed" || chore.status === "verified") {
              choreCounts[chore.family_event_id].completed++;
            }
          }
        }
      }

      // Enrich events with chore counts
      const enrichedEvents = (events || []).map((event: any) => ({
        ...event,
        linked_chores_count: choreCounts[event.id]?.total || 0,
        completed_chores_count: choreCounts[event.id]?.completed || 0,
      }));

      // Split into this week and upcoming
      const thisWeek = enrichedEvents.filter((e: FamilyEvent) => {
        const eventDate = e.event_date;
        return eventDate >= todayStr && eventDate <= weekFromNowStr;
      });

      const upcoming = enrichedEvents.filter((e: FamilyEvent) => {
        const eventDate = e.event_date;
        return eventDate > weekFromNowStr;
      });

      return ctx.render({
        family,
        members,
        thisWeek,
        upcoming,
        parentProfileId,
      });
    } catch (error) {
      console.error("Error loading events:", error);
      return ctx.render({
        family,
        members,
        thisWeek: [],
        upcoming: [],
        parentProfileId,
        error: "Failed to load events",
      });
    }
  },
};

export default function EventsPage({ data }: PageProps<EventsPageData>) {
  const { family, members, thisWeek, upcoming, parentProfileId, error } = data;

  const currentUser = members.find((m) => m.id === parentProfileId) || null;

  return (
    <div class="container">
      <AppHeader
        currentPage="events"
        pageTitle="Family Events"
        familyMembers={members}
        currentUser={currentUser}
        userRole="parent"
      />

      {error ? (
        <div class="card" style={{ textAlign: "center", padding: "2rem" }}>
          <p style={{ color: "var(--color-warning)" }}>{error}</p>
          <a href="/parent/dashboard" class="btn btn-primary" style={{ marginTop: "1rem" }}>
            Back to Dashboard
          </a>
        </div>
      ) : (
        <EventsList
          thisWeek={thisWeek}
          upcoming={upcoming}
          familyMembers={members}
        />
      )}

      <AppFooter />
    </div>
  );
}
