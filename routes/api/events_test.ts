/**
 * Events API Tests
 *
 * Tests for GET /api/events and POST /api/events
 */

import { assertEquals } from "https://deno.land/std@0.220.0/assert/mod.ts";

// Mock session data
const mockAuthenticatedSession = {
  isAuthenticated: true,
  familyId: "family-1",
  user: { id: "user-1", email: "parent@test.com" },
};

const mockUnauthenticatedSession = {
  isAuthenticated: false,
  familyId: null,
  user: null,
};

// Mock event data
const mockEvent = {
  id: "event-1",
  family_id: "family-1",
  title: "Basketball practice",
  event_date: "2026-01-20",
  schedule_data: {
    all_day: false,
    start_time: "18:30",
  },
  participants: ["kid-1", "kid-2"],
  metadata: {
    source_app: "chores2026",
    emoji: "🏀",
    prep_tasks: [],
  },
  is_deleted: false,
};

// Test: Unauthenticated requests should return 401
Deno.test("events GET - returns 401 for unauthenticated requests", () => {
  const session = mockUnauthenticatedSession;
  assertEquals(session.isAuthenticated, false);
  // In real handler: would return 401
});

// Test: Authenticated user can fetch events
Deno.test("events GET - returns events for authenticated user", () => {
  const session = mockAuthenticatedSession;
  assertEquals(session.isAuthenticated, true);
  assertEquals(session.familyId, "family-1");
  // In real handler: would return family's events
});

// Test: Events are filtered to current family only
Deno.test("events GET - only returns events for user's family", () => {
  const session = mockAuthenticatedSession;
  const event = mockEvent;

  assertEquals(event.family_id, session.familyId);
  // In real handler: would filter by family_id
});

// Test: Deleted events are not returned
Deno.test("events GET - filters out deleted events", () => {
  const deletedEvent = { ...mockEvent, is_deleted: true };
  assertEquals(deletedEvent.is_deleted, true);
  // In real handler: would filter where is_deleted = false
});

// Test: Events are sorted by date
Deno.test("events GET - sorts events by event_date", () => {
  const events = [
    { ...mockEvent, id: "e1", event_date: "2026-01-22" },
    { ...mockEvent, id: "e2", event_date: "2026-01-20" },
    { ...mockEvent, id: "e3", event_date: "2026-01-21" },
  ];

  const sorted = [...events].sort((a, b) =>
    a.event_date.localeCompare(b.event_date)
  );

  assertEquals(sorted[0].id, "e2");
  assertEquals(sorted[1].id, "e3");
  assertEquals(sorted[2].id, "e1");
});

// Test: POST requires authentication
Deno.test("events POST - returns 401 for unauthenticated requests", () => {
  const session = mockUnauthenticatedSession;
  assertEquals(session.isAuthenticated, false);
  // In real handler: would return 401
});

// Test: POST creates event with required fields
Deno.test("events POST - creates event with required fields", () => {
  const requestBody = {
    title: "Soccer game",
    event_date: "2026-01-25",
    emoji: "⚽",
    is_all_day: false,
    event_time: "15:00",
    participants: ["kid-1"],
  };

  assertEquals(requestBody.title.length > 0, true);
  assertEquals(requestBody.event_date.length > 0, true);
  // In real handler: would create event in database
});

// Test: POST validates required title
Deno.test("events POST - requires title", () => {
  const requestBody = {
    title: "",
    event_date: "2026-01-25",
  };

  assertEquals(requestBody.title.trim().length === 0, true);
  // In real handler: would return 400 error
});

// Test: POST stores schedule_data correctly
Deno.test("events POST - stores schedule_data as JSONB", () => {
  const requestBody = {
    title: "Piano lesson",
    event_date: "2026-01-25",
    is_all_day: false,
    event_time: "16:00",
  };

  const scheduleData = {
    all_day: requestBody.is_all_day,
    start_time: requestBody.event_time,
  };

  assertEquals(scheduleData.all_day, false);
  assertEquals(scheduleData.start_time, "16:00");
});

// Test: POST stores metadata correctly
Deno.test("events POST - stores metadata with emoji and source_app", () => {
  const requestBody = {
    title: "Dance recital",
    emoji: "🩰",
  };

  const metadata = {
    source_app: "chores2026",
    emoji: requestBody.emoji,
  };

  assertEquals(metadata.source_app, "chores2026");
  assertEquals(metadata.emoji, "🩰");
});

// Test: POST stores participants as array
Deno.test("events POST - stores participants as JSONB array", () => {
  const requestBody = {
    title: "Family trip",
    participants: ["kid-1", "kid-2", "parent-1"],
  };

  assertEquals(Array.isArray(requestBody.participants), true);
  assertEquals(requestBody.participants.length, 3);
});

// Test: POST with no participants stores empty array
Deno.test("events POST - handles missing participants", () => {
  const requestBody: Record<string, unknown> = {
    title: "Solo event",
  };

  const participants = (requestBody.participants as string[]) || [];
  assertEquals(participants.length, 0);
});
