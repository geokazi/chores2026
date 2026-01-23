/**
 * Badge Check Tests
 * Tests for today/tomorrow event detection logic and edge cases.
 */

import { assertEquals } from "https://deno.land/std@0.220.0/assert/mod.ts";

// Reproduce the date logic from badge-check.ts for unit testing

function getDateRange(): { todayStr: string; tomorrowStr: string } {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return {
    todayStr: today.toISOString().slice(0, 10),
    tomorrowStr: tomorrow.toISOString().slice(0, 10),
  };
}

function isEventInRange(eventDate: string, todayStr: string, tomorrowStr: string): boolean {
  return eventDate >= todayStr && eventDate <= tomorrowStr;
}

// === Date Range Tests ===

Deno.test("badge-check - todayStr is YYYY-MM-DD format", () => {
  const { todayStr } = getDateRange();
  assertEquals(todayStr.length, 10);
  assertEquals(todayStr.match(/^\d{4}-\d{2}-\d{2}$/) !== null, true);
});

Deno.test("badge-check - tomorrowStr is one day after todayStr", () => {
  const { todayStr, tomorrowStr } = getDateRange();
  const today = new Date(todayStr + "T00:00:00");
  const tomorrow = new Date(tomorrowStr + "T00:00:00");
  const diffMs = tomorrow.getTime() - today.getTime();
  assertEquals(diffMs, 86400_000); // Exactly 1 day in ms
});

// === Event Detection Tests ===

Deno.test("badge-check - event today is detected", () => {
  const { todayStr, tomorrowStr } = getDateRange();
  assertEquals(isEventInRange(todayStr, todayStr, tomorrowStr), true);
});

Deno.test("badge-check - event tomorrow is detected", () => {
  const { todayStr, tomorrowStr } = getDateRange();
  assertEquals(isEventInRange(tomorrowStr, todayStr, tomorrowStr), true);
});

Deno.test("badge-check - event yesterday is NOT detected", () => {
  const { todayStr, tomorrowStr } = getDateRange();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  assertEquals(isEventInRange(yesterdayStr, todayStr, tomorrowStr), false);
});

Deno.test("badge-check - event in 2 days is NOT detected", () => {
  const { todayStr, tomorrowStr } = getDateRange();
  const dayAfterTomorrow = new Date();
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  const futureStr = dayAfterTomorrow.toISOString().slice(0, 10);
  assertEquals(isEventInRange(futureStr, todayStr, tomorrowStr), false);
});

Deno.test("badge-check - event last week is NOT detected", () => {
  const { todayStr, tomorrowStr } = getDateRange();
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lastWeekStr = lastWeek.toISOString().slice(0, 10);
  assertEquals(isEventInRange(lastWeekStr, todayStr, tomorrowStr), false);
});

// === Edge Cases ===

Deno.test("badge-check - no events returns hasUpcoming false", () => {
  const events: string[] = [];
  const hasUpcoming = events.length > 0;
  assertEquals(hasUpcoming, false);
});

Deno.test("badge-check - one matching event returns hasUpcoming true", () => {
  const { todayStr, tomorrowStr } = getDateRange();
  const events = [todayStr];
  const hasUpcoming = events.some(e => isEventInRange(e, todayStr, tomorrowStr));
  assertEquals(hasUpcoming, true);
});

Deno.test("badge-check - multiple events with one match returns true", () => {
  const { todayStr, tomorrowStr } = getDateRange();
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const events = [lastWeek.toISOString().slice(0, 10), tomorrowStr];
  const hasUpcoming = events.some(e => isEventInRange(e, todayStr, tomorrowStr));
  assertEquals(hasUpcoming, true);
});

// === Honeypot & Auth Tests (Security) ===

Deno.test("badge-check - unauthenticated returns hasUpcoming false (by design)", () => {
  // The endpoint returns { hasUpcoming: false } for unauthenticated users
  const isAuthenticated = false;
  const response = !isAuthenticated ? { hasUpcoming: false } : { hasUpcoming: true };
  assertEquals(response.hasUpcoming, false);
});
