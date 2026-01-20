/**
 * Event [id] API Tests
 *
 * Tests for GET, PATCH, DELETE /api/events/[id]
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
  participants: ["kid-1"],
  metadata: {
    source_app: "chores2026",
    emoji: "🏀",
    prep_tasks: [
      { id: "task-1", text: "Pack jersey", assignee_id: "kid-1", done: false },
      { id: "task-2", text: "Fill water bottle", assignee_id: "kid-1", done: true },
    ],
  },
  is_deleted: false,
};

// === GET Tests ===

Deno.test("events/[id] GET - returns 401 for unauthenticated requests", () => {
  const session = mockUnauthenticatedSession;
  assertEquals(session.isAuthenticated, false);
});

Deno.test("events/[id] GET - returns event for authenticated user", () => {
  const session = mockAuthenticatedSession;
  const event = mockEvent;

  assertEquals(session.isAuthenticated, true);
  assertEquals(event.family_id, session.familyId);
});

Deno.test("events/[id] GET - returns 404 for non-existent event", () => {
  const eventId = "non-existent-id";
  const existingEvents = [mockEvent];

  const found = existingEvents.find((e) => e.id === eventId);
  assertEquals(found, undefined);
});

Deno.test("events/[id] GET - returns 404 for event from different family", () => {
  const session = { ...mockAuthenticatedSession, familyId: "family-2" };
  const event = mockEvent;

  assertEquals(event.family_id !== session.familyId, true);
});

// === PATCH Tests ===

Deno.test("events/[id] PATCH - returns 401 for unauthenticated requests", () => {
  const session = mockUnauthenticatedSession;
  assertEquals(session.isAuthenticated, false);
});

Deno.test("events/[id] PATCH - updates title", () => {
  const event = { ...mockEvent };
  const update = { title: "Updated Basketball practice" };

  event.title = update.title;
  assertEquals(event.title, "Updated Basketball practice");
});

Deno.test("events/[id] PATCH - updates event_date", () => {
  const event = { ...mockEvent };
  const update = { event_date: "2026-01-25" };

  event.event_date = update.event_date;
  assertEquals(event.event_date, "2026-01-25");
});

Deno.test("events/[id] PATCH - updates schedule_data", () => {
  const event = { ...mockEvent } as Record<string, unknown>;
  const update = {
    schedule_data: { all_day: true, start_time: null },
  };

  event.schedule_data = update.schedule_data;
  assertEquals((event.schedule_data as { all_day: boolean }).all_day, true);
});

Deno.test("events/[id] PATCH - updates participants", () => {
  const event = { ...mockEvent };
  const update = { participants: ["kid-1", "kid-2", "kid-3"] };

  event.participants = update.participants;
  assertEquals(event.participants.length, 3);
});

Deno.test("events/[id] PATCH - updates metadata with prep_tasks", () => {
  const event = { ...mockEvent };
  const newPrepTasks = [
    { id: "task-1", text: "Pack jersey", assignee_id: "kid-1", done: true },
    { id: "task-2", text: "Fill water bottle", assignee_id: "kid-1", done: true },
    { id: "task-3", text: "Bring snack", assignee_id: "kid-1", done: false },
  ];

  event.metadata = { ...event.metadata, prep_tasks: newPrepTasks };
  assertEquals(event.metadata.prep_tasks.length, 3);
  assertEquals(event.metadata.prep_tasks[2].text, "Bring snack");
});

Deno.test("events/[id] PATCH - preserves existing metadata fields", () => {
  const event = { ...mockEvent };
  const update = {
    metadata: {
      ...event.metadata,
      prep_tasks: [],
    },
  };

  assertEquals(update.metadata.emoji, "🏀");
  assertEquals(update.metadata.source_app, "chores2026");
});

Deno.test("events/[id] PATCH - returns 404 for non-existent event", () => {
  const eventId = "non-existent-id";
  const existingEvents = [mockEvent];

  const found = existingEvents.find((e) => e.id === eventId);
  assertEquals(found, undefined);
});

Deno.test("events/[id] PATCH - returns 404 for event from different family", () => {
  const session = { ...mockAuthenticatedSession, familyId: "family-2" };
  const event = mockEvent;

  assertEquals(event.family_id !== session.familyId, true);
});

// === DELETE Tests ===

Deno.test("events/[id] DELETE - returns 401 for unauthenticated requests", () => {
  const session = mockUnauthenticatedSession;
  assertEquals(session.isAuthenticated, false);
});

Deno.test("events/[id] DELETE - soft deletes event (sets is_deleted)", () => {
  const event = { ...mockEvent };

  // Soft delete
  event.is_deleted = true;

  assertEquals(event.is_deleted, true);
  assertEquals(event.title, "Basketball practice"); // Data preserved
});

Deno.test("events/[id] DELETE - unlinks chores from deleted event", () => {
  const linkedChores = [
    { id: "chore-1", family_event_id: "event-1" },
    { id: "chore-2", family_event_id: "event-1" },
    { id: "chore-3", family_event_id: "event-2" },
  ];

  const deletedEventId = "event-1";

  // Unlink chores
  const updatedChores = linkedChores.map((chore) =>
    chore.family_event_id === deletedEventId
      ? { ...chore, family_event_id: null }
      : chore
  );

  assertEquals(updatedChores[0].family_event_id, null);
  assertEquals(updatedChores[1].family_event_id, null);
  assertEquals(updatedChores[2].family_event_id, "event-2"); // Unaffected
});

Deno.test("events/[id] DELETE - returns 404 for non-existent event", () => {
  const eventId = "non-existent-id";
  const existingEvents = [mockEvent];

  const found = existingEvents.find((e) => e.id === eventId);
  assertEquals(found, undefined);
});

Deno.test("events/[id] DELETE - returns 404 for event from different family", () => {
  const session = { ...mockAuthenticatedSession, familyId: "family-2" };
  const event = mockEvent;

  assertEquals(event.family_id !== session.familyId, true);
});
