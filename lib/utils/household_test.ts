/**
 * Household Utilities Tests
 *
 * Tests for groupChoresByEvent, usePointsMode, formatTime, formatEventDate
 */

import { assertEquals } from "https://deno.land/std@0.220.0/assert/mod.ts";
import {
  groupChoresByEvent,
  usePointsMode,
  formatTime,
  formatEventDate,
  type ChoreAssignment,
  type FamilyEvent,
} from "./household.ts";

// === formatTime Tests ===

Deno.test("formatTime - converts 24-hour to 12-hour format (AM)", () => {
  assertEquals(formatTime("09:30"), "9:30 AM");
  assertEquals(formatTime("00:00"), "12:00 AM");
  assertEquals(formatTime("11:59"), "11:59 AM");
});

Deno.test("formatTime - converts 24-hour to 12-hour format (PM)", () => {
  assertEquals(formatTime("12:00"), "12:00 PM");
  assertEquals(formatTime("13:30"), "1:30 PM");
  assertEquals(formatTime("18:30"), "6:30 PM");
  assertEquals(formatTime("23:59"), "11:59 PM");
});

Deno.test("formatTime - handles noon and midnight", () => {
  assertEquals(formatTime("00:00"), "12:00 AM"); // Midnight
  assertEquals(formatTime("12:00"), "12:00 PM"); // Noon
});

// === usePointsMode Tests ===

Deno.test("usePointsMode - returns true when chores have points", () => {
  const chores: ChoreAssignment[] = [
    { id: "1", status: "pending", point_value: 5 },
    { id: "2", status: "pending", point_value: 10 },
  ];
  assertEquals(usePointsMode(chores), true);
});

Deno.test("usePointsMode - returns false when all chores have 0 points", () => {
  const chores: ChoreAssignment[] = [
    { id: "1", status: "pending", point_value: 0 },
    { id: "2", status: "pending", point_value: 0 },
  ];
  assertEquals(usePointsMode(chores), false);
});

Deno.test("usePointsMode - returns true if any chore has points", () => {
  const chores: ChoreAssignment[] = [
    { id: "1", status: "pending", point_value: 0 },
    { id: "2", status: "pending", point_value: 5 },
    { id: "3", status: "pending", point_value: 0 },
  ];
  assertEquals(usePointsMode(chores), true);
});

Deno.test("usePointsMode - returns false for empty array", () => {
  const chores: ChoreAssignment[] = [];
  assertEquals(usePointsMode(chores), false);
});

// === groupChoresByEvent Tests ===

const mockEvent1: FamilyEvent = {
  id: "event-1",
  title: "Basketball practice",
  event_date: "2026-01-20",
  metadata: { emoji: "🏀" },
};

const mockEvent2: FamilyEvent = {
  id: "event-2",
  title: "Piano lesson",
  event_date: "2026-01-21",
  metadata: { emoji: "🎹" },
};

Deno.test("groupChoresByEvent - groups chores by event", () => {
  const chores: ChoreAssignment[] = [
    {
      id: "chore-1",
      status: "pending",
      point_value: 0,
      family_event_id: "event-1",
      family_event: mockEvent1,
    },
    {
      id: "chore-2",
      status: "pending",
      point_value: 0,
      family_event_id: "event-1",
      family_event: mockEvent1,
    },
  ];

  const result = groupChoresByEvent(chores);

  assertEquals(result.events.length, 1);
  assertEquals(result.events[0].event.id, "event-1");
  assertEquals(result.events[0].chores.length, 2);
  assertEquals(result.unlinked.length, 0);
});

Deno.test("groupChoresByEvent - separates unlinked chores", () => {
  const chores: ChoreAssignment[] = [
    {
      id: "chore-1",
      status: "pending",
      point_value: 5,
      family_event_id: null,
      family_event: null,
    },
    {
      id: "chore-2",
      status: "pending",
      point_value: 10,
      family_event_id: undefined,
    },
  ];

  const result = groupChoresByEvent(chores);

  assertEquals(result.events.length, 0);
  assertEquals(result.unlinked.length, 2);
});

Deno.test("groupChoresByEvent - handles mixed linked and unlinked", () => {
  const chores: ChoreAssignment[] = [
    {
      id: "chore-1",
      status: "pending",
      point_value: 0,
      family_event_id: "event-1",
      family_event: mockEvent1,
    },
    {
      id: "chore-2",
      status: "pending",
      point_value: 5,
      family_event_id: null,
    },
    {
      id: "chore-3",
      status: "pending",
      point_value: 0,
      family_event_id: "event-2",
      family_event: mockEvent2,
    },
  ];

  const result = groupChoresByEvent(chores);

  assertEquals(result.events.length, 2);
  assertEquals(result.unlinked.length, 1);
});

Deno.test("groupChoresByEvent - sorts events by date", () => {
  const laterEvent: FamilyEvent = {
    id: "event-3",
    title: "Soccer game",
    event_date: "2026-01-25",
  };

  const chores: ChoreAssignment[] = [
    {
      id: "chore-1",
      status: "pending",
      point_value: 0,
      family_event_id: "event-3",
      family_event: laterEvent,
    },
    {
      id: "chore-2",
      status: "pending",
      point_value: 0,
      family_event_id: "event-1",
      family_event: mockEvent1,
    },
  ];

  const result = groupChoresByEvent(chores);

  assertEquals(result.events.length, 2);
  assertEquals(result.events[0].event.event_date, "2026-01-20"); // Earlier date first
  assertEquals(result.events[1].event.event_date, "2026-01-25");
});

Deno.test("groupChoresByEvent - handles empty array", () => {
  const result = groupChoresByEvent([]);

  assertEquals(result.events.length, 0);
  assertEquals(result.unlinked.length, 0);
});

Deno.test("groupChoresByEvent - requires both family_event_id and family_event", () => {
  const chores: ChoreAssignment[] = [
    {
      id: "chore-1",
      status: "pending",
      point_value: 0,
      family_event_id: "event-1",
      // family_event is missing - should go to unlinked
    },
  ];

  const result = groupChoresByEvent(chores);

  assertEquals(result.events.length, 0);
  assertEquals(result.unlinked.length, 1);
});

// === formatEventDate Tests ===

Deno.test("formatEventDate - formats time correctly", () => {
  const event: FamilyEvent = {
    id: "event-1",
    title: "Test",
    event_date: "2026-06-15", // Far future date to avoid Today/Tomorrow
    schedule_data: { start_time: "18:30", all_day: false },
  };

  const result = formatEventDate(event);
  assertEquals(result.includes("6:30 PM"), true);
});

Deno.test("formatEventDate - formats all-day events", () => {
  const event: FamilyEvent = {
    id: "event-1",
    title: "Test",
    event_date: "2026-06-15",
    schedule_data: { all_day: true },
  };

  const result = formatEventDate(event);
  assertEquals(result.includes("(All day)"), true);
});

Deno.test("formatEventDate - handles events without time", () => {
  const event: FamilyEvent = {
    id: "event-1",
    title: "Test",
    event_date: "2026-06-15",
    // No schedule_data
  };

  const result = formatEventDate(event);
  // Should just show the date without time
  assertEquals(result.includes("PM"), false);
  assertEquals(result.includes("AM"), false);
  assertEquals(result.includes("(All day)"), false);
});

// Note: Today/Tomorrow tests are date-sensitive and would need mocking
// These tests verify the core formatting logic works correctly
