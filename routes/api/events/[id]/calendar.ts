/**
 * Calendar ICS Export
 * GET /api/events/:id/calendar → downloads .ics file
 * Authenticated via session cookie
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../../lib/auth/session.ts";
import { getServiceSupabaseClient } from "../../../../lib/supabase.ts";
import { incrementUsage } from "../../../../lib/services/usage-tracker.ts";

export const handler: Handlers = {
  async GET(req, ctx) {
    const session = await getAuthenticatedSession(req);
    if (!session.isAuthenticated || !session.family) {
      return new Response("Unauthorized", { status: 401 });
    }

    const eventId = ctx.params.id;
    const supabase = getServiceSupabaseClient();

    const { data: event, error } = await supabase
      .from("family_events")
      .select("*")
      .eq("id", eventId)
      .eq("family_id", session.family.id)
      .single();

    if (error || !event) {
      return new Response("Event not found", { status: 404 });
    }

    const ics = generateICS(event);

    // Track usage (non-blocking)
    const profileId = session.user?.profileId;
    if (profileId) {
      incrementUsage(profileId, "ics").catch((err) =>
        console.warn("Usage tracking failed:", err)
      );
    }

    const filename = `${event.title.replace(/[^a-zA-Z0-9 ]/g, "").trim()}.ics`;

    return new Response(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  },
};

function generateICS(event: Record<string, unknown>): string {
  const scheduleData = event.schedule_data as Record<string, unknown> | null;
  const recurrenceData = event.recurrence_data as Record<string, unknown> | null;
  const participants = event.participants as string[] | null;

  // Format date/time for ICS (TZID=Africa/Nairobi)
  const eventDate = event.event_date as string; // "2026-01-27"
  const startTime = scheduleData?.start_time as string | undefined; // "18:30"
  const endTime = scheduleData?.end_time as string | undefined;
  const allDay = scheduleData?.all_day as boolean | undefined;
  const durationDays = scheduleData?.duration_days as number | undefined;

  let dtStart: string;
  let dtEnd: string;

  if (allDay || !startTime) {
    // All-day event: use VALUE=DATE format
    const dateStr = eventDate.replace(/-/g, "");
    dtStart = `DTSTART;VALUE=DATE:${dateStr}`;
    if (durationDays && durationDays > 1) {
      const endDate = new Date(eventDate + "T00:00:00");
      endDate.setDate(endDate.getDate() + durationDays);
      const endStr = endDate.toISOString().slice(0, 10).replace(/-/g, "");
      dtEnd = `DTEND;VALUE=DATE:${endStr}`;
    } else {
      const nextDay = new Date(eventDate + "T00:00:00");
      nextDay.setDate(nextDay.getDate() + 1);
      const endStr = nextDay.toISOString().slice(0, 10).replace(/-/g, "");
      dtEnd = `DTEND;VALUE=DATE:${endStr}`;
    }
  } else {
    // Timed event with TZID
    const dateStr = eventDate.replace(/-/g, "");
    const startFormatted = startTime.replace(":", "") + "00";
    dtStart = `DTSTART;TZID=Africa/Nairobi:${dateStr}T${startFormatted}`;

    if (endTime) {
      const endFormatted = endTime.replace(":", "") + "00";
      dtEnd = `DTEND;TZID=Africa/Nairobi:${dateStr}T${endFormatted}`;
    } else {
      // Default 1-hour duration
      const [h, m] = startTime.split(":").map(Number);
      const endH = String(h + 1).padStart(2, "0");
      const endM = String(m).padStart(2, "0");
      dtEnd = `DTEND;TZID=Africa/Nairobi:${dateStr}T${endH}${endM}00`;
    }
  }

  // Recurrence rule
  let rrule = "";
  if (recurrenceData?.is_recurring && recurrenceData?.pattern) {
    const freqMap: Record<string, string> = {
      weekly: "WEEKLY",
      biweekly: "WEEKLY;INTERVAL=2",
      monthly: "MONTHLY",
    };
    const freq = freqMap[recurrenceData.pattern as string] || "WEEKLY";
    rrule = `RRULE:FREQ=${freq}`;
    if (recurrenceData.until_date) {
      const until = (recurrenceData.until_date as string).replace(/-/g, "");
      rrule += `;UNTIL=${until}T235959Z`;
    }
    rrule += "\n";
  }

  const title = event.title as string;
  const description = participants?.length
    ? `Participants: ${participants.join(", ")}`
    : "";
  const metadata = event.metadata as Record<string, unknown> | null;
  const emoji = metadata?.emoji as string || "";

  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ChoreGami//Events//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VTIMEZONE",
    "TZID:Africa/Nairobi",
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:+0300",
    "TZOFFSETTO:+0300",
    "TZNAME:EAT",
    "END:STANDARD",
    "END:VTIMEZONE",
    "BEGIN:VEVENT",
    dtStart,
    dtEnd,
    rrule ? rrule.trim() : null,
    `SUMMARY:${emoji}${emoji ? " " : ""}${title}`,
    description ? `DESCRIPTION:${description}` : null,
    `UID:${event.id}@choregami.app`,
    `DTSTAMP:${now}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT60M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Event reminder",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.join("\r\n") + "\r\n";
}
