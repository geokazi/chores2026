/**
 * ICS Generator Tests
 * Tests for ICS output format, RRULE, multi-day, VALARM, timezone.
 */

import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.220.0/assert/mod.ts";
import { generateICS, type EventData } from "./ics-generator.ts";

// === Basic Structure Tests ===

Deno.test("ICS - contains required VCALENDAR structure", () => {
  const event: EventData = {
    id: "test-1",
    title: "Test Event",
    event_date: "2026-01-27",
  };
  const ics = generateICS(event, "America/New_York");
  assertStringIncludes(ics, "BEGIN:VCALENDAR");
  assertStringIncludes(ics, "END:VCALENDAR");
  assertStringIncludes(ics, "VERSION:2.0");
  assertStringIncludes(ics, "PRODID:-//ChoreGami//Events//EN");
  assertStringIncludes(ics, "CALSCALE:GREGORIAN");
  assertStringIncludes(ics, "METHOD:PUBLISH");
  assertStringIncludes(ics, "X-WR-TIMEZONE:America/New_York");
});

Deno.test("ICS - contains VEVENT block", () => {
  const event: EventData = {
    id: "test-1",
    title: "Test Event",
    event_date: "2026-01-27",
  };
  const ics = generateICS(event);
  assertStringIncludes(ics, "BEGIN:VEVENT");
  assertStringIncludes(ics, "END:VEVENT");
});

Deno.test("ICS - contains correct UID", () => {
  const event: EventData = {
    id: "abc-123",
    title: "Test Event",
    event_date: "2026-01-27",
  };
  const ics = generateICS(event);
  assertStringIncludes(ics, "UID:abc-123@choregami.app");
});

Deno.test("ICS - uses CRLF line endings", () => {
  const event: EventData = {
    id: "test-1",
    title: "Test Event",
    event_date: "2026-01-27",
  };
  const ics = generateICS(event);
  assertEquals(ics.includes("\r\n"), true);
});

// === VALARM Tests ===

Deno.test("ICS - includes 60-minute VALARM reminder", () => {
  const event: EventData = {
    id: "test-1",
    title: "Test Event",
    event_date: "2026-01-27",
    schedule_data: { start_time: "14:00" },
  };
  const ics = generateICS(event, "UTC");
  assertStringIncludes(ics, "BEGIN:VALARM");
  assertStringIncludes(ics, "TRIGGER:-PT60M");
  assertStringIncludes(ics, "ACTION:DISPLAY");
  assertStringIncludes(ics, "END:VALARM");
});

// === Timezone Tests ===

Deno.test("ICS - non-DST timezone has single STANDARD section", () => {
  const event: EventData = {
    id: "test-1",
    title: "Test Event",
    event_date: "2026-01-27",
    schedule_data: { start_time: "09:00" },
  };
  const ics = generateICS(event, "Africa/Nairobi");
  assertStringIncludes(ics, "BEGIN:VTIMEZONE");
  assertStringIncludes(ics, "TZID:Africa/Nairobi");
  assertStringIncludes(ics, "TZOFFSETTO:+0300");
  assertStringIncludes(ics, "X-WR-TIMEZONE:Africa/Nairobi");
  assertEquals(ics.includes("DAYLIGHT"), false);
});

Deno.test("ICS - DST timezone has STANDARD and DAYLIGHT sections", () => {
  const event: EventData = {
    id: "test-1",
    title: "Test Event",
    event_date: "2026-06-15",
    schedule_data: { start_time: "09:00" },
  };
  const ics = generateICS(event, "America/New_York");
  assertStringIncludes(ics, "BEGIN:VTIMEZONE");
  assertStringIncludes(ics, "TZID:America/New_York");
  assertStringIncludes(ics, "BEGIN:STANDARD");
  assertStringIncludes(ics, "BEGIN:DAYLIGHT");
  assertStringIncludes(ics, "X-WR-TIMEZONE:America/New_York");
});

Deno.test("ICS - UTC timezone generates correct offset", () => {
  const event: EventData = {
    id: "test-1",
    title: "Test Event",
    event_date: "2026-01-27",
    schedule_data: { start_time: "10:00" },
  };
  const ics = generateICS(event, "UTC");
  assertStringIncludes(ics, "TZID:UTC");
  assertStringIncludes(ics, "TZOFFSETTO:+0000");
});

Deno.test("ICS - defaults to UTC when no timezone specified", () => {
  const event: EventData = {
    id: "test-1",
    title: "Test Event",
    event_date: "2026-01-27",
    schedule_data: { start_time: "10:00" },
  };
  const ics = generateICS(event);
  assertStringIncludes(ics, "X-WR-TIMEZONE:UTC");
  assertStringIncludes(ics, "DTSTART;TZID=UTC:");
});

Deno.test("ICS - all-day event has no VTIMEZONE block", () => {
  const event: EventData = {
    id: "test-1",
    title: "Holiday",
    event_date: "2026-03-01",
    schedule_data: { all_day: true },
  };
  const ics = generateICS(event, "America/Chicago");
  assertEquals(ics.includes("BEGIN:VTIMEZONE"), false);
});

// === Timed Event Tests ===

Deno.test("ICS - timed event uses provided TZID", () => {
  const event: EventData = {
    id: "test-1",
    title: "Basketball Practice",
    event_date: "2026-01-27",
    schedule_data: { start_time: "18:30", end_time: "19:30" },
  };
  const ics = generateICS(event, "America/Los_Angeles");
  assertStringIncludes(ics, "DTSTART;TZID=America/Los_Angeles:20260127T183000");
  assertStringIncludes(ics, "DTEND;TZID=America/Los_Angeles:20260127T193000");
});

Deno.test("ICS - timed event without end_time defaults to 1 hour", () => {
  const event: EventData = {
    id: "test-1",
    title: "Meeting",
    event_date: "2026-02-15",
    schedule_data: { start_time: "14:00" },
  };
  const ics = generateICS(event, "Europe/London");
  assertStringIncludes(ics, "DTSTART;TZID=Europe/London:20260215T140000");
  assertStringIncludes(ics, "DTEND;TZID=Europe/London:20260215T150000");
});

// === All-Day Event Tests ===

Deno.test("ICS - all-day event uses VALUE=DATE format", () => {
  const event: EventData = {
    id: "test-1",
    title: "Holiday",
    event_date: "2026-03-01",
    schedule_data: { all_day: true },
  };
  const ics = generateICS(event);
  assertStringIncludes(ics, "DTSTART;VALUE=DATE:20260301");
  assertStringIncludes(ics, "DTEND;VALUE=DATE:20260302");
});

Deno.test("ICS - event without start_time treated as all-day", () => {
  const event: EventData = {
    id: "test-1",
    title: "Birthday",
    event_date: "2026-06-15",
  };
  const ics = generateICS(event);
  assertStringIncludes(ics, "DTSTART;VALUE=DATE:20260615");
  assertStringIncludes(ics, "DTEND;VALUE=DATE:20260616");
});

// === Multi-Day Event Tests ===

Deno.test("ICS - multi-day event spans correct dates", () => {
  const event: EventData = {
    id: "test-1",
    title: "Family Trip",
    event_date: "2026-04-10",
    schedule_data: { all_day: true, duration_days: 3 },
  };
  const ics = generateICS(event);
  assertStringIncludes(ics, "DTSTART;VALUE=DATE:20260410");
  assertStringIncludes(ics, "DTEND;VALUE=DATE:20260413");
});

Deno.test("ICS - multi-day event with duration_days=1 is single day", () => {
  const event: EventData = {
    id: "test-1",
    title: "Workshop",
    event_date: "2026-05-20",
    schedule_data: { all_day: true, duration_days: 1 },
  };
  const ics = generateICS(event);
  assertStringIncludes(ics, "DTSTART;VALUE=DATE:20260520");
  assertStringIncludes(ics, "DTEND;VALUE=DATE:20260521");
});

// === RRULE Tests ===

Deno.test("ICS - weekly recurrence generates correct RRULE", () => {
  const event: EventData = {
    id: "test-1",
    title: "Weekly Practice",
    event_date: "2026-01-27",
    schedule_data: { start_time: "18:00" },
    recurrence_data: { is_recurring: true, pattern: "weekly" },
  };
  const ics = generateICS(event);
  assertStringIncludes(ics, "RRULE:FREQ=WEEKLY");
});

Deno.test("ICS - biweekly recurrence uses INTERVAL=2", () => {
  const event: EventData = {
    id: "test-1",
    title: "Biweekly Meeting",
    event_date: "2026-02-01",
    schedule_data: { start_time: "10:00" },
    recurrence_data: { is_recurring: true, pattern: "biweekly" },
  };
  const ics = generateICS(event);
  assertStringIncludes(ics, "RRULE:FREQ=WEEKLY;INTERVAL=2");
});

Deno.test("ICS - monthly recurrence generates correct RRULE", () => {
  const event: EventData = {
    id: "test-1",
    title: "Monthly Review",
    event_date: "2026-01-15",
    schedule_data: { start_time: "09:00" },
    recurrence_data: { is_recurring: true, pattern: "monthly" },
  };
  const ics = generateICS(event);
  assertStringIncludes(ics, "RRULE:FREQ=MONTHLY");
});

Deno.test("ICS - RRULE with until_date includes UNTIL", () => {
  const event: EventData = {
    id: "test-1",
    title: "Limited Recurrence",
    event_date: "2026-01-01",
    schedule_data: { start_time: "08:00" },
    recurrence_data: { is_recurring: true, pattern: "weekly", until_date: "2026-06-30" },
  };
  const ics = generateICS(event);
  assertStringIncludes(ics, "RRULE:FREQ=WEEKLY;UNTIL=20260630T235959Z");
});

Deno.test("ICS - non-recurring event has no RRULE", () => {
  const event: EventData = {
    id: "test-1",
    title: "One-time Event",
    event_date: "2026-03-15",
    schedule_data: { start_time: "12:00" },
    recurrence_data: { is_recurring: false },
  };
  const ics = generateICS(event);
  assertEquals(ics.includes("RRULE"), false);
});

// === Summary/Description Tests ===

Deno.test("ICS - SUMMARY includes emoji prefix", () => {
  const event: EventData = {
    id: "test-1",
    title: "Basketball Practice",
    event_date: "2026-01-27",
    metadata: { emoji: "🏀" },
  };
  const ics = generateICS(event);
  assertStringIncludes(ics, "SUMMARY:🏀 Basketball Practice");
});

Deno.test("ICS - SUMMARY without emoji has no prefix", () => {
  const event: EventData = {
    id: "test-1",
    title: "Meeting",
    event_date: "2026-01-27",
  };
  const ics = generateICS(event);
  assertStringIncludes(ics, "SUMMARY:Meeting");
  assertEquals(ics.includes("SUMMARY: Meeting"), false);
});

Deno.test("ICS - DESCRIPTION includes participants", () => {
  const event: EventData = {
    id: "test-1",
    title: "Practice",
    event_date: "2026-01-27",
    participants: ["Julia", "Ciku"],
  };
  const ics = generateICS(event);
  assertStringIncludes(ics, "DESCRIPTION:Participants: Julia, Ciku");
});

Deno.test("ICS - no DESCRIPTION when no participants", () => {
  const event: EventData = {
    id: "test-1",
    title: "Solo Event",
    event_date: "2026-01-27",
    participants: [],
  };
  const ics = generateICS(event);
  assertEquals(ics.includes("DESCRIPTION:Participants"), false);
});

// === Multi-timezone Tests ===

Deno.test("ICS - Asia/Tokyo generates correct offset (+0900)", () => {
  const event: EventData = {
    id: "test-1",
    title: "Tokyo Meeting",
    event_date: "2026-03-15",
    schedule_data: { start_time: "10:00" },
  };
  const ics = generateICS(event, "Asia/Tokyo");
  assertStringIncludes(ics, "TZID:Asia/Tokyo");
  assertStringIncludes(ics, "TZOFFSETTO:+0900");
  assertStringIncludes(ics, "DTSTART;TZID=Asia/Tokyo:20260315T100000");
});

Deno.test("ICS - Pacific/Honolulu generates negative offset (-1000)", () => {
  const event: EventData = {
    id: "test-1",
    title: "Hawaii Event",
    event_date: "2026-07-04",
    schedule_data: { start_time: "16:00" },
  };
  const ics = generateICS(event, "Pacific/Honolulu");
  assertStringIncludes(ics, "TZID:Pacific/Honolulu");
  assertStringIncludes(ics, "-1000");
  assertStringIncludes(ics, "DTSTART;TZID=Pacific/Honolulu:20260704T160000");
});

Deno.test("ICS - Australia/Sydney generates correct offset", () => {
  const event: EventData = {
    id: "test-1",
    title: "Sydney Meeting",
    event_date: "2026-02-15",
    schedule_data: { start_time: "09:00" },
  };
  const ics = generateICS(event, "Australia/Sydney");
  assertStringIncludes(ics, "TZID:Australia/Sydney");
  assertStringIncludes(ics, "DTSTART;TZID=Australia/Sydney:20260215T090000");
  // Sydney has DST
  assertStringIncludes(ics, "BEGIN:DAYLIGHT");
});
