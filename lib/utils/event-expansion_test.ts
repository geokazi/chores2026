/**
 * Unit tests for event expansion utility
 * Run with: deno test lib/utils/event-expansion_test.ts
 */

import { assertEquals, assertArrayIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  expandEventsForDateRange,
  isMultiDayEvent,
  isRecurringEvent,
  getRecurrenceDescription,
  FamilyEvent,
} from "./event-expansion.ts";

// Helper to create a test event
function createEvent(overrides: Partial<FamilyEvent> = {}): FamilyEvent {
  return {
    id: "test-id",
    title: "Test Event",
    event_date: "2026-01-20",
    ...overrides,
  };
}

Deno.test("expandEventsForDateRange - single event within range", () => {
  const events = [createEvent({ event_date: "2026-01-22" })];
  const result = expandEventsForDateRange(events, "2026-01-20", "2026-01-30");

  assertEquals(result.length, 1);
  assertEquals(result[0].display_date, "2026-01-22");
  assertEquals(result[0].display_suffix, undefined);
});

Deno.test("expandEventsForDateRange - single event outside range (before)", () => {
  const events = [createEvent({ event_date: "2026-01-15" })];
  const result = expandEventsForDateRange(events, "2026-01-20", "2026-01-30");

  assertEquals(result.length, 0);
});

Deno.test("expandEventsForDateRange - single event outside range (after)", () => {
  const events = [createEvent({ event_date: "2026-02-15" })];
  const result = expandEventsForDateRange(events, "2026-01-20", "2026-01-30");

  assertEquals(result.length, 0);
});

Deno.test("expandEventsForDateRange - multi-day event fully within range", () => {
  const events = [
    createEvent({
      event_date: "2026-01-22",
      schedule_data: { duration_days: 3 },
    }),
  ];
  const result = expandEventsForDateRange(events, "2026-01-20", "2026-01-30");

  assertEquals(result.length, 3);
  assertEquals(result[0].display_date, "2026-01-22");
  assertEquals(result[0].display_suffix, " (Day 1 of 3)");
  assertEquals(result[0].day_index, 1);
  assertEquals(result[0].total_days, 3);

  assertEquals(result[1].display_date, "2026-01-23");
  assertEquals(result[1].display_suffix, " (Day 2 of 3)");

  assertEquals(result[2].display_date, "2026-01-24");
  assertEquals(result[2].display_suffix, " (Day 3 of 3)");
});

Deno.test("expandEventsForDateRange - multi-day event partially within range", () => {
  const events = [
    createEvent({
      event_date: "2026-01-19", // Starts before range
      schedule_data: { duration_days: 3 },
    }),
  ];
  const result = expandEventsForDateRange(events, "2026-01-20", "2026-01-30");

  // Only days 2 and 3 should be in range (Jan 20, 21)
  assertEquals(result.length, 2);
  assertEquals(result[0].display_date, "2026-01-20");
  assertEquals(result[0].display_suffix, " (Day 2 of 3)");
  assertEquals(result[1].display_date, "2026-01-21");
  assertEquals(result[1].display_suffix, " (Day 3 of 3)");
});

Deno.test("expandEventsForDateRange - recurring weekly event", () => {
  const events = [
    createEvent({
      event_date: "2026-01-20",
      recurrence_data: {
        is_recurring: true,
        pattern: "weekly",
        until_date: "2026-02-10",
      },
    }),
  ];
  const result = expandEventsForDateRange(events, "2026-01-20", "2026-02-10");

  // Weekly: Jan 20, 27, Feb 3, 10 = 4 occurrences
  assertEquals(result.length, 4);
  assertEquals(result[0].display_date, "2026-01-20");
  assertEquals(result[1].display_date, "2026-01-27");
  assertEquals(result[2].display_date, "2026-02-03");
  assertEquals(result[3].display_date, "2026-02-10");

  // All should be marked as recurring instances
  result.forEach((e) => assertEquals(e.is_recurring_instance, true));
});

Deno.test("expandEventsForDateRange - recurring biweekly event", () => {
  const events = [
    createEvent({
      event_date: "2026-01-20",
      recurrence_data: {
        is_recurring: true,
        pattern: "biweekly",
        until_date: "2026-02-20",
      },
    }),
  ];
  const result = expandEventsForDateRange(events, "2026-01-20", "2026-02-20");

  // Biweekly: Jan 20, Feb 3, Feb 17 = 3 occurrences
  assertEquals(result.length, 3);
  assertEquals(result[0].display_date, "2026-01-20");
  assertEquals(result[1].display_date, "2026-02-03");
  assertEquals(result[2].display_date, "2026-02-17");
});

Deno.test("expandEventsForDateRange - recurring event with query range limiting", () => {
  const events = [
    createEvent({
      event_date: "2026-01-20",
      recurrence_data: {
        is_recurring: true,
        pattern: "weekly",
        until_date: "2026-03-01", // Recurrence goes far
      },
    }),
  ];
  // Query range is shorter than recurrence
  const result = expandEventsForDateRange(events, "2026-01-20", "2026-02-01");

  // Weekly within query range: Jan 20, 27 = 2 occurrences
  assertEquals(result.length, 2);
  assertEquals(result[0].display_date, "2026-01-20");
  assertEquals(result[1].display_date, "2026-01-27");
});

Deno.test("expandEventsForDateRange - recurring event starting before query range", () => {
  const events = [
    createEvent({
      event_date: "2026-01-13", // Week before range
      recurrence_data: {
        is_recurring: true,
        pattern: "weekly",
        until_date: "2026-02-10",
      },
    }),
  ];
  const result = expandEventsForDateRange(events, "2026-01-20", "2026-02-10");

  // Occurrences within range: Jan 20, 27, Feb 3, 10 = 4
  assertEquals(result.length, 4);
  assertEquals(result[0].display_date, "2026-01-20");
  assertEquals(result[1].display_date, "2026-01-27");
});

Deno.test("expandEventsForDateRange - mixed events sorted by date", () => {
  const events = [
    createEvent({ id: "single", event_date: "2026-01-25" }),
    createEvent({
      id: "recurring",
      event_date: "2026-01-22",
      recurrence_data: {
        is_recurring: true,
        pattern: "weekly",
        until_date: "2026-02-05",
      },
    }),
    createEvent({
      id: "multi",
      event_date: "2026-01-23",
      schedule_data: { duration_days: 2 },
    }),
  ];
  const result = expandEventsForDateRange(events, "2026-01-20", "2026-02-05");

  // Should be sorted by display_date
  const dates = result.map((e) => e.display_date);
  const sortedDates = [...dates].sort();
  assertEquals(dates, sortedDates);

  // Verify we have all expected events
  const ids = result.map((e) => e.id);
  assertArrayIncludes(ids, ["single", "recurring", "multi"]);
});

Deno.test("expandEventsForDateRange - events sorted by time within same day", () => {
  const events = [
    createEvent({
      id: "afternoon",
      event_date: "2026-01-22",
      schedule_data: { start_time: "14:00" },
    }),
    createEvent({
      id: "morning",
      event_date: "2026-01-22",
      schedule_data: { start_time: "09:00" },
    }),
    createEvent({
      id: "all-day",
      event_date: "2026-01-22",
      schedule_data: { all_day: true },
    }),
  ];
  const result = expandEventsForDateRange(events, "2026-01-20", "2026-01-30");

  assertEquals(result.length, 3);
  // All-day first, then by time
  assertEquals(result[0].id, "all-day");
  assertEquals(result[1].id, "morning");
  assertEquals(result[2].id, "afternoon");
});

// Helper function tests

Deno.test("isMultiDayEvent - returns true for duration > 1", () => {
  const event = createEvent({ schedule_data: { duration_days: 3 } });
  assertEquals(isMultiDayEvent(event), true);
});

Deno.test("isMultiDayEvent - returns false for duration = 1", () => {
  const event = createEvent({ schedule_data: { duration_days: 1 } });
  assertEquals(isMultiDayEvent(event), false);
});

Deno.test("isMultiDayEvent - returns false for no duration", () => {
  const event = createEvent({});
  assertEquals(isMultiDayEvent(event), false);
});

Deno.test("isRecurringEvent - returns true for recurring event", () => {
  const event = createEvent({
    recurrence_data: { is_recurring: true, pattern: "weekly" },
  });
  assertEquals(isRecurringEvent(event), true);
});

Deno.test("isRecurringEvent - returns false for non-recurring event", () => {
  const event = createEvent({});
  assertEquals(isRecurringEvent(event), false);
});

Deno.test("isRecurringEvent - returns false for is_recurring=true but no pattern", () => {
  const event = createEvent({
    recurrence_data: { is_recurring: true },
  });
  assertEquals(isRecurringEvent(event), false);
});

Deno.test("getRecurrenceDescription - weekly", () => {
  const event = createEvent({
    recurrence_data: { is_recurring: true, pattern: "weekly" },
  });
  assertEquals(getRecurrenceDescription(event), "Repeats weekly");
});

Deno.test("getRecurrenceDescription - biweekly with until date", () => {
  const event = createEvent({
    recurrence_data: {
      is_recurring: true,
      pattern: "biweekly",
      until_date: "2026-03-15",
    },
  });
  const desc = getRecurrenceDescription(event);
  assertEquals(desc.includes("Repeats every 2 weeks"), true);
  assertEquals(desc.includes("until"), true);
});

Deno.test("getRecurrenceDescription - non-recurring event", () => {
  const event = createEvent({});
  assertEquals(getRecurrenceDescription(event), "");
});
