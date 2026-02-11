/**
 * Parent Events List Page
 * Simple list view of family events with "This Week" and "Upcoming" sections
 * Supports multi-day and recurring events via expansion
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../lib/auth/session.ts";
import { getServiceSupabaseClient } from "../../lib/supabase.ts";
import { getPlanBadge, type PlanBadgeInfo } from "../../lib/plan-gate.ts";
import {
  ExpandedEvent,
  expandEventsForDateRange,
} from "../../lib/utils/event-expansion.ts";
import AppHeader from "../../islands/AppHeader.tsx";
import AppFooter from "../../components/AppFooter.tsx";
import EventsList from "../../islands/EventsList.tsx";

interface LinkedChore {
  id: string;
  status: string;
  point_value: number;
  assigned_to_profile_id?: string;
  chore_template?: {
    id: string;
    name: string;
    icon?: string;
    description?: string;
  };
}

interface FamilyEvent {
  id: string;
  title: string;
  event_date: string;
  schedule_data?: {
    all_day?: boolean;
    start_time?: string;
    end_time?: string;
    duration_days?: number;
  };
  recurrence_data?: {
    is_recurring?: boolean;
    pattern?: "weekly" | "biweekly" | "monthly";
    until_date?: string;
  };
  participants?: string[];
  metadata?: {
    source_app?: string;
    emoji?: string;
  };
  linked_chores?: LinkedChore[];
  linked_chores_count?: number;
  completed_chores_count?: number;
  // Expansion fields
  display_date?: string;
  display_suffix?: string;
  is_recurring_instance?: boolean;
  is_multi_day_instance?: boolean;
}

interface EventsPageData {
  family: any;
  members: any[];
  thisWeek: FamilyEvent[];
  upcoming: FamilyEvent[];
  pastEventsCount: number;
  parentProfileId?: string;
  planBadge?: PlanBadgeInfo;
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

      // Date calculations - use localDate from query param (browser's local date)
      // This fixes UTC timezone issues where server time differs from user's local time
      const url = new URL(req.url);
      const todayStr = url.searchParams.get("localDate") || (() => {
        // Fallback: calculate server local date (will be UTC on Fly.io)
        const today = new Date();
        return `${today.getFullYear()}-${
          String(today.getMonth() + 1).padStart(2, "0")
        }-${String(today.getDate()).padStart(2, "0")}`;
      })();
      const today = new Date(todayStr + "T00:00:00");
      const toLocalDateStr = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${
          String(d.getDate()).padStart(2, "0")
        }`;

      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      const weekFromNowStr = toLocalDateStr(weekFromNow);

      // Query end date: 180 days out to capture events up to 6 months ahead
      const queryEnd = new Date(today);
      queryEnd.setDate(queryEnd.getDate() + 180);
      const queryEndStr = toLocalDateStr(queryEnd);

      // Fetch events - include events that may have started before today
      // (for recurring events that started in the past but have future occurrences)
      const { data: events, error: eventsError } = await client
        .schema("choretracker")
        .from("family_events")
        .select("*")
        .eq("family_id", familyId)
        .eq("is_deleted", false)
        .lte("event_date", queryEndStr) // Include events up to query end
        .order("event_date");

      if (eventsError) {
        console.error("Error fetching events:", eventsError);
        throw eventsError;
      }

      // Count past events (for context-aware empty state)
      const { count: pastEventsCount } = await client
        .schema("choretracker")
        .from("family_events")
        .select("*", { count: "exact", head: true })
        .eq("family_id", familyId)
        .eq("is_deleted", false)
        .lt("event_date", todayStr);

      // Get linked chores per event (full data for EventCard display)
      const eventIds = (events || []).map((e: any) => e.id);
      let linkedChoresMap: Record<string, any[]> = {};
      let choreCounts: Record<string, { total: number; completed: number }> =
        {};

      if (eventIds.length > 0) {
        const { data: chores } = await client
          .schema("choretracker")
          .from("chore_assignments")
          .select(`
            id,
            family_event_id,
            status,
            point_value,
            assigned_to_profile_id,
            chore_template:chore_template_id (
              id,
              name,
              icon,
              description
            )
          `)
          .in("family_event_id", eventIds)
          .eq("is_deleted", false);

        if (chores) {
          for (const chore of chores) {
            if (!chore.family_event_id) continue;

            // Build linked chores array
            if (!linkedChoresMap[chore.family_event_id]) {
              linkedChoresMap[chore.family_event_id] = [];
            }
            linkedChoresMap[chore.family_event_id].push(chore);

            // Also track counts for backward compatibility
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

      // Expand multi-day and recurring events
      const expandedEvents = expandEventsForDateRange(
        events || [],
        todayStr,
        queryEndStr,
      );

      // Enrich expanded events with linked chores data
      const enrichedEvents = expandedEvents.map((event) => ({
        ...event,
        linked_chores: linkedChoresMap[event.id] || [],
        linked_chores_count: choreCounts[event.id]?.total || 0,
        completed_chores_count: choreCounts[event.id]?.completed || 0,
      }));

      // Split into this week and upcoming (using display_date for expanded events)
      const thisWeek = enrichedEvents.filter((e) => {
        const displayDate = e.display_date || e.event_date;
        return displayDate >= todayStr && displayDate <= weekFromNowStr;
      });

      const upcoming = enrichedEvents.filter((e) => {
        const displayDate = e.display_date || e.event_date;
        return displayDate > weekFromNowStr;
      });

      console.log(
        `📅 Parent events page: ${
          events?.length || 0
        } raw, ${enrichedEvents.length} expanded, ${thisWeek.length} this week, ${upcoming.length} upcoming`,
      );

      return ctx.render({
        family,
        members,
        thisWeek,
        upcoming,
        pastEventsCount: pastEventsCount || 0,
        parentProfileId,
        planBadge: getPlanBadge(family.settings),
      });
    } catch (error) {
      console.error("Error loading events:", error);
      return ctx.render({
        family,
        members,
        thisWeek: [],
        upcoming: [],
        pastEventsCount: 0,
        parentProfileId,
        error: "Failed to load events",
      });
    }
  },
};

export default function EventsPage({ data }: PageProps<EventsPageData>) {
  const {
    family,
    members,
    thisWeek,
    upcoming,
    pastEventsCount,
    parentProfileId,
    planBadge,
    error,
  } = data;

  const currentUser = members.find((m) => m.id === parentProfileId) || null;

  // Script to detect browser timezone and reload with localDate if needed
  const timezoneScript = `
    (function() {
      const url = new URL(window.location.href);
      if (!url.searchParams.has('localDate')) {
        const now = new Date();
        const localDate = now.getFullYear() + '-' +
          String(now.getMonth() + 1).padStart(2, '0') + '-' +
          String(now.getDate()).padStart(2, '0');
        url.searchParams.set('localDate', localDate);
        window.location.replace(url.toString());
      }
    })();
  `;

  return (
    <div class="container">
      {/* Auto-detect and pass browser local date for timezone-correct filtering */}
      <script dangerouslySetInnerHTML={{ __html: timezoneScript }} />
      <AppHeader
        currentPage="events"
        pageTitle="Family Events"
        familyMembers={members}
        currentUser={currentUser}
        userRole="parent"
        planBadge={planBadge}
      />

      {error
        ? (
          <div class="card" style={{ textAlign: "center", padding: "2rem" }}>
            <p style={{ color: "var(--color-warning)" }}>{error}</p>
            <a
              href="/parent/dashboard"
              class="btn btn-primary"
              style={{ marginTop: "1rem" }}
            >
              Back to Dashboard
            </a>
          </div>
        )
        : (
          <EventsList
            thisWeek={thisWeek}
            upcoming={upcoming}
            pastEventsCount={pastEventsCount}
            familyMembers={members}
          />
        )}

      <AppFooter />
    </div>
  );
}
