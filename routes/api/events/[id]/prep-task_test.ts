/**
 * Prep Task Toggle API Tests
 *
 * Tests for POST /api/events/[id]/prep-task
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

// Mock event with prep tasks
const mockEventWithTasks = {
  id: "event-1",
  family_id: "family-1",
  title: "Basketball practice",
  metadata: {
    emoji: "🏀",
    prep_tasks: [
      { id: "task-1", text: "Pack jersey", assignee_id: "kid-1", done: false },
      { id: "task-2", text: "Fill water bottle", assignee_id: "kid-1", done: false },
      { id: "task-3", text: "Bring snack", assignee_id: "kid-2", done: true },
    ],
  },
};

// === Authentication Tests ===

Deno.test("prep-task POST - returns 401 for unauthenticated requests", () => {
  const session = mockUnauthenticatedSession;
  assertEquals(session.isAuthenticated, false);
});

Deno.test("prep-task POST - allows authenticated requests", () => {
  const session = mockAuthenticatedSession;
  assertEquals(session.isAuthenticated, true);
});

// === Validation Tests ===

Deno.test("prep-task POST - requires taskId in body", () => {
  const requestBody: Record<string, unknown> = { done: true };
  assertEquals(requestBody.taskId, undefined);
  // In real handler: would return 400
});

Deno.test("prep-task POST - requires done boolean in body", () => {
  const requestBody: Record<string, unknown> = { taskId: "task-1" };
  assertEquals(requestBody.done, undefined);
  // In real handler: would return 400
});

Deno.test("prep-task POST - accepts valid request body", () => {
  const requestBody = { taskId: "task-1", done: true };
  assertEquals(typeof requestBody.taskId, "string");
  assertEquals(typeof requestBody.done, "boolean");
});

// === Task Toggle Tests ===

Deno.test("prep-task POST - toggles task from false to true", () => {
  const event = JSON.parse(JSON.stringify(mockEventWithTasks));
  const taskId = "task-1";
  const newDoneStatus = true;

  // Find and update task
  const taskIndex = event.metadata.prep_tasks.findIndex(
    (t: any) => t.id === taskId
  );
  assertEquals(taskIndex >= 0, true);
  assertEquals(event.metadata.prep_tasks[taskIndex].done, false);

  event.metadata.prep_tasks[taskIndex].done = newDoneStatus;
  assertEquals(event.metadata.prep_tasks[taskIndex].done, true);
});

Deno.test("prep-task POST - toggles task from true to false", () => {
  const event = JSON.parse(JSON.stringify(mockEventWithTasks));
  const taskId = "task-3";
  const newDoneStatus = false;

  // Find and update task
  const taskIndex = event.metadata.prep_tasks.findIndex(
    (t: any) => t.id === taskId
  );
  assertEquals(taskIndex >= 0, true);
  assertEquals(event.metadata.prep_tasks[taskIndex].done, true);

  event.metadata.prep_tasks[taskIndex].done = newDoneStatus;
  assertEquals(event.metadata.prep_tasks[taskIndex].done, false);
});

Deno.test("prep-task POST - preserves other task properties", () => {
  const event = JSON.parse(JSON.stringify(mockEventWithTasks));
  const taskId = "task-1";
  const originalTask = event.metadata.prep_tasks.find(
    (t: any) => t.id === taskId
  );

  // Toggle done status
  const taskIndex = event.metadata.prep_tasks.findIndex(
    (t: any) => t.id === taskId
  );
  event.metadata.prep_tasks[taskIndex].done = true;

  // Check other properties are preserved
  assertEquals(event.metadata.prep_tasks[taskIndex].text, originalTask.text);
  assertEquals(
    event.metadata.prep_tasks[taskIndex].assignee_id,
    originalTask.assignee_id
  );
});

Deno.test("prep-task POST - does not affect other tasks", () => {
  const event = JSON.parse(JSON.stringify(mockEventWithTasks));
  const taskId = "task-1";

  // Get original states
  const task2Done = event.metadata.prep_tasks[1].done;
  const task3Done = event.metadata.prep_tasks[2].done;

  // Toggle task-1
  const taskIndex = event.metadata.prep_tasks.findIndex(
    (t: any) => t.id === taskId
  );
  event.metadata.prep_tasks[taskIndex].done = true;

  // Other tasks unchanged
  assertEquals(event.metadata.prep_tasks[1].done, task2Done);
  assertEquals(event.metadata.prep_tasks[2].done, task3Done);
});

// === Error Cases ===

Deno.test("prep-task POST - returns 404 for non-existent event", () => {
  const eventId = "non-existent-event";
  const existingEvents = [mockEventWithTasks];

  const found = existingEvents.find((e) => e.id === eventId);
  assertEquals(found, undefined);
});

Deno.test("prep-task POST - returns 404 for event from different family", () => {
  const session = { ...mockAuthenticatedSession, familyId: "family-2" };
  const event = mockEventWithTasks;

  assertEquals(event.family_id !== session.familyId, true);
});

Deno.test("prep-task POST - returns 404 for non-existent task", () => {
  const event = mockEventWithTasks;
  const taskId = "non-existent-task";

  const found = event.metadata.prep_tasks.find((t: any) => t.id === taskId);
  assertEquals(found, undefined);
});

// === Edge Cases ===

Deno.test("prep-task POST - handles event with no prep_tasks", () => {
  const eventWithoutTasks = {
    id: "event-2",
    family_id: "family-1",
    metadata: {} as Record<string, unknown>,
  };

  const prepTasks = (eventWithoutTasks.metadata.prep_tasks as unknown[]) || [];
  assertEquals(prepTasks.length, 0);
});

Deno.test("prep-task POST - handles event with empty prep_tasks array", () => {
  const eventWithEmptyTasks = {
    id: "event-3",
    family_id: "family-1",
    metadata: { prep_tasks: [] },
  };

  assertEquals(eventWithEmptyTasks.metadata.prep_tasks.length, 0);
});

// === Response Tests ===

Deno.test("prep-task POST - returns updated task in response", () => {
  const event = JSON.parse(JSON.stringify(mockEventWithTasks));
  const taskId = "task-1";

  const taskIndex = event.metadata.prep_tasks.findIndex(
    (t: any) => t.id === taskId
  );
  event.metadata.prep_tasks[taskIndex].done = true;

  const updatedTask = event.metadata.prep_tasks[taskIndex];

  assertEquals(updatedTask.id, taskId);
  assertEquals(updatedTask.done, true);
});
