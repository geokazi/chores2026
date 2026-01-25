/**
 * Insights Service Tests
 * Tests for date math, timezone conversion, streak calculation, and consistency %.
 */

import { assertEquals } from "https://deno.land/std@0.220.0/assert/mod.ts";
import {
  getLocalHour,
  getLocalDate,
  calculateStreak,
  calculateConsistency,
} from "./insights-service.ts";

// ============================================================================
// getLocalHour tests
// ============================================================================

Deno.test("getLocalHour - UTC timezone returns UTC hour", () => {
  const timestamp = "2026-01-24T15:30:00Z";
  assertEquals(getLocalHour(timestamp, "UTC"), 15);
});

Deno.test("getLocalHour - Africa/Nairobi is UTC+3", () => {
  // 15:00 UTC = 18:00 EAT
  const timestamp = "2026-01-24T15:00:00Z";
  assertEquals(getLocalHour(timestamp, "Africa/Nairobi"), 18);
});

Deno.test("getLocalHour - handles midnight edge case correctly", () => {
  // 21:00 UTC = 00:00 next day in Africa/Nairobi (UTC+3)
  const timestamp = "2026-01-24T21:00:00Z";
  assertEquals(getLocalHour(timestamp, "Africa/Nairobi"), 0);
});

Deno.test("getLocalHour - returns 0-23 range (no hour 24)", () => {
  // Test midnight specifically
  const midnight = "2026-01-24T00:00:00Z";
  assertEquals(getLocalHour(midnight, "UTC"), 0);

  // 23:59 should give hour 23
  const lateNight = "2026-01-24T23:59:59Z";
  assertEquals(getLocalHour(lateNight, "UTC"), 23);
});

// ============================================================================
// getLocalDate tests
// ============================================================================

Deno.test("getLocalDate - UTC timezone returns UTC date", () => {
  const timestamp = "2026-01-24T15:30:00Z";
  assertEquals(getLocalDate(timestamp, "UTC"), "2026-01-24");
});

Deno.test("getLocalDate - handles date rollover for Africa/Nairobi", () => {
  // 22:00 UTC on Jan 24 = 01:00 on Jan 25 in Nairobi
  const timestamp = "2026-01-24T22:00:00Z";
  assertEquals(getLocalDate(timestamp, "Africa/Nairobi"), "2026-01-25");
});

Deno.test("getLocalDate - same UTC time gives different dates in different timezones", () => {
  // Late night UTC: still Jan 24 in UTC, but Jan 25 in Nairobi
  const timestamp = "2026-01-24T23:00:00Z";
  assertEquals(getLocalDate(timestamp, "UTC"), "2026-01-24");
  assertEquals(getLocalDate(timestamp, "Africa/Nairobi"), "2026-01-25"); // UTC+3
});

Deno.test("getLocalDate - handles negative UTC offset (US Pacific)", () => {
  // 03:00 UTC on Jan 25 = 19:00 on Jan 24 in Los Angeles (UTC-8)
  const timestamp = "2026-01-25T03:00:00Z";
  assertEquals(getLocalDate(timestamp, "America/Los_Angeles"), "2026-01-24");
});

// ============================================================================
// calculateStreak tests
// ============================================================================

Deno.test("calculateStreak - returns 0 for empty array", () => {
  assertEquals(calculateStreak([]), 0);
});

Deno.test("calculateStreak - returns 0 if no activity today or yesterday", () => {
  // Activity from 3 days ago
  const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString();
  assertEquals(calculateStreak([threeDaysAgo]), 0);
});

Deno.test("calculateStreak - counts consecutive days", () => {
  const today = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86_400_000).toISOString();
  const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString();

  assertEquals(calculateStreak([today]), 1);
  assertEquals(calculateStreak([today, yesterday]), 2);
  assertEquals(calculateStreak([today, yesterday, twoDaysAgo]), 3);
});

Deno.test("calculateStreak - allows 1 gap day (streak recovery)", () => {
  const today = new Date().toISOString();
  // Skip yesterday, but have activity 2 days ago
  const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString();
  const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString();

  // Today + 2 days ago (with 1 gap) should give streak of 2
  assertEquals(calculateStreak([today, twoDaysAgo]), 2);

  // Today + 2 days ago + 3 days ago should give streak of 3
  assertEquals(calculateStreak([today, twoDaysAgo, threeDaysAgo]), 3);
});

Deno.test("calculateStreak - breaks at 2+ gap days", () => {
  const today = new Date().toISOString();
  // Activity today and 4 days ago (3 day gap)
  const fourDaysAgo = new Date(Date.now() - 4 * 86_400_000).toISOString();

  // Should only count today since gap is too large
  assertEquals(calculateStreak([today, fourDaysAgo]), 1);
});

Deno.test("calculateStreak - streak can start from yesterday", () => {
  const yesterday = new Date(Date.now() - 86_400_000).toISOString();
  const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString();

  // No activity today, but yesterday + 2 days ago
  assertEquals(calculateStreak([yesterday, twoDaysAgo]), 2);
});

Deno.test("calculateStreak - handles duplicate timestamps for same day", () => {
  // Use UTC date strings to avoid timezone issues
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  // Create timestamps with guaranteed same UTC date prefix
  const todayMorning = `${todayStr}T08:00:00.000Z`;
  const todayEvening = `${todayStr}T20:00:00.000Z`;
  const yesterday = `${yesterdayStr}T12:00:00.000Z`;

  // Multiple completions on same day should count as 1 day
  assertEquals(calculateStreak([todayMorning, todayEvening, yesterday]), 2);
});

// ============================================================================
// calculateConsistency tests
// ============================================================================

Deno.test("calculateConsistency - returns 0 for empty array", () => {
  assertEquals(calculateConsistency([]), 0);
});

Deno.test("calculateConsistency - calculates based on expected days per week", () => {
  // Create 30 days of activity (100% if expected = 7/week)
  const dates: string[] = [];
  for (let i = 0; i < 30; i++) {
    dates.push(new Date(Date.now() - i * 86_400_000).toISOString());
  }

  // With 7 expected days/week, 30 days in 30 days = 100%
  assertEquals(calculateConsistency(dates, 7), 100);
});

Deno.test("calculateConsistency - adjusts for fewer expected days (Weekend Warrior)", () => {
  // 5 days per week expected = ~21 expected days in 30 days
  // If we have 15 active days, that's ~71%
  const dates: string[] = [];
  for (let i = 0; i < 15; i++) {
    dates.push(new Date(Date.now() - i * 2 * 86_400_000).toISOString()); // Every other day
  }

  const result = calculateConsistency(dates, 5);
  // Expected: Math.round(5 * (30/7)) = 21 expected days
  // 15/21 = 71%
  assertEquals(result, 71);
});

Deno.test("calculateConsistency - caps at 100%", () => {
  // More active days than expected should still cap at 100%
  const dates: string[] = [];
  for (let i = 0; i < 30; i++) {
    dates.push(new Date(Date.now() - i * 86_400_000).toISOString());
  }

  // With 3 expected days/week (~13 in 30 days), 30 active days would be >100%
  // But should cap at 100
  assertEquals(calculateConsistency(dates, 3), 100);
});

Deno.test("calculateConsistency - only counts last 30 days", () => {
  // Activity from 40 days ago shouldn't count
  const oldDates: string[] = [];
  for (let i = 35; i < 50; i++) {
    oldDates.push(new Date(Date.now() - i * 86_400_000).toISOString());
  }

  // All activity is older than 30 days
  assertEquals(calculateConsistency(oldDates, 7), 0);
});

Deno.test("calculateConsistency - deduplicates same-day activity", () => {
  // Use explicit UTC timestamps on the same day to avoid timezone issues
  const todayStr = new Date().toISOString().slice(0, 10);
  const morning = `${todayStr}T08:00:00.000Z`;
  const evening = `${todayStr}T20:00:00.000Z`;

  // Two completions on same day should count as 1 active day
  // With 7/week expected, Math.round(7 * 30/7) = 30 expected days
  // 1/30 * 100 = 3.33% → rounds to 3%
  const result = calculateConsistency([morning, evening], 7);
  assertEquals(result, 3); // 1 day / 30 expected = 3%
});
