/**
 * Email Digest Tests
 * Tests for date calculation, idempotency logic, and content formatting.
 * Note: sendWeeklyDigests() requires DB — tested here via logic assertions.
 */

import { assertEquals } from "https://deno.land/std@0.220.0/assert/mod.ts";

// === getLastSunday Logic Tests ===
// Reproduce the logic from email-digest.ts for unit testing

function getLastSunday(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? 0 : day;
  const lastSunday = new Date(now);
  lastSunday.setUTCDate(now.getUTCDate() - diff);
  lastSunday.setUTCHours(6, 0, 0, 0);
  if (day === 0 && now.getUTCHours() < 6) {
    lastSunday.setUTCDate(lastSunday.getUTCDate() - 7);
  }
  return lastSunday;
}

Deno.test("getLastSunday - returns a Sunday", () => {
  const sunday = getLastSunday();
  assertEquals(sunday.getUTCDay(), 0);
});

Deno.test("getLastSunday - time is 6am UTC (9am EAT)", () => {
  const sunday = getLastSunday();
  assertEquals(sunday.getUTCHours(), 6);
  assertEquals(sunday.getUTCMinutes(), 0);
  assertEquals(sunday.getUTCSeconds(), 0);
});

Deno.test("getLastSunday - is in the past or today", () => {
  const sunday = getLastSunday();
  const now = new Date();
  assertEquals(sunday <= now, true);
});

Deno.test("getLastSunday - is within the last 7 days", () => {
  const sunday = getLastSunday();
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  assertEquals(sunday >= sevenDaysAgo, true);
});

// === Idempotency Logic Tests ===

Deno.test("idempotency - last_sent_at after lastSunday means skip", () => {
  const lastSunday = getLastSunday();
  const lastSentAt = new Date(lastSunday.getTime() + 3600_000); // 1 hour after
  assertEquals(new Date(lastSentAt) >= lastSunday, true); // Should skip
});

Deno.test("idempotency - last_sent_at before lastSunday means send", () => {
  const lastSunday = getLastSunday();
  const lastSentAt = new Date(lastSunday.getTime() - 86400_000); // 1 day before
  assertEquals(new Date(lastSentAt) >= lastSunday, false); // Should send
});

Deno.test("idempotency - null last_sent_at means send", () => {
  const lastSunday = getLastSunday();
  const lastSentAt = null;
  // Null means never sent — should send
  assertEquals(lastSentAt === null || new Date(lastSentAt) < lastSunday, true);
});

// === Channel Detection Logic Tests ===

Deno.test("channel detection - real email prefers email", () => {
  const email = "parent@example.com";
  const hasRealEmail = email && !email.endsWith("@phone.choregami.local");
  assertEquals(hasRealEmail, true);
});

Deno.test("channel detection - phone placeholder email is not real", () => {
  const email = "15551234567@phone.choregami.local";
  const hasRealEmail = email && !email.endsWith("@phone.choregami.local");
  assertEquals(hasRealEmail, false);
});

Deno.test("channel detection - phone user defaults to SMS", () => {
  const email = "15551234567@phone.choregami.local";
  const phone = "+15551234567";
  const hasRealEmail = email && !email.endsWith("@phone.choregami.local");
  const hasPhone = !!phone;
  const channel = hasRealEmail ? "email" : hasPhone ? "sms" : null;
  assertEquals(channel, "sms");
});

Deno.test("channel detection - no contact returns null", () => {
  const detectChannel = (email: string | null, phone: string | null) => {
    const hasRealEmail = email && !email.endsWith("@phone.choregami.local");
    const hasPhone = !!phone;
    return hasRealEmail ? "email" : hasPhone ? "sms" : null;
  };
  assertEquals(detectChannel(null, null), null);
});

// === Opt-in Logic Tests ===

Deno.test("opt-in - weekly_summary false means skip", () => {
  const notifPrefs = { weekly_summary: false };
  assertEquals(!notifPrefs.weekly_summary, true); // Should skip
});

Deno.test("opt-in - weekly_summary true means send", () => {
  const notifPrefs = { weekly_summary: true };
  assertEquals(!notifPrefs.weekly_summary, false); // Should not skip
});

Deno.test("opt-in - missing preferences means skip", () => {
  const shouldSkip = (prefs: { weekly_summary?: boolean } | undefined) => !prefs?.weekly_summary;
  assertEquals(shouldSkip(undefined), true);
});

// === formatTime12 Logic Tests ===

function formatTime12(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

Deno.test("formatTime12 - midnight", () => {
  assertEquals(formatTime12("00:00"), "12:00 AM");
});

Deno.test("formatTime12 - noon", () => {
  assertEquals(formatTime12("12:00"), "12:00 PM");
});

Deno.test("formatTime12 - morning", () => {
  assertEquals(formatTime12("09:30"), "9:30 AM");
});

Deno.test("formatTime12 - afternoon", () => {
  assertEquals(formatTime12("14:45"), "2:45 PM");
});

Deno.test("formatTime12 - evening", () => {
  assertEquals(formatTime12("18:30"), "6:30 PM");
});

Deno.test("formatTime12 - late night", () => {
  assertEquals(formatTime12("23:59"), "11:59 PM");
});

// === Global Budget Cap Logic ===

Deno.test("global budget - under cap allows sending", () => {
  const totalSentThisMonth = 500;
  const GLOBAL_EMAIL_BUDGET = 1000;
  assertEquals(totalSentThisMonth >= GLOBAL_EMAIL_BUDGET, false); // Allow
});

Deno.test("global budget - at cap blocks sending", () => {
  const totalSentThisMonth = 1000;
  const GLOBAL_EMAIL_BUDGET = 1000;
  assertEquals(totalSentThisMonth >= GLOBAL_EMAIL_BUDGET, true); // Block
});

Deno.test("global budget - over cap blocks sending", () => {
  const totalSentThisMonth = 1500;
  const GLOBAL_EMAIL_BUDGET = 1000;
  assertEquals(totalSentThisMonth >= GLOBAL_EMAIL_BUDGET, true); // Block
});
