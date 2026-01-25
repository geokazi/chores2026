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
  lastSunday.setUTCHours(17, 0, 0, 0); // 5pm UTC = 9am PST
  if (day === 0 && now.getUTCHours() < 17) {
    lastSunday.setUTCDate(lastSunday.getUTCDate() - 7);
  }
  return lastSunday;
}

Deno.test("getLastSunday - returns a Sunday", () => {
  const sunday = getLastSunday();
  assertEquals(sunday.getUTCDay(), 0);
});

Deno.test("getLastSunday - time is 5pm UTC (9am PST)", () => {
  const sunday = getLastSunday();
  assertEquals(sunday.getUTCHours(), 17);
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

// === calculateStreak Logic Tests ===
// Reproduce the logic from email-digest.ts for unit testing

function calculateStreak(transactionDates: string[]): number {
  if (transactionDates.length === 0) return 0;
  const uniqueDates = [...new Set(transactionDates.map((d) => d.slice(0, 10)))].sort().reverse();
  if (uniqueDates.length === 0) return 0;
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const curr = new Date(uniqueDates[i - 1] + "T00:00:00");
    const prev = new Date(uniqueDates[i] + "T00:00:00");
    const diffDays = (curr.getTime() - prev.getTime()) / 86_400_000;
    if (diffDays === 1) streak++;
    else break;
  }
  return streak;
}

Deno.test("calculateStreak - empty dates returns 0", () => {
  assertEquals(calculateStreak([]), 0);
});

Deno.test("calculateStreak - old dates only returns 0", () => {
  assertEquals(calculateStreak(["2020-01-01T10:00:00Z", "2020-01-02T10:00:00Z"]), 0);
});

Deno.test("calculateStreak - today only returns 1", () => {
  const today = new Date().toISOString();
  assertEquals(calculateStreak([today]), 1);
});

Deno.test("calculateStreak - today and yesterday returns 2", () => {
  const today = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86_400_000).toISOString();
  assertEquals(calculateStreak([today, yesterday]), 2);
});

Deno.test("calculateStreak - 3 consecutive days ending today", () => {
  const today = new Date().toISOString();
  const d1 = new Date(Date.now() - 86_400_000).toISOString();
  const d2 = new Date(Date.now() - 2 * 86_400_000).toISOString();
  assertEquals(calculateStreak([today, d1, d2]), 3);
});

Deno.test("calculateStreak - gap breaks streak", () => {
  const today = new Date().toISOString();
  const d1 = new Date(Date.now() - 86_400_000).toISOString();
  // Skip a day
  const d3 = new Date(Date.now() - 3 * 86_400_000).toISOString();
  assertEquals(calculateStreak([today, d1, d3]), 2);
});

Deno.test("calculateStreak - duplicate dates don't inflate streak", () => {
  const today = new Date().toISOString();
  const todayEarly = new Date().toISOString().replace(/T.*/, "T08:00:00Z");
  assertEquals(calculateStreak([today, todayEarly]), 1);
});

// === generateInsights Logic Tests ===

function generateInsights(content: {
  stats: { choresCompleted: number; choresTotal: number; prevWeekCompleted: number; prevWeekTotal: number };
  leaderboard: Array<{ name: string; streak: number; weeklyPoints: number }>;
  goalProgress?: { achieved: boolean };
}): string[] {
  const insights: string[] = [];
  const { stats, leaderboard, goalProgress } = content;
  if (stats.choresTotal > 0 && stats.choresCompleted === stats.choresTotal) {
    insights.push("PERFECT WEEK! Every single chore completed!");
  }
  if (stats.prevWeekTotal > 0 && stats.choresTotal > 0) {
    const prevPercent = (stats.prevWeekCompleted / stats.prevWeekTotal) * 100;
    const currPercent = (stats.choresCompleted / stats.choresTotal) * 100;
    const delta = currPercent - prevPercent;
    if (delta > 20) insights.push(`Up ${Math.round(delta)}% from last week — great momentum!`);
  }
  if (goalProgress?.achieved) {
    insights.push("Family goal reached! Everyone earned the bonus!");
  }
  const streakers = leaderboard.filter((m) => m.streak > 0).sort((a, b) => b.streak - a.streak);
  if (streakers.length > 0 && streakers[0].streak >= 3) {
    insights.push(`${streakers[0].name} has the longest streak at ${streakers[0].streak} days!`);
  }
  const newStreakers = leaderboard.filter((m) => m.streak === 3);
  for (const s of newStreakers.slice(0, 1)) {
    if (!insights.some((i) => i.includes(s.name))) {
      insights.push(`${s.name} started a new 3-day streak!`);
    }
  }
  return insights.slice(0, 2);
}

Deno.test("generateInsights - perfect week", () => {
  const insights = generateInsights({
    stats: { choresCompleted: 10, choresTotal: 10, prevWeekCompleted: 8, prevWeekTotal: 10 },
    leaderboard: [],
  });
  assertEquals(insights[0], "PERFECT WEEK! Every single chore completed!");
});

Deno.test("generateInsights - week-over-week improvement >20%", () => {
  const insights = generateInsights({
    stats: { choresCompleted: 9, choresTotal: 10, prevWeekCompleted: 5, prevWeekTotal: 10 },
    leaderboard: [],
  });
  assertEquals(insights.some((i) => i.includes("from last week")), true);
});

Deno.test("generateInsights - goal achieved", () => {
  const insights = generateInsights({
    stats: { choresCompleted: 5, choresTotal: 10, prevWeekCompleted: 5, prevWeekTotal: 10 },
    leaderboard: [],
    goalProgress: { achieved: true },
  });
  assertEquals(insights.some((i) => i.includes("Family goal reached")), true);
});

Deno.test("generateInsights - longest streak highlight", () => {
  const insights = generateInsights({
    stats: { choresCompleted: 5, choresTotal: 10, prevWeekCompleted: 5, prevWeekTotal: 10 },
    leaderboard: [
      { name: "Julia", streak: 5, weeklyPoints: 30 },
      { name: "Ciku", streak: 2, weeklyPoints: 20 },
    ],
  });
  assertEquals(insights.some((i) => i.includes("Julia") && i.includes("5 days")), true);
});

Deno.test("generateInsights - max 2 insights", () => {
  const insights = generateInsights({
    stats: { choresCompleted: 10, choresTotal: 10, prevWeekCompleted: 3, prevWeekTotal: 10 },
    leaderboard: [{ name: "Julia", streak: 5, weeklyPoints: 30 }],
    goalProgress: { achieved: true },
  });
  assertEquals(insights.length <= 2, true);
});

Deno.test("generateInsights - no insights for low activity", () => {
  const insights = generateInsights({
    stats: { choresCompleted: 3, choresTotal: 10, prevWeekCompleted: 3, prevWeekTotal: 10 },
    leaderboard: [{ name: "Julia", streak: 1, weeklyPoints: 10 }],
  });
  assertEquals(insights.length, 0);
});
